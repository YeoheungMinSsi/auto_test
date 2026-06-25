import os
import json
import subprocess
import sys
import glob

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
    
    step3_image = os.path.join(base_dir, "img_generator", "generate_images.py")
    step4_ppt = os.path.join(base_dir, "ppt_generator", "generate_ppt.py")

    print("==================================================")
    print("🌟 [Step 2] 논문 선택 및 PPT/이미지 자동 생성 🌟")
    print("==================================================\n")

    # 1. 요약 완료된 JSON 파일 검색
    summary_dir = os.path.join(base_dir, "paper_summary", "categories")
    json_files = glob.glob(os.path.join(summary_dir, "**", "*_summary.json"), recursive=True)
    
    if not json_files:
        print("요약된 논문(JSON 파일)을 찾을 수 없습니다. 먼저 run_step1_summarize.py를 실행하세요.")
        return

    # 2. 요약된 논문 목록 출력
    print("[ 요약 완료된 논문 목록 ]")
    summaries = []
    for idx, j_path in enumerate(json_files):
        try:
            with open(j_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                k_title = data.get("korean_title", "제목 없음")
                summaries.append({"path": j_path, "title": k_title})
                print(f"{idx + 1}. {k_title}")
        except Exception as e:
            print(f"{idx + 1}. [오류] {os.path.basename(j_path)} 읽기 실패")
            summaries.append({"path": j_path, "title": "읽기 실패"})

    # 3. 사용자 입력 받기
    print("\nPPT와 이미지를 생성할 논문의 번호를 입력하세요.")
    print("사용 예시:")
    print(" - 특정 논문 선택: 1, 3")
    print(" - 범위 선택: 1-3")
    print(" - 전체 선택: all")
    
    try:
        user_input = input("입력: ").strip().lower()
    except EOFError:
        print("입력을 받을 수 없는 환경입니다.")
        return

    if not user_input:
        print("입력이 없어 작업을 취소합니다.")
        return

    # 4. 입력 파싱
    selected_indices = set()
    if user_input == "all":
        selected_indices = set(range(len(summaries)))
    else:
        parts = user_input.replace(" ", "").split(",")
        for part in parts:
            if "-" in part:
                try:
                    start, end = map(int, part.split("-"))
                    selected_indices.update(range(start - 1, end))
                except ValueError:
                    pass
            else:
                try:
                    selected_indices.add(int(part) - 1)
                except ValueError:
                    pass

    selected_summaries = [summaries[i] for i in selected_indices if 0 <= i < len(summaries) and summaries[i]["title"] != "읽기 실패"]
    
    if not selected_summaries:
        print("선택된 유효한 논문이 없습니다. 올바른 번호를 입력했는지 확인하세요.")
        return

    print(f"\n총 {len(selected_summaries)}개의 논문이 선택되었습니다. 생성 작업을 시작합니다...\n")

    # 5. 선택된 논문들에 대해 이미지 생성 및 PPT 생성 수행
    for idx, item in enumerate(selected_summaries):
        print(f"\n▶ [{idx+1}/{len(selected_summaries)}] 작업 중: {item['title']}")
        
        json_path = item["path"]
        
        # Step 3: SDXL 이미지 생성 (강제 덮어쓰기)
        run_script(step3_image, ["--json", json_path, "--force"])
        
        # Step 4: 개별 PPT 생성
        run_script(step4_ppt, ["--json", json_path])

    print("\n==================================================")
    print("🎉 선택하신 논문의 이미지 및 PPT 생성이 모두 완료되었습니다! 🎉")
    print(f"결과물 폴더: {os.path.join(base_dir, 'output')} 에서 확인해주세요.")
    print("==================================================")

if __name__ == "__main__":
    main()
