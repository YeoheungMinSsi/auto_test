import requests
from typing import List, Dict, Any
from apis.base_api import BaseAcademicAPI

class PmcAPI(BaseAcademicAPI):
    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        results = []
        try:
            # 1단계: PMC ID 검색 (esearch)
            search_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
            search_params = {
                "db": "pmc",
                "term": query,
                "retmode": "json",
                "retmax": limit
            }
            
            search_response = requests.get(search_url, params=search_params, timeout=10)
            if search_response.status_code != 200:
                print(f"[PMC API] Search Error: HTTP {search_response.status_code}")
                return results

            search_data = search_response.json()
            id_list = search_data.get("esearchresult", {}).get("idlist", [])
            
            if not id_list:
                return results

            # 2단계: 각 ID 상세 정보 조회 (esummary)
            summary_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
            summary_params = {
                "db": "pmc",
                "id": ",".join(id_list),
                "retmode": "json"
            }
            
            summary_response = requests.get(summary_url, params=summary_params, timeout=10)
            if summary_response.status_code != 200:
                print(f"[PMC API] Summary Error: HTTP {summary_response.status_code}")
                return results

            summary_data = summary_response.json()
            result_dict = summary_data.get("result", {})

            for pmcid_num in id_list:
                paper_info = result_dict.get(pmcid_num)
                if not paper_info:
                    continue
                
                title = paper_info.get("title", "Unknown Title")
                
                # 저자 목록 추출
                authors = []
                for author in paper_info.get("authors", []):
                    name = author.get("name")
                    if name:
                        authors.append(name)
                
                # 출판년도
                pubdate = paper_info.get("pubdate", "")
                year = None
                if pubdate:
                    try:
                        year = int(pubdate.split(" ")[0].split("-")[0][:4])
                    except ValueError:
                        pass
                
                # DOI 추출
                doi = None
                for articleid in paper_info.get("articleids", []):
                    if articleid.get("idtype") == "doi":
                        doi = articleid.get("value")
                        break
                
                # PMC 고유 ID 추출 (예: PMC123456)
                pmcid = None
                for articleid in paper_info.get("articleids", []):
                    if articleid.get("idtype") == "pmcid":
                        pmcid = articleid.get("value")
                        break
                
                # PMC의 경우 대부분 오픈 액세스이므로 PDF 다운로드 주소 매핑 가능
                # 다운로드 경로 포맷: https://www.ncbi.nlm.nih.gov/pmc/articles/{pmcid}/pdf/
                pdf_url = f"https://www.ncbi.nlm.nih.gov/pmc/articles/{pmcid}/pdf/" if pmcid else None
                web_url = f"https://www.ncbi.nlm.nih.gov/pmc/articles/{pmcid}/" if pmcid else None
                
                results.append({
                    "title": title,
                    "authors": authors,
                    "abstract": "",  # esummary는 초록을 제공하지 않음
                    "doi": doi,
                    "pdf_url": pdf_url,
                    "source": "PMC",
                    "citation_count": 0,  # esummary에서 기본 인용수 미제공
                    "year": year,
                    "url": web_url
                })
        except Exception as e:
            print(f"[PMC API] Exception occurred: {e}")
            
        return results
