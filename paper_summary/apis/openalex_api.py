import requests
from typing import List, Dict, Any
from apis.base_api import BaseAcademicAPI

class OpenAlexAPI(BaseAcademicAPI):
    def _reconstruct_abstract(self, inverted_index: Dict[str, List[int]]) -> str:
        """
        OpenAlex의 inverted index 형식 초록을 일반 텍스트로 복원합니다.
        """
        if not inverted_index:
            return ""
        try:
            word_positions = []
            for word, positions in inverted_index.items():
                for pos in positions:
                    word_positions.append((pos, word))
            word_positions.sort()
            return " ".join([word for pos, word in word_positions])
        except Exception:
            return ""

    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        results = []
        try:
            url = "https://api.openalex.org/works"
            params = {
                "search": query,
                "per_page": limit
            }
            # OpenAlex 가이드라인: Polite pool에 합류하기 위해 User-Agent 설정 권장
            headers = {
                "User-Agent": "AntigravityAcademicPaperFetcher/1.0 (mailto:agent@example.com)"
            }
            
            response = requests.get(url, params=params, headers=headers, timeout=10)
            
            if response.status_code != 200:
                print(f"[OpenAlex API] Error: HTTP {response.status_code}")
                return results

            data = response.json()
            works = data.get("results", [])

            for work in works:
                title = work.get("title", "Unknown Title")
                
                # 저자 정보 추출
                authors = []
                for authorship in work.get("authorships", []):
                    author_name = authorship.get("author", {}).get("display_name")
                    if author_name:
                        authors.append(author_name)
                
                # 초록 복원
                inverted_index = work.get("abstract_inverted_index")
                abstract = self._reconstruct_abstract(inverted_index) if inverted_index else ""
                
                # DOI 정규화
                doi = work.get("doi")
                if doi and doi.startswith("https://doi.org/"):
                    doi = doi.replace("https://doi.org/", "")
                
                # PDF URL (Open Access URL)
                open_access = work.get("open_access", {})
                pdf_url = open_access.get("oa_url") if open_access else None
                
                # 만약 pdf_url이 존재하지만 실제 pdf 확장자가 아닌 웹페이지인 경우도 있으나,
                # 최선으로 다운로드 시도하도록 설정
                citation_count = work.get("cited_by_count", 0)
                year = work.get("publication_year")
                web_url = work.get("id")  # OpenAlex 고유 work URI (상세 페이지 역할)
                
                results.append({
                    "title": title,
                    "authors": authors,
                    "abstract": abstract,
                    "doi": doi,
                    "pdf_url": pdf_url,
                    "source": "OpenAlex",
                    "citation_count": citation_count if citation_count is not None else 0,
                    "year": year,
                    "url": web_url
                })
        except Exception as e:
            print(f"[OpenAlex API] Exception occurred: {e}")
            
        return results
