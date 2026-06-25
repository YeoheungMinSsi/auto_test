import os
import re
import json
import requests
from datetime import datetime
from typing import Dict, Any, List

class PaperDownloader:
    def __init__(self, base_dir: str):
        self.base_dir = base_dir
        self.history_file = os.path.join(base_dir, "collected_papers.json")
        self.history = self._load_history()

    def _load_history(self) -> List[Dict[str, Any]]:
        """수집 이력 JSON 파일을 로드합니다."""
        if os.path.exists(self.history_file):
            try:
                with open(self.history_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"[Downloader] Error loading history file: {e}")
                return []
        return []

    def _save_history(self):
        """수집 이력 JSON 파일을 저장합니다."""
        try:
            with open(self.history_file, "w", encoding="utf-8") as f:
                json.dump(self.history, f, indent=4, ensure_ascii=False)
        except Exception as e:
            print(f"[Downloader] Error saving history file: {e}")

    def normalize_title(self, title: str) -> str:
        """대소문자, 공백, 특수문자를 제거하여 중복 검사용으로 제목을 정규화합니다."""
        # 알파벳, 한글, 숫자만 남기고 제거
        clean_title = re.sub(r"[^a-zA-Z0-9가-힣]", "", title)
        return clean_title.lower().strip()

    def is_duplicate(self, title: str, doi: str = None) -> bool:
        """제목 또는 DOI를 기준으로 중복 수집 여부를 확인합니다."""
        normalized_title = self.normalize_title(title)
        
        for item in self.history:
            # 1. DOI 기준 비교
            if doi and item.get("doi") == doi:
                return True
            # 2. 제목 기준 비교
            if item.get("normalized_title") == normalized_title:
                return True
                
        return False

    def clean_filename(self, filename: str) -> str:
        """OS 파일 이름으로 사용할 수 없는 문자를 언더스코어로 대체합니다."""
        return re.sub(r'[\\/*?:"<>|]', "_", filename)

    def download_pdf(self, paper: Dict[str, Any], category_path: str) -> bool:
        """논문 PDF를 다운로드하고 수집 이력에 기록합니다."""
        title = paper.get("title")
        pdf_url = paper.get("pdf_url")
        doi = paper.get("doi")
        
        # 중복 체크
        if self.is_duplicate(title, doi):
            print(f"[Downloader] Skip (Duplicate): {title[:50]}...")
            return False

        if not pdf_url:
            # PDF 다운로드 링크는 없지만, 메타데이터 수집을 위해 이력에 저장만 함
            print(f"[Downloader] No PDF link. Metadata saved for: {title[:50]}...")
            self.history.append({
                "title": title,
                "normalized_title": self.normalize_title(title),
                "doi": doi,
                "pdf_path": None,
                "source": paper.get("source"),
                "collected_at": datetime.now().isoformat(),
                "url": paper.get("url")
            })
            self._save_history()
            return True

        # 저장할 파일명 설정
        safe_title = self.clean_filename(title)
        # 제목이 너무 길면 파일 시스템 제한에 걸릴 수 있으므로 제한
        if len(safe_title) > 100:
            safe_title = safe_title[:100]
        filename = f"{safe_title}.pdf"
        
        # 전체 저장 경로 설정
        save_dir = os.path.join(self.base_dir, "categories", category_path)
        os.makedirs(save_dir, exist_ok=True)
        file_path = os.path.join(save_dir, filename)

        try:
            print(f"[Downloader] Downloading: {title[:50]}...")
            # 브라우저 위장용 User-Agent 설정 (다운로드 차단 우회)
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            
            response = requests.get(pdf_url, headers=headers, timeout=20, stream=True)
            if response.status_code != 200:
                print(f"[Downloader] Failed to download PDF (HTTP {response.status_code}) from: {pdf_url}")
                return False
            
            # Content-Type이 PDF가 아닌 html인 경우가 가끔 있으므로 확인
            content_type = response.headers.get("Content-Type", "")
            if "html" in content_type.lower():
                # 리다이렉트나 차단으로 인해 HTML이 다운로드되는 현상 방지
                print(f"[Downloader] Warn: URL did not return a PDF stream. Skipping: {pdf_url}")
                return False

            with open(file_path, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
            
            # 성공 시 이력 추가
            relative_pdf_path = os.path.relpath(file_path, self.base_dir)
            self.history.append({
                "title": title,
                "normalized_title": self.normalize_title(title),
                "doi": doi,
                "pdf_path": relative_pdf_path,
                "source": paper.get("source"),
                "collected_at": datetime.now().isoformat(),
                "url": paper.get("url")
            })
            self._save_history()
            print(f"[Downloader] Success! Saved to: {relative_pdf_path}")
            return True

        except Exception as e:
            print(f"[Downloader] Exception during download: {e}")
            # 쓰다 남은 깨진 파일 삭제
            if os.path.exists(file_path):
                os.remove(file_path)
            return False
