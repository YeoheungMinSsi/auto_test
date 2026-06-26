import streamlit as st
import os
import json
import subprocess
import glob
import sys

base_dir = os.path.dirname(os.path.abspath(__file__))

# PaperDownloader 모듈 임포트를 위해 경로 추가
paper_summary_dir = os.path.join(base_dir, "paper_summary")
if paper_summary_dir not in sys.path:
    sys.path.append(paper_summary_dir)
try:
    from downloader import PaperDownloader
except ImportError:
    pass

# 페이지 기본 설정
st.set_page_config(page_title="AI 논문 자동화 대시보드", page_icon="📝", layout="wide")

st.title("🌟 AI 논문 수집 및 PPT 자동 생성 대시보드")
st.markdown("로컬 AI 파이프라인을 두 단계로 나누어 세밀하게 제어할 수 있습니다.")

venv_python = os.path.join(base_dir, "venv", "Scripts", "python.exe")

# 공통 실행 함수
def run_script_with_progress(script_path, args, status_text):
    if not os.path.exists(venv_python):
        st.error(f"가상환경 파이썬을 찾을 수 없습니다: {venv_python}")
        return False

    cmd = [venv_python, script_path] + args
    
    with st.status(f"{status_text} 실행 중...", expanded=True) as status:
        st.write(f"명령어: `{' '.join(cmd)}`")
        log_container = st.empty()
        
        try:
            # errors='replace' 추가로 한글 인코딩 깨짐 방지
            process = subprocess.Popen(
                cmd, 
                stdout=subprocess.PIPE, 
                stderr=subprocess.STDOUT, 
                text=True, 
                encoding='utf-8',
                errors='replace'
            )
            
            logs = []
            for line in process.stdout:
                logs.append(line.strip())
                log_container.code("\n".join(logs[-15:]), language="shell")
                
            process.wait()
            
            if process.returncode == 0:
                status.update(label=f"{status_text} 완료! ✅", state="complete", expanded=False)
                return True
            else:
                status.update(label=f"{status_text} 실패 ❌", state="error", expanded=True)
                st.error("오류가 발생했습니다. 위 로그를 확인해주세요.")
                return False
                
        except Exception as e:
            status.update(label=f"{status_text} 실패 ❌", state="error", expanded=True)
            st.error(f"프로세스 실행 중 에러 발생: {str(e)}")
            return False

# 생성된 카테고리 스캔 함수
categories_dir = os.path.join(base_dir, "paper_summary", "categories")
def get_categories():
    if not os.path.exists(categories_dir):
        return []
    cats = []
    for root, dirs, files in os.walk(categories_dir):
        if root != categories_dir:
            rel_path = os.path.relpath(root, categories_dir)
            cats.append(rel_path.replace("\\", "/"))
    return sorted(list(set(cats)))


# 탭 분리
tab1, tab2 = st.tabs(["📥 파이프라인 1: 논문 수집 및 요약", "🎨 파이프라인 2: 이미지 & PPT 제작"])

# ==========================================
# 탭 1: 논문 수집 및 요약
# ==========================================
with tab1:
    st.header("1단계: 원하는 분야 논문 검색 및 자동 수집")
    
    sub_tab1, sub_tab2 = st.tabs(["🔍 1-1. 검색 결과 및 선택적 수집", "🚀 1-2. 분야별 자동 수집 & 요약"])
    
    with sub_tab1:
        st.markdown("키워드로 각 논문 사이트를 검색한 뒤 결과를 살펴보고, 원하는 논문만 선택하여 내 폴더에 수집할 수 있습니다.")
        col_q, col_l, col_s = st.columns([2, 1, 2])
        with col_q:
            q_search = st.text_input("검색 키워드", value="컴퓨터 비전", key="q_search")
        with col_l:
            l_search = st.number_input("가져올 논문 개수", min_value=1, max_value=20, value=5, key="l_search")
        with col_s:
            available_sources = ["arxiv", "scienceon", "riss", "semantic", "openalex", "pmc", "assembly"]
            selected_sources_1 = st.multiselect(
                "검색 대상 사이트", 
                options=available_sources, 
                default=["arxiv", "scienceon"], 
                key="s_sources_1"
            )
            
        if st.button("🔍 각 사이트별 논문 검색", type="primary", key="btn_search_only"):
            if not selected_sources_1:
                st.error("검색 대상 사이트를 최소 하나 이상 선택해야 합니다.")
            else:
                step1_fetch = os.path.join(base_dir, "paper_summary", "fetch_papers.py")
                # fetch_papers는 --category를 요구하므로 임의값 temp 전달
                sources_arg = ",".join(selected_sources_1)
                s1 = run_script_with_progress(
                    step1_fetch,
                    ["--query", q_search, "--category", "temp", "--sources", sources_arg, "--limit", str(l_search), "--search-only"],
                    "논문 탐색 모드 (다운로드 건너뜀)"
                )
                
                if s1:
                    search_tmp_path = os.path.join(base_dir, "paper_summary", "search_results_tmp.json")
                    if os.path.exists(search_tmp_path):
                        with open(search_tmp_path, "r", encoding="utf-8") as f:
                            st.session_state["search_results"] = json.load(f)
                    else:
                        st.error("검색 결과 파일을 찾을 수 없습니다.")

        # 세션 스테이트에 저장된 검색 결과를 개별 리스트 UI로 렌더링
        if "search_results" in st.session_state and st.session_state["search_results"]:
            results = st.session_state["search_results"]
            st.success(f"총 {len(results)}개의 논문이 검색되었습니다.")
            
            # 드롭다운을 위해 최신 카테고리 목록 로드
            cat_list = get_categories()
            # 만약 기존 폴더가 하나도 없으면 기본값 설정
            cat_options = cat_list if cat_list else ["기본폴더"]

            for idx, paper in enumerate(results):
                with st.container():
                    st.markdown(f"#### 📄 {paper.get('title')}")
                    
                    c1, c2, c3 = st.columns([1, 1, 1])
                    with c1:
                        st.write(f"**출처**: {paper.get('source', 'unknown').upper()}")
                        # 원문 링크 표시
                        url = paper.get('url') or paper.get('pdf_url')
                        if url:
                            st.markdown(f"👉 [원문 논문 보기]({url})")
                        else:
                            st.write("원문 링크 없음")
                            
                    with c2:
                        # 저장할 분류 선택
                        selected_cat_for_paper = st.selectbox(
                            "📂 이 논문을 저장할 분류 선택", 
                            options=cat_options, 
                            key=f"cat_select_{idx}"
                        )
                        
                    with c3:
                        # 다운로드 버튼
                        st.write("") # 높이 맞춤용
                        if st.button("📥 다운로드 (수집)", key=f"btn_dl_{idx}", use_container_width=True):
                            downloader = PaperDownloader(base_dir)
                            with st.spinner("다운로드 중..."):
                                success = downloader.download_pdf(paper, selected_cat_for_paper)
                                if success:
                                    st.success("✅ 다운로드 성공! 해당 카테고리에 저장되었습니다.")
                                else:
                                    st.error("❌ 다운로드 실패 (이미 존재하는 논문이거나 오류 발생)")
                    st.divider()

    with sub_tab2:
        st.markdown("기존에 만들어두었던 **분야(카테고리)를 선택**하여, 자동으로 논문을 다운로드하고 요약합니다.")
        
        cat_list = get_categories()
        if not cat_list:
            st.info("기존 분야(폴더)가 없습니다. 먼저 1-1이나 탭 1에서 카테고리를 생성해야 합니다.")
            selected_cat = st.text_input("새 분야(폴더명)", value="science/quantum", key="c_auto")
            default_query = "Quantum Computing"
        else:
            selected_cat = st.selectbox("📂 수집할 분야(카테고리) 선택", cat_list, key="c_auto")
            # 폴더명(예: quantum)을 기본 검색어로 변환
            default_query = os.path.basename(os.path.normpath(selected_cat)).replace("_", " ")
            
        col_qa, col_la = st.columns([3, 1])
        with col_qa:
            q_auto = st.text_input("검색 키워드 (해당 분야에 맞게 수정 가능)", value=default_query, key="q_auto")
        with col_la:
            l_auto = st.number_input("자동 수집/요약할 논문 개수", min_value=1, max_value=10, value=1, key="l_auto")
        
        available_sources = ["arxiv", "scienceon", "riss", "semantic", "openalex", "pmc", "assembly"]
        selected_sources_2 = st.multiselect(
            "검색 대상 사이트", 
            options=available_sources, 
            default=["arxiv", "scienceon"], 
            key="s_sources_2"
        )

        if st.button("🚀 자동 수집 및 AI 요약 시작", type="primary", key="btn_auto_fetch"):
            if not selected_sources_2:
                st.error("검색 대상 사이트를 최소 하나 이상 선택해야 합니다.")
            else:
                step1_fetch = os.path.join(base_dir, "paper_summary", "fetch_papers.py")
                step2_summarize = os.path.join(base_dir, "paper_summary", "summarizer.py")
                
                os.makedirs(os.path.join(categories_dir, selected_cat), exist_ok=True)
                
                # 1. 수집
                sources_arg = ",".join(selected_sources_2)
                s1 = run_script_with_progress(
                    step1_fetch,
                    ["--query", q_auto, "--category", selected_cat, "--sources", sources_arg, "--limit", str(l_auto)],
                    "Step 1: 논문 검색 및 다운로드"
                )
            
            if s1:
                history_file = os.path.join(base_dir, "paper_summary", "collected_papers.json")
                if os.path.exists(history_file):
                    with open(history_file, "r", encoding="utf-8") as f:
                        papers = json.load(f)
                    
                    valid_papers = [p for p in papers if p.get("pdf_path") is not None]
                    if valid_papers:
                        st.success(f"총 {len(valid_papers)}개의 논문을 성공적으로 다운로드했습니다.")
                        
                        # 2. 요약
                        for idx, paper in enumerate(valid_papers):
                            pdf_rel_path = paper.get("pdf_path")
                            pdf_abs_path = os.path.join(base_dir, "paper_summary", pdf_rel_path)
                            title = paper.get("title", "Unknown Title")
                            
                            st.divider()
                            st.subheader(f"📄 요약 진행: {title}")
                            
                            run_script_with_progress(step2_summarize, ["--pdf", pdf_abs_path, "--force"], "Step 2: 로컬 AI 다단계 요약")
                        
                        st.balloons()
                        st.success("🎉 모든 수집 및 요약 작업이 완료되었습니다! 다음 탭에서 PPT를 생성하세요.")
                    else:
                        st.warning("다운로드된 PDF 논문이 없습니다.")

# ==========================================
# 탭 2: 이미지 및 PPT 제작
# ==========================================
with tab2:
    st.header("2단계: 수집된 논문으로 발표 자료(PPT) 자동 생성")
    st.markdown("요약이 완료된 논문을 선택하여 SDXL 기반 이미지를 생성하고, PPT를 제작합니다.")
    
    cat_list2 = get_categories()
    
    if not cat_list2:
        st.info("수집된 논문 폴더가 없습니다. 먼저 탭 1에서 논문을 수집해주세요.")
    else:
        selected_cat2 = st.selectbox("📂 수집된 분야(카테고리) 선택", cat_list2, key="c_ppt")
        
        target_dir = os.path.join(categories_dir, os.path.normpath(selected_cat2))
        json_files = glob.glob(os.path.join(target_dir, "*_summary.json"))
        
        paper_dict = {}
        for jf in json_files:
            try:
                with open(jf, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    title = data.get("title", os.path.basename(jf))
                    paper_dict[title] = jf
            except Exception:
                pass
                
        if not paper_dict:
            st.warning("이 카테고리에는 요약이 완료된 논문(_summary.json)이 없습니다.")
        else:
            selected_title = st.selectbox("📄 논문 선택", list(paper_dict.keys()), key="p_ppt")
            selected_json_path = paper_dict[selected_title]
            
            with st.expander("미리보기: 이 논문의 요약 데이터"):
                with open(selected_json_path, 'r', encoding='utf-8') as f:
                    st.json(json.load(f))
            
            if st.button("✨ 선택한 논문으로 PPT 생성 (Pipeline 2)", type="primary", key="btn_ppt"):
                step3_image = os.path.join(base_dir, "img_generator", "generate_images.py")
                step4_ppt = os.path.join(base_dir, "ppt_generator", "generate_ppt.py")
                
                # 3. 이미지 생성
                s3 = run_script_with_progress(step3_image, ["--json", selected_json_path, "--force"], "Step 3: AI 일러스트 생성")
                if s3:
                    # 4. PPT 생성
                    s4 = run_script_with_progress(step4_ppt, ["--json", selected_json_path], "Step 4: 프레젠테이션(PPT) 제작")
                    if s4:
                        st.balloons()
                        st.success(f"🎉 '{selected_title}' 논문의 PPT 생성이 완료되었습니다!")
                        st.info("프로젝트 폴더 내의 `output` 폴더를 확인해주세요.")
