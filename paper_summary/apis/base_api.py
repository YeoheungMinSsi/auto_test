from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseAcademicAPI(ABC):
    def __init__(self, api_key: str = None):
        """
        학술 API 베이스 클래스 생성자.
        :param api_key: 해당 API를 사용하는 데 필요한 인증키 (선택 사항)
        """
        self.api_key = api_key

    @abstractmethod
    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        논문을 검색하고 일관된 형식의 리스트를 반환합니다.
        
        반환 형식 예시:
        [
            {
                "title": "논문 제목",
                "authors": ["저자1", "저자2"],
                "abstract": "초록 내용...",
                "doi": "10.1000/xyz123",            # 식별용 DOI (없으면 None)
                "pdf_url": "https://example.com/paper.pdf",  # 다운로드 가능한 PDF 주소 (없으면 None)
                "source": "arXiv",                 # API 소스 이름
                "citation_count": 42,              # 인용 횟수 (정보가 없으면 0)
                "year": 2023,                      # 출판 년도 (없으면 None)
                "url": "논문 상세 페이지 URL"        # 웹 페이지 주소
            }
        ]
        """
        pass
