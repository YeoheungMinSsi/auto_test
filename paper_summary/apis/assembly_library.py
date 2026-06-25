import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Any
from apis.base_api import BaseAcademicAPI

class AssemblyLibraryAPI(BaseAcademicAPI):
    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        results = []
        if not self.api_key or self.api_key == "your_assembly_library_api_key_here":
            print("[Assembly Library API] Warning: Assembly Library API Key is not set in .env. Skipping Assembly Library search.")
            return results

        try:
            # 국회도서관 OpenSearch API 호출 규격 예시
            url = "http://dl.nanet.go.kr/OpenApiSearch.do"
            params = {
                "key": self.api_key,
                "query": query,
                "pageSize": limit,
                "startIdx": "1"
            }
            
            response = requests.get(url, params=params, timeout=10)
            if response.status_code != 200:
                print(f"[Assembly Library API] Error: HTTP {response.status_code}")
                return results

            soup = BeautifulSoup(response.content, "xml")
            items = soup.find_all("item")

            for item in items:
                title_node = item.find("title")
                title = title_node.text.strip() if title_node else "Unknown Title"
                
                # 저자
                author_node = item.find("author")
                authors = [author_node.text.strip()] if author_node else []
                
                # 초록/내용 설명
                abstract_node = item.find("abstract")
                abstract = abstract_node.text.strip() if abstract_node else ""
                
                # 출판년도
                pub_year_node = item.find("publishYear")
                year = None
                if pub_year_node:
                    try:
                        year = int(pub_year_node.text.strip()[:4])
                    except ValueError:
                        pass
                
                # 국회도서관 자료 링크
                link_node = item.find("link")
                web_url = link_node.text.strip() if link_node else None
                
                results.append({
                    "title": title,
                    "authors": authors,
                    "abstract": abstract,
                    "doi": None,
                    "pdf_url": None, # 국회도서관 뷰어 내부 보안 규정상 PDF 직접 주소 추출은 불가능함
                    "source": "AssemblyLibrary",
                    "citation_count": 0,
                    "year": year,
                    "url": web_url
                })
        except Exception as e:
            print(f"[Assembly Library API] Exception occurred: {e}")
            
        return results
