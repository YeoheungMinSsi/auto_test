import os
import json
import subprocess
import sys

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

def run_script(script_path: str, args: list = None):
    """
    지정된 파이썬 스크립트를 가상환경 파이썬으로 실행합니다.
    """
    if args is None:
        args = []
        
    print(f"\n{'='*50}")
    print(f"🚀 실행 시작: {os.path.basename(script_path)} {' '.join(args)}")
    print(f"{'='*50}")
    
    # 가상환경 파이썬 경로
    venv_python = os.path.join(os.path.dirname(os.path.abspath(__file__)), "venv", "Scripts", "python.exe")
    
    if not os.path.exists(venv_python):
        print(f"가상환경 파이썬을 찾을 수 없습니다: {venv_python}")
        sys.exit(1)

    cmd = [venv_python, script_path] + args
    
    try:
        result = subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"\n❌ 오류 발생: {os.path.basename(script_path)} 실행 중 문제가 발생했습니다.")
        sys.exit(1)
        
    print(f"\n✅ 완료: {os.path.basename(script_path)}\n")

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 각 단계별 스크립트 경로
    step1_fetch = os.path.join(base_dir, "paper_summary", "fetch_papers.py")
    step2_summarize = os.path.join(base_dir, "paper_summary", "summarizer.py")

    print("==================================================")
    print("🌟 [Step 1] 논문 수집 및 한글 요약 파이프라인 시작 🌟")
    print("==================================================\n")

    # Step 1: 해외 논문 검색 및 다운로드
    target_category = "science/quantum"
    os.makedirs(os.path.join(base_dir, "paper_summary", "categories", target_category), exist_ok=True)
    
    # 해외 논문을 가져오기 위해 arxiv 소스를 지정하고, 1개만 가져옵니다. (필요 시 수정)
    run_script(step1_fetch, [
        "--query", "Quantum Computing", 
        "--category", target_category, 
        "--sources", "arxiv", 
        "--limit", "1"
    ])

    # 수집 완료된 논문 목록 파싱
    history_file = os.path.join(base_dir, "paper_summary", "collected_papers.json")
    if not os.path.exists(history_file):
        print("[Pipeline] Error: No collected_papers.json found. Step 1 failed.")
        return

    with open(history_file, "r", encoding="utf-8") as f:
        papers = json.load(f)

    valid_papers = [p for p in papers if p.get("pdf_path") is not None]
    if not valid_papers:
        print("[Pipeline] No valid downloaded PDF papers found in history.")
        return

    print(f"[Pipeline] Found {len(valid_papers)} papers to process.")

    # 각 논문별 요약(Step 2) 수행
    for idx, paper in enumerate(valid_papers):
        pdf_rel_path = paper.get("pdf_path")
        pdf_abs_path = os.path.join(base_dir, "paper_summary", pdf_rel_path)
        
        if not os.path.exists(pdf_abs_path):
            print(f"[Pipeline] PDF file not found at: {pdf_abs_path}. Skipping.")
            continue
            
        print(f"\n▶ [{idx+1}/{len(valid_papers)}] Processing summary for: {paper.get('title')}")
        
        # Step 2: 다단계 요약 및 수식 추출
        run_script(step2_summarize, ["--pdf", pdf_abs_path, "--force"])

    print("\n==================================================")
    print("🎉 [Step 1] 모든 논문의 수집 및 요약이 완료되었습니다! 🎉")
    print("이제 'run_step2_generate_ppt.py'를 실행하여 원하는 논문만 PPT로 만들어보세요.")
    print("==================================================")

if __name__ == "__main__":
    main()
