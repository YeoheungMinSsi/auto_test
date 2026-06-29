import json
import os
from datetime import datetime
import uuid

# 상태를 저장할 JSON 파일 경로
STATE_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "progress_state.json")

def load_state():
    default_plan = (
        "### 📑 1. 계획 (Implementation Plan)\n"
        "- **논문 수집 엔진 개발**: 다양한 학술 데이터베이스(Arxiv, ScienceOn 등) API 연동 및 논문 검색 기능 설계\n"
        "- **AI 요약 파이프라인**: 수집된 논문 PDF에서 텍스트를 추출하고 LLM을 활용해 초록/본문 요약 수행\n"
        "- **PPT 자동 생성**: 요약 텍스트와 AI 이미지(SDXL)를 결합하여 구조화된 발표용 파워포인트 슬라이드 제작\n"
        "- **Strapi 연동**: 로컬 DB에 수집한 데이터와 요약본을 실시간 동기화하여 보관함 형태로 제공\n\n"
        "### ⚙️ 2. 주요 기능 계획\n"
        "- 논문 검색 및 파일 다운로드\n"
        "- 다단계 요약 알고리즘\n"
        "- PPT 파일 자동 다운로드 제공\n"
        "- Strapi 기반의 웹 보관함 대시보드"
    )
    
    if not os.path.exists(STATE_FILE):
        state = {"projects": {}}
    else:
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                state = json.load(f)
                if "projects" not in state:
                    state = {"projects": {}}
        except Exception:
            state = {"projects": {}}
            
    updated = False
    
    # "default-paper-automation" 프로젝트가 없으면 기본으로 추가
    if "default-paper-automation" not in state["projects"]:
        state["projects"]["default-paper-automation"] = {
            "id": "default-paper-automation",
            "name": "논문 자동화",
            "description": default_plan,
            "status": "진행 중",
            "created_at": "2026-06-26T12:00:00.000000",
            "tasks": [
                {"id": "def-task-1", "title": "Arxiv 및 학술 API 검색 및 다운로드 로직 개발", "completed": True},
                {"id": "def-task-2", "title": "LLM 요약(Summarizer.py) 파이프라인 구축", "completed": True},
                {"id": "def-task-3", "title": "SDXL 기반 발표 자료 삽입용 이미지 생성 엔진 개발", "completed": True},
                {"id": "def-task-4", "title": "python-pptx 활용 PPT 자동 생성 기능 구현", "completed": True},
                {"id": "def-task-5", "title": "Strapi 백엔드 및 API 연동 동기화 완료", "completed": True},
                {"id": "def-task-6", "title": "Streamlit 기반 대시보드 내비게이션 통합", "completed": True}
            ]
        }
        updated = True

    # "default-blog-homepage" 프로젝트가 없으면 기본으로 추가
    if "default-blog-homepage" not in state["projects"]:
        default_blog_plan = (
            "### 📑 1. 계획 (Implementation Plan)\n"
            "- **프론트엔드 UI 디자인 (Streamlit)**: 파이썬 기반 Streamlit을 활용하여 모던하고 반응형인 블로그형 레이아웃 및 카드 그리드 설계\n"
            "- **콘텐츠 관리 시스템 (Strapi CMS 연동)**: Strapi 백엔드에서 작성한 포스팅 목록과 상세 내용을 REST API로 실시간 호출\n"
            "- **검색 및 태그 필터링**: Streamlit의 셀렉트박스 및 검색창 컴포넌트를 이용해 실시간 검색 및 카테고리 태그 필터 기능 제공\n"
            "- **배포 및 최적화**: Streamlit 대시보드 환경에 맞는 캐싱(st.cache_data) 및 모바일/데스크톱 화면 최적화 적용\n\n"
            "### 🛠️ 2. 사용 기술 (Tech Stack)\n"
            "- **Frontend/Backend**: Streamlit (Python)\n"
            "- **CMS**: Strapi (Headless CMS)\n"
            "- **Database**: SQLite\n"
            "- **Deployment**: Streamlit Cloud / Local Python Environment\n\n"
            "### ⚙️ 3. 주요 기능 계획\n"
            "- Streamlit 마크다운 렌더링(st.markdown)을 활용한 블로그 포스팅 CRUD 연동\n"
            "- Strapi REST API 연동을 통한 실시간 데이터 송수신\n"
            "- 카테고리별 태그 분류 및 검색 기능\n"
            "- Streamlit의 모바일 및 데스크톱 반응형 레이아웃 최적화"
        )
        state["projects"]["default-blog-homepage"] = {
            "id": "default-blog-homepage",
            "name": "블로그식 홈페이지",
            "description": default_blog_plan,
            "status": "진행 중",
            "created_at": "2026-06-26T11:59:00.000000",
            "tasks": [
                {"id": "blog-task-1", "title": "Streamlit 프로젝트 초기화 및 레이아웃 구성", "completed": True},
                {"id": "blog-task-2", "title": "Strapi 백엔드 연동 및 Post API 연동 완료", "completed": True},
                {"id": "blog-task-3", "title": "st.markdown을 활용한 마크다운 본문 렌더링 구현", "completed": True},
                {"id": "blog-task-4", "title": "블로그 포스팅 목록 카드형 UI 및 상세 페이지 라우팅 구현", "completed": True},
                {"id": "blog-task-5", "title": "카테고리 태그 분류 및 실시간 검색 필터링 구현", "completed": True},
                {"id": "blog-task-6", "title": "Streamlit 내비게이션(st.navigation) 연동 및 정리", "completed": True},
                {"id": "blog-task-7", "title": "캐싱(st.cache_data) 최적화 및 최종 배포 점검", "completed": False}
            ]
        }
        updated = True
        
    if updated:
        save_state(state)
        
    return state

def save_state(state):
    try:
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f, ensure_ascii=False, indent=4)
    except Exception as e:
        print(f"Error saving state: {e}")

def add_project(name, description=""):
    """새로운 일반 프로젝트(Todo/Plan)를 추가합니다."""
    state = load_state()
    project_id = str(uuid.uuid4())
    
    state["projects"][project_id] = {
        "id": project_id,
        "name": name,
        "description": description,
        "status": "계획 중", # 계획 중, 진행 중, 완료
        "created_at": datetime.now().isoformat(),
        "tasks": [] # 각 요소는 {"id": "uuid", "title": "할 일", "completed": False} 형태
    }
    
    save_state(state)
    return project_id

def delete_project(project_id):
    state = load_state()
    if project_id in state["projects"]:
        del state["projects"][project_id]
        save_state(state)
        return True
    return False

def update_project(project_id, name=None, description=None, status=None):
    """프로젝트 메타데이터 수정"""
    state = load_state()
    if project_id in state["projects"]:
        if name is not None:
            state["projects"][project_id]["name"] = name
        if description is not None:
            state["projects"][project_id]["description"] = description
        if status is not None:
            state["projects"][project_id]["status"] = status
        save_state(state)
        return True
    return False

def get_projects():
    """모든 프로젝트를 최신순으로 가져옵니다."""
    state = load_state()
    projects = list(state["projects"].values())
    projects.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return projects

def get_project(project_id):
    state = load_state()
    return state["projects"].get(project_id)

def add_task(project_id, title):
    """프로젝트에 새로운 할 일 추가"""
    state = load_state()
    if project_id in state["projects"]:
        task_id = str(uuid.uuid4())
        state["projects"][project_id]["tasks"].append({
            "id": task_id,
            "title": title,
            "completed": False
        })
        save_state(state)
        return task_id
    return None

def toggle_task(project_id, task_id, completed):
    """할 일 완료 여부 토글"""
    state = load_state()
    if project_id in state["projects"]:
        for task in state["projects"][project_id]["tasks"]:
            if task["id"] == task_id:
                task["completed"] = completed
                save_state(state)
                return True
    return False

def delete_task(project_id, task_id):
    """할 일 삭제"""
    state = load_state()
    if project_id in state["projects"]:
        original_len = len(state["projects"][project_id]["tasks"])
        state["projects"][project_id]["tasks"] = [
            t for t in state["projects"][project_id]["tasks"] if t["id"] != task_id
        ]
        if len(state["projects"][project_id]["tasks"]) < original_len:
            save_state(state)
            return True
    return False
