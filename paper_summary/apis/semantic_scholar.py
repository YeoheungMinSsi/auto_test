import requests
from typing import List, Dict, Any
from apis.base_api import BaseAcademicAPI

class SemanticScholarAPI(BaseAcademicAPI):
    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        results = []
        try:
            url = "https://api.semanticscholar.org/graph/v1/paper/search"
            params = {
                "query": query,
                "limit": limit,
                "fields": "title,authors,abstract,externalIds,openAccessPdf,citationCount,year,url"
            }
            
            headers = {}
            if self.api_key:
                headers["x-api-key"] = self.api_key
                
            response = requests.get(url, params=params, headers=headers, timeout=10)
            
            if response.status_code != 200:
                print(f"[Semantic Scholar API] Error: HTTP {response.status_code}")
                # API 제한(Rate limit) 발생 가능성이 있으므로 메시지 출력
                if response.status_code == 429:
                    print("[Semantic Scholar API] Rate limit exceeded. Try again later or add an API key.")
                return results

            data = response.json()
            papers = data.get("data", [])

            for paper in papers:
                title = paper.get("title", "Unknown Title")
                
                # 저자 리스트 추출
                authors = [author.get("name") for author in paper.get("authors", []) if author.get("name")]
                
                abstract = paper.get("abstract", "")
                
                # DOI 추출
                external_ids = paper.get("externalIds", {})
                doi = external_ids.get("DOI") if external_ids else None
                
                # PDF URL 추출
                open_access_pdf = paper.get("openAccessPdf")
                pdf_url = open_access_pdf.get("url") if open_access_pdf else None
                
                citation_count = paper.get("citationCount", 0)
                year = paper.get("year")
                web_url = paper.get("url")
                
                results.append({
                    "title": title,
                    "authors": authors,
                    "abstract": abstract,
                    "doi": doi,
                    "pdf_url": pdf_url,
                    "source": "SemanticScholar",
                    "citation_count": citation_count if citation_count is not None else 0,
                    "year": year,
                    "url": web_url
                })
        except Exception as e:
            print(f"[Semantic Scholar API] Exception occurred: {e}")
            
        return results
