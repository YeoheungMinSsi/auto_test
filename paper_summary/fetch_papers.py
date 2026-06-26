import os
import argparse
from dotenv import load_dotenv
from apis import (
    ArxivAPI,
    SemanticScholarAPI,
    OpenAlexAPI,
    PmcAPI,
    RissAPI,
    ScienceOnAPI,
    AssemblyLibraryAPI
)
from downloader import PaperDownloader

# .env 환경 변수 로드
base_dir = os.path.dirname(os.path.abspath(__file__))
root_env = os.path.join(base_dir, "..", ".env")
if os.path.exists(root_env):
    load_dotenv(root_env)
else:
    load_dotenv()

# 사용할 수 있는 전체 API 소스 매핑
API_MAPPING = {
    "arxiv": (ArxivAPI, None),
    "semantic": (SemanticScholarAPI, os.getenv("SEMANTIC_SCHOLAR_API_KEY")),
    "openalex": (OpenAlexAPI, None),
    "pmc": (PmcAPI, None),
    "riss": (RissAPI, os.getenv("RISS_API_KEY")),
    "scienceon": (ScienceOnAPI, os.getenv("SCIENCEON_API_KEY")),
    "assembly": (AssemblyLibraryAPI, os.getenv("ASSEMBLY_LIBRARY_API_KEY"))
}

def main():
    parser = argparse.ArgumentParser(description="분야별 국내외 저명 논문 수집 자동화 프로그램")
    parser.add_argument("--query", type=str, required=True, help="검색할 논문 키워드")
    parser.add_argument("--category", type=str, required=True, 
                        help="저장할 분야 디렉토리 (예: ai_ml/llm, computer_science/algorithms)")
    parser.add_argument("--sources", type=str, default="arxiv,semantic,openalex,pmc",
                        help="사용할 API 소스 목록 (쉼표 구분, 예: arxiv,semantic,riss)")
    parser.add_argument("--limit", type=int, default=3, help="API 소스당 검색할 논문 수 제한")
    parser.add_argument("--search-only", action="store_true", help="다운로드를 생략하고 검색 결과만 JSON으로 출력합니다.")
    
    args = parser.parse_args()
    
    
    # 1. 저장 디렉토리 유효성 체크
    base_dir = os.path.dirname(os.path.abspath(__file__))
    category_dir = os.path.join(base_dir, "categories", args.category)
    
    if not os.path.exists(category_dir):
        print(f"[Error] 지정한 카테고리 디렉토리가 존재하지 않습니다: categories/{args.category}")
        print("만들어진 카테고리 내의 디렉토리 경로를 정확히 입력해주세요.")
        return

    print("=" * 60)
    print(f"논문 수집 시작")
    print(f" - 검색어: {args.query}")
    print(f" - 카테고리: {args.category}")
    print(f" - 대상 API: {args.sources}")
    print(f" - 소스별 개수 제한: {args.limit}")
    print("=" * 60)

    # 2. 다운로더 초기화
    downloader = PaperDownloader(base_dir=base_dir)
    
    # 3. 소스 파싱 및 API 인스턴스 생성
    active_sources = [s.strip().lower() for s in args.sources.split(",")]
    
    all_papers = []
    
    for source_name in active_sources:
        if source_name not in API_MAPPING:
            print(f"[Warning] 알 수 없는 API 소스 스킵: {source_name}")
            continue
            
        api_class, api_key = API_MAPPING[source_name]
        
        # 인스턴스 생성 및 검색 수행
        print(f"\n[{source_name.upper()} API] 검색 중...")
        api_instance = api_class(api_key=api_key)
        papers = api_instance.search(query=args.query, limit=args.limit)
        print(f" -> {len(papers)}개의 논문 발견.")
        all_papers.extend(papers)

    if args.search_only:
        print("\n" + "=" * 60)
        print("검색 완료 (Search Only Mode). 결과를 파일로 저장합니다.")
        print("=" * 60)
        import json
        out_path = os.path.join(base_dir, "search_results_tmp.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(all_papers, f, ensure_ascii=False, indent=2)
        print(f"검색 결과가 저장되었습니다: {out_path}")
        return

    # 4. 수집된 논문 통합 및 다운로드 (중복 제거 포함)
    print("\n" + "=" * 60)
    print("통합 수집 및 다운로드 진행 (중복 제거 필터 작동)")
    print("=" * 60)
    
    success_count = 0
    skipped_count = 0
    failed_count = 0

    for paper in all_papers:
        # 다운로드 및 이력 추가 시도
        result = downloader.download_pdf(paper, args.category)
        if result:
            # pdf_url이 없어서 메타데이터만 저장한 경우도 성공으로 처리
            success_count += 1
        else:
            # 중복 스킵인 경우
            if downloader.is_duplicate(paper["title"], paper.get("doi")):
                skipped_count += 1
            else:
                failed_count += 1

    print("\n" + "=" * 60)
    print("수집 완료 리포트")
    print(f" - 총 발견된 논문: {len(all_papers)}개")
    print(f" - 신규 수집 성공: {success_count}개")
    print(f" - 중복 스킵: {skipped_count}개")
    print(f" - 수집 실패: {failed_count}개")
    print("=" * 60)

if __name__ == "__main__":
    main()
