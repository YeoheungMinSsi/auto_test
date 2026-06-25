import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Any
from apis.base_api import BaseAcademicAPI

class ScienceOnAPI(BaseAcademicAPI):
    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        results = []
        if not self.api_key or self.api_key == "your_scienceon_api_key_here":
            print("[ScienceOn API] Warning: ScienceOn API Key is not set in .env. Skipping ScienceOn search.")
            return results

        try:
            # ScienceOn API Gateway 호출
            url = "https://apigateway.kisti.re.kr/openapicall.do"
            params = {
                "client_id": self.api_key, # 발급받은 client_id
                "version": "1.0",
                "action": "search",
                "target": "ARTI", # 학술논문 검색
                "searchQuery": f"BI={query}", # 제목/본문 검색
                "session_id": "guest",
                "curPage": "1",
                "rowCount": limit
            }
            
            response = requests.get(url, params=params, timeout=10)
            if response.status_code != 200:
                print(f"[ScienceOn API] Error: HTTP {response.status_code}")
                return results

            soup = BeautifulSoup(response.content, "xml")
            records = soup.find_all("record")

            for record in records:
                metadata = record.find("metadata")
                if not metadata:
                    continue
                
                title_node = metadata.find("title")
                title = title_node.text.strip() if title_node else "Unknown Title"
                
                # 저자
                author_nodes = metadata.find_all("author")
                authors = [author.text.strip() for author in author_nodes]
                
                # 초록 (국문/영문 혼재 가능)
                abstract_node = metadata.find("abstract")
                abstract = abstract_node.text.strip() if abstract_node else ""
                
                # 출판년도
                pub_year_node = metadata.find("pub-year")
                year = None
                if pub_year_node:
                    try:
                        year = int(pub_year_node.text.strip()[:4])
                    except ValueError:
                        pass
                
                # 상세 주소 및 DOI
                doi_node = metadata.find("doi")
                doi = doi_node.text.strip() if doi_node else None
                
                url_node = metadata.find("url")
                web_url = url_node.text.strip() if url_node else None
                
                results.append({
                    "title": title,
                    "authors": authors,
                    "abstract": abstract,
                    "doi": doi,
                    "pdf_url": None, # 원문은 대개 외부 링크나 ScienceOn 뷰어로 연결됨
                    "source": "ScienceOn",
                    "citation_count": 0,
                    "year": year,
                    "url": web_url
                })
        except Exception as e:
            print(f"[ScienceOn API] Exception occurred: {e}")
            
        return results
