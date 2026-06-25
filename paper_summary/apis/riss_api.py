import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Any
from apis.base_api import BaseAcademicAPI

class RissAPI(BaseAcademicAPI):
    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        results = []
        if not self.api_key or self.api_key == "your_riss_api_key_here":
            print("[RISS API] Warning: RISS API Key is not set in .env. Skipping RISS search.")
            return results

        try:
            # RISS OpenAPI 표준 검색 엔드포인트 (실제 KERIS OpenAPI 양식에 따름)
            # 주소 예시: http://openapi.riss.kr/openapi/key/search/dcoll 등
            # 여기서는 표준 연동 뼈대를 구현합니다.
            url = "http://openapi.riss.kr/openapi/key/search/dcoll"
            params = {
                "key": self.api_key,
                "keyword": query,
                "maxResults": limit,
                "dcollType": "all" # 학위논문, 학술논문 등
            }
            
            response = requests.get(url, params=params, timeout=10)
            if response.status_code != 200:
                print(f"[RISS API] Error: HTTP {response.status_code}")
                return results

            soup = BeautifulSoup(response.content, "xml")
            items = soup.find_all("metadata") # RISS XML 응답 태그 기준 파싱

            for item in items:
                title_node = item.find("title")
                title = title_node.text.strip() if title_node else "Unknown Title"
                
                # 저자
                creator_nodes = item.find_all("creator")
                authors = [creator.text.strip() for creator in creator_nodes]
                
                # 초록
                abstract_node = item.find("description")
                abstract = abstract_node.text.strip() if abstract_node else ""
                
                # 연도
                date_node = item.find("date")
                year = None
                if date_node:
                    try:
                        year = int(date_node.text[:4])
                    except ValueError:
                        pass
                
                # RISS는 일반적으로 저작권 문제로 바로 다운로드 가능한 원문 PDF URL을 API로 주지 않음
                # 대신 논문 상세 링크 제공
                identifier_node = item.find("identifier")
                web_url = identifier_node.text.strip() if identifier_node else None
                
                results.append({
                    "title": title,
                    "authors": authors,
                    "abstract": abstract,
                    "doi": None,
                    "pdf_url": None, # 국내 논문은 대부분 RISS 상세페이지를 거쳐 유료 또는 뷰어 다운로드
                    "source": "RISS",
                    "citation_count": 0,
                    "year": year,
                    "url": web_url
                })
        except Exception as e:
            print(f"[RISS API] Exception occurred: {e}")
            
        return results
