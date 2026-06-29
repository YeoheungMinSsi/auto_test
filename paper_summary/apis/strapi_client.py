import os
import requests
from dotenv import load_dotenv
from typing import Dict, Any, List, Optional
from datetime import datetime

# .env 환경 변수 로드
base_dir = os.path.dirname(os.path.abspath(__file__))
root_env = os.path.join(base_dir, "..", "..", ".env")
if os.path.exists(root_env):
    load_dotenv(root_env)
else:
    load_dotenv()

class StrapiClient:
    def __init__(self):
        self.api_url = os.getenv("STRAPI_API_URL", "http://localhost:1337").rstrip("/")
        self.token = os.getenv("STRAPI_API_TOKEN")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
    def _get_field(self, item: Dict[str, Any], field_name: str) -> Any:
        """Strapi v4/v5 응답 구조 호환성을 위해 필드 값을 안전하게 추출합니다."""
        if field_name in item:
            return item[field_name]
        # v4 attributes 구조 대응
        attributes = item.get("attributes", {})
        return attributes.get(field_name)

    def create_paper(self, paper_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        새로운 논문 정보를 Strapi DB에 생성(저장)합니다.
        """
        if not self.token:
            print("[StrapiClient] Warning: API Token is missing. Cannot save to Strapi.")
            return None

        url = f"{self.api_url}/api/papers"
        
        # Strapi v4/v5 규격에 맞게 data로 감싸서 요청
        payload = {
            "data": {
                "title": paper_data.get("title"),
                "authors": paper_data.get("authors", ""),
                "summary": paper_data.get("summary", ""),
                "pdf_path": paper_data.get("pdf_path"),
                "source_url": paper_data.get("source_url") or paper_data.get("url", ""),
                "category": paper_data.get("category", ""),
                "doi": paper_data.get("doi"),
                "published_year": paper_data.get("published_year")
            }
        }

        try:
            response = requests.post(url, json=payload, headers=self.headers)
            if response.status_code in [200, 201]:
                res_json = response.json()
                print(f"[StrapiClient] Successfully saved paper to DB: {paper_data.get('title')[:30]}...")
                return res_json.get("data")
            else:
                print(f"[StrapiClient] Error creating paper ({response.status_code}): {response.text}")
                return None
        except Exception as e:
            print(f"[StrapiClient] Connection error during create_paper: {e}")
            return None

    def get_papers(self, category: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Strapi DB로부터 논문 목록을 가져옵니다. 카테고리 필터링이 가능합니다.
        """
        if not self.token:
            print("[StrapiClient] Warning: API Token is missing.")
            return []

        url = f"{self.api_url}/api/papers"
        
        # 기본 쿼리 파라미터 (최대 개수 및 정렬 기준 설정)
        params = {
            "pagination[limit]": limit,
            "sort": "createdAt:desc"
        }
        
        if category:
            params["filters[category][$eq]"] = category

        try:
            response = requests.get(url, headers=self.headers, params=params)
            if response.status_code == 200:
                data = response.json().get("data", [])
                
                # 가독성과 사용 편의성을 위해 플랫한 형태로 리스트 변환
                flat_papers = []
                for item in data:
                    flat_item = {
                        "id": item.get("id"),
                        "documentId": item.get("documentId"),
                        "title": self._get_field(item, "title"),
                        "authors": self._get_field(item, "authors"),
                        "summary": self._get_field(item, "summary"),
                        "pdf_path": self._get_field(item, "pdf_path"),
                        "source_url": self._get_field(item, "source_url"),
                        "category": self._get_field(item, "category"),
                        "doi": self._get_field(item, "doi"),
                        "published_year": self._get_field(item, "published_year"),
                        "createdAt": self._get_field(item, "createdAt")
                    }
                    flat_papers.append(flat_item)
                return flat_papers
            else:
                print(f"[StrapiClient] Error getting papers ({response.status_code}): {response.text}")
                return []
        except Exception as e:
            print(f"[StrapiClient] Connection error during get_papers: {e}")
            return []

    def check_duplicate(self, title: str, doi: Optional[str] = None) -> bool:
        """
        제목이나 DOI를 기준으로 Strapi DB에 이미 저장된 논문인지 검사합니다.
        """
        if not self.token:
            return False

        url = f"{self.api_url}/api/papers"
        
        # 1. DOI 검사
        if doi:
            params = {"filters[doi][$eq]": doi}
            try:
                response = requests.get(url, headers=self.headers, params=params)
                if response.status_code == 200 and len(response.json().get("data", [])) > 0:
                    return True
            except Exception as e:
                print(f"[StrapiClient] Connection error checking DOI: {e}")

        # 2. 제목 검사
        params = {"filters[title][$eq]": title}
        try:
            response = requests.get(url, headers=self.headers, params=params)
            if response.status_code == 200 and len(response.json().get("data", [])) > 0:
                return True
        except Exception as e:
            print(f"[StrapiClient] Connection error checking title: {e}")

        return False

    def update_paper_summary(self, document_id: str, summary_text: str) -> bool:
        """
        지정된 논문(documentId)의 AI 요약(summary) 텍스트를 업데이트합니다.
        """
        if not self.token:
            return False

        url = f"{self.api_url}/api/papers/{document_id}"
        payload = {
            "data": {
                "summary": summary_text
            }
        }

        try:
            response = requests.put(url, json=payload, headers=self.headers)
            if response.status_code in [200, 204]:
                return True
            else:
                print(f"[StrapiClient] Error updating summary ({response.status_code}): {response.text}")
                return False
        except Exception as e:
            print(f"[StrapiClient] Connection error during update_paper_summary: {e}")
            return False

    def update_summary_by_title(self, title: str, summary_text: str) -> bool:
        """
        논문 제목을 기준으로 Strapi DB에서 문서를 찾아 AI 요약 정보를 갱신합니다.
        """
        if not self.token:
            return False

        url = f"{self.api_url}/api/papers"
        params = {"filters[title][$eq]": title}

        try:
            response = requests.get(url, headers=self.headers, params=params)
            if response.status_code == 200:
                results = response.json().get("data", [])
                if results:
                    paper = results[0]
                    doc_id = paper.get("documentId") or paper.get("attributes", {}).get("documentId")
                    if not doc_id:
                        doc_id = paper.get("id")
                    
                    if doc_id:
                        return self.update_paper_summary(str(doc_id), summary_text)
                    
            print(f"[StrapiClient] No paper found in DB with title: {title}")
            return False
        except Exception as e:
            print(f"[StrapiClient] Connection error during update_summary_by_title: {e}")
            return False

    def create_blog_post(self, blog_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        새로운 블로그 포스트를 Strapi DB에 생성(저장)합니다.
        """
        if not self.token:
            print("[StrapiClient] Warning: API Token is missing. Cannot save blog post.")
            return None

        url = f"{self.api_url}/api/blogs"
        payload = {
            "data": {
                "title": blog_data.get("title"),
                "content": blog_data.get("content", ""),
                "category": blog_data.get("category", "General"),
                "author": blog_data.get("author", "User"),
                "publishedAt": datetime.now().isoformat()
            }
        }

        try:
            response = requests.post(url, json=payload, headers=self.headers)
            if response.status_code in [200, 201]:
                res_json = response.json()
                print(f"[StrapiClient] Successfully saved blog post: {blog_data.get('title')[:30]}...")
                return res_json.get("data")
            else:
                print(f"[StrapiClient] Error creating blog post ({response.status_code}): {response.text}")
                return None
        except Exception as e:
            print(f"[StrapiClient] Connection error during create_blog_post: {e}")
            return None

    def get_blog_posts(self, category: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Strapi DB로부터 블로그 포스트 목록을 가져옵니다.
        """
        if not self.token:
            print("[StrapiClient] Warning: API Token is missing.")
            return []

        url = f"{self.api_url}/api/blogs"
        params = {
            "pagination[limit]": limit,
            "sort": "createdAt:desc"
        }
        
        if category:
            params["filters[category][$eq]"] = category

        try:
            response = requests.get(url, headers=self.headers, params=params)
            if response.status_code == 200:
                data = response.json().get("data", [])
                flat_posts = []
                for item in data:
                    flat_item = {
                        "id": item.get("id"),
                        "documentId": item.get("documentId"),
                        "title": self._get_field(item, "title"),
                        "content": self._get_field(item, "content"),
                        "category": self._get_field(item, "category"),
                        "author": self._get_field(item, "author"),
                        "createdAt": self._get_field(item, "createdAt")
                    }
                    flat_posts.append(flat_item)
                return flat_posts
            else:
                print(f"[StrapiClient] Error getting blog posts ({response.status_code}): {response.text}")
                return []
        except Exception as e:
            print(f"[StrapiClient] Connection error during get_blog_posts: {e}")
            return []
