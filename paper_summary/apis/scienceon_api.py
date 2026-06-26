import os
import requests
import uuid
import binascii
from datetime import datetime
from bs4 import BeautifulSoup
from typing import List, Dict, Any
from apis.base_api import BaseAcademicAPI

# Cryptography 라이브러리를 사용한 AES 암호화
try:
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    from cryptography.hazmat.primitives import padding
    from cryptography.hazmat.backends import default_backend
    HAS_CRYPTOGRAPHY = True
except ImportError:
    HAS_CRYPTOGRAPHY = False

class ScienceOnAPI(BaseAcademicAPI):
    def __init__(self, api_key: str = None):
        super().__init__(api_key)
        # .env에서 client_id와 실제 api_key를 가져옵니다.
        self.client_id = os.getenv("SCIENCEON_CLIENT_ID") or self.api_key
        self.api_key = os.getenv("SCIENCEON_API_KEY")
        self.access_token = None

    def _get_mac_address(self) -> str:
        """로컬 장비의 MAC 주소 구하기 (Format: XX-XX-XX-XX-XX-XX)"""
        # 1. .env에 명시적으로 설정된 MAC 주소가 있다면 최우선적으로 반환
        env_mac = os.getenv("SCIENCEON_MAC_ADDRESS")
        if env_mac:
            return env_mac.strip().replace(":", "-").upper()
            
        try:
            mac = uuid.getnode()
            return '-'.join([f'{(mac >> ele) & 0xff:02x}' for ele in range(0, 8*6, 8)][::-1]).upper()
        except Exception:
            return "00-00-00-00-00-00"

    def _encrypt_accounts(self, plain_text: str, key_hex: str) -> str:
        """KISTI 규격에 맞게 accounts 문자열을 AES-256-CBC로 암호화하고 Hex String으로 반환"""
        if not HAS_CRYPTOGRAPHY:
            raise ImportError("cryptography 라이브러리가 설치되어 있지 않습니다.")
            
        # 16바이트 고정 IV
        iv = b"jvHJ1EFA0IXBrxxz"
        
        # 키 바이트 변환
        if len(key_hex) == 64:
            try:
                key_bytes = binascii.unhexlify(key_hex)
            except Exception:
                key_bytes = key_hex.encode('utf-8').ljust(32, b'\0')[:32]
        else:
            key_bytes = key_hex.encode('utf-8').ljust(32, b'\0')[:32]

        # 패딩 처리 (PKCS7)
        padder = padding.PKCS7(128).padder()
        padded_data = padder.update(plain_text.encode('utf-8')) + padder.finalize()

        # AES 암호화
        cipher = Cipher(algorithms.AES(key_bytes), modes.CBC(iv), backend=default_backend())
        encryptor = cipher.encryptor()
        encrypted_data = encryptor.update(padded_data) + encryptor.finalize()

        # Hex 16진수 문자열로 반환
        return binascii.hexlify(encrypted_data).decode('utf-8')

    def get_access_token(self) -> str:
        """ScienceON API Gateway인 tokenrequest.do를 통해 토큰 발급"""
        if not self.client_id or not self.api_key or self.api_key == "your_scienceon_api_key_here":
            print("[ScienceOn API] Warning: SCIENCEON_CLIENT_ID or SCIENCEON_API_KEY is not set in .env")
            return None

        try:
            # 1. 암호화 대상 문자열 생성: yyyyMMddHHmmss^MAC주소
            now_str = datetime.now().strftime("%Y%m%d%H%M%S")
            mac_addr = self._get_mac_address()
            print(f"[ScienceOn API] Token request details -> Time: {now_str}, MAC: {mac_addr}")
            plain_accounts = f"{now_str}^{mac_addr}"

            # 2. 암호화
            encrypted_accounts = self._encrypt_accounts(plain_accounts, self.api_key)

            # 3. API 호출
            token_url = "https://apigateway.kisti.re.kr/tokenrequest.do"
            params = {
                "client_id": self.client_id,
                "accounts": encrypted_accounts
            }
            
            response = requests.get(token_url, params=params, timeout=10)
            print(f"[ScienceOn API] Token request response status: {response.status_code}")
            print(f"[ScienceOn API] Token request response text: {response.text}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if "access_token" in data:
                        self.access_token = data.get("access_token")
                        print(f"[ScienceOn API] Access token acquired successfully.")
                        return self.access_token
                    else:
                        err_msg = data.get("errorMessage", "Unknown error")
                        err_code = data.get("errorCode", "Unknown code")
                        print(f"[ScienceOn API] Token request returned error: {err_msg} ({err_code})")
                except Exception as je:
                    print(f"[ScienceOn API] JSON decode error: {je}")
            else:
                print(f"[ScienceOn API] Token request failed with HTTP {response.status_code}: {response.text}")
        except Exception as e:
            print(f"[ScienceOn API] Token request exception occurred: {e}")
        return None

    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        results = []
        
        # 1. 토큰 획득 시도
        if not self.access_token:
            self.get_access_token()

        if not self.access_token:
            print("[ScienceOn API] Warning: Access Token is missing. Skipping ScienceOn search.")
            return results

        try:
            # ScienceOn API Gateway 호출
            url = "https://apigateway.kisti.re.kr/openapicall.do"
            params = {
                "client_id": self.client_id,
                "token": self.access_token, # 발급받은 access_token 적용
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
