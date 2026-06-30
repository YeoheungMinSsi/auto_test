import urllib.parse
import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Any
from apis.base_api import BaseAcademicAPI

class ArxivAPI(BaseAcademicAPI):
    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        results = []
        try:
            encoded_query = urllib.parse.quote(query)
            # arXiv API 엔드포인트 호출 (최신 제출일 순 정렬 추가)
            url = f"http://export.arxiv.org/api/query?search_query=all:{encoded_query}&max_results={limit}&sortBy=submittedDate&sortOrder=descending"
            response = requests.get(url, timeout=10)
            
            if response.status_code != 200:
                print(f"[arXiv API] Error: HTTP {response.status_code}")
                return results

            soup = BeautifulSoup(response.content, "xml")
            entries = soup.find_all("entry")

            for entry in entries:
                # 제목 추출
                title_node = entry.find("title")
                title = title_node.text.strip().replace("\n", " ") if title_node else "Unknown Title"
                
                # 저자 추출
                authors = [author.find("name").text.strip() for author in entry.find_all("author") if author.find("name")]
                
                # 요약(초록) 추출
                summary_node = entry.find("summary")
                abstract = summary_node.text.strip().replace("\n", " ") if summary_node else ""
                
                # 출판년도 추출
                published_node = entry.find("published")
                year = None
                if published_node:
                    try:
                        year = int(published_node.text[:4])
                    except ValueError:
                        pass
                
                # PDF 링크 추출
                pdf_url = None
                links = entry.find_all("link")
                for link in links:
                    if link.get("title") == "pdf" or link.get("type") == "application/pdf":
                        pdf_url = link.get("href")
                        break
                
                # 상세 페이지 URL
                id_node = entry.find("id")
                web_url = id_node.text.strip() if id_node else None
                
                # DOI 추출
                doi_node = entry.find("arxiv:doi")
                doi = doi_node.text.strip() if doi_node else None
                
                results.append({
                    "title": title,
                    "authors": authors,
                    "abstract": abstract,
                    "doi": doi,
                    "pdf_url": pdf_url,
                    "source": "arXiv",
                    "citation_count": 0,  # arXiv API는 자체 인용수를 제공하지 않음
                    "year": year,
                    "url": web_url
                })
        except Exception as e:
            print(f"[arXiv API] Exception occurred: {e}")
            
        return results
