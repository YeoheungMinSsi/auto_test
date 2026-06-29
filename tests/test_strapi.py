import os
import sys
import unittest

# 프로젝트 루트 경로를 sys.path에 추가
base_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.join(base_dir, "..")
sys.path.append(project_root)

# paper_summary 경로도 추가
paper_summary_dir = os.path.join(project_root, "paper_summary")
sys.path.append(paper_summary_dir)

from paper_summary.apis.strapi_client import StrapiClient

class TestStrapiIntegration(unittest.TestCase):
    def setUp(self):
        self.client = StrapiClient()
        self.test_title = "Antigravity Test Paper 2026"
        self.test_paper = {
            "title": self.test_title,
            "authors": "Antigravity Agent, User",
            "summary": "This is a temporary test summary.",
            "pdf_path": "temp/test.pdf",
            "url": "https://example.com/test-paper",
            "category": "temp/test",
            "doi": "10.1234/test.2026",
            "year": 2026
        }

    def test_connection_and_crud(self):
        # 1. API Token 로드 확인
        self.assertIsNotNone(self.client.token, "STRAPI_API_TOKEN is not configured in .env file.")
        print(f"[Test] Strapi URL: {self.client.api_url}")
        
        # 2. 중복 검사 (시작 전이므로 존재하지 않아야 함)
        print(f"[Test] Checking duplicate for title: '{self.test_title}'")
        is_dup_before = self.client.check_duplicate(self.test_title, self.test_paper["doi"])
        print(f"[Test] Duplicate before create: {is_dup_before}")

        # 3. 데이터 생성 (Create)
        print("[Test] Creating new paper in Strapi DB...")
        created_data = self.client.create_paper(self.test_paper)
        self.assertIsNotNone(created_data, "Failed to create paper in Strapi.")
        
        # documentId 또는 id 획득
        doc_id = created_data.get("documentId")
        numeric_id = created_data.get("id")
        print(f"[Test] Successfully created! ID: {numeric_id}, DocumentId: {doc_id}")

        # 4. 데이터 조회 (Read)
        print("[Test] Getting papers from Strapi DB...")
        papers = self.client.get_papers(category="temp/test")
        found = False
        for p in papers:
            if p["title"] == self.test_title:
                found = True
                self.assertEqual(p["authors"], "Antigravity Agent, User")
                break
        self.assertTrue(found, "Created test paper not found in retrieved list.")

        # 5. 데이터 수정 (Update)
        new_summary = "Updated AI summary for testing purposes."
        print(f"[Test] Updating summary for documentId: {doc_id or numeric_id}")
        target_id = doc_id if doc_id else str(numeric_id)
        update_success = self.client.update_paper_summary(target_id, new_summary)
        self.assertTrue(update_success, "Failed to update paper summary.")
        
        # 6. 제목 기반 수정 테스트 (Update by Title)
        brand_new_summary = "Brand new updated markdown summary."
        print(f"[Test] Updating summary by title: '{self.test_title}'")
        update_by_title_success = self.client.update_summary_by_title(self.test_title, brand_new_summary)
        self.assertTrue(update_by_title_success, "Failed to update summary by title.")

        print("[Test] All Strapi CRUD integration tests passed successfully! SUCCESS")

if __name__ == "__main__":
    unittest.main()
