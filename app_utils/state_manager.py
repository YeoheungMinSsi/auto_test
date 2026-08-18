import json
import os
from datetime import datetime
import uuid

# 상태를 저장할 JSON 파일 경로

def get_state_file(page_id="progress"):
    return os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), f"{page_id}_state.json")

WORKSPACE_STATE_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "workspace_state.json")

def load_workspace_state():
    if not os.path.exists(WORKSPACE_STATE_FILE):
        state = {"workspace_name": "Auto Workspace", "custom_pages": []}
        save_workspace_state(state)
        return state
    try:
        import json
        with open(WORKSPACE_STATE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return {"workspace_name": "Auto Workspace", "custom_pages": []}

def save_workspace_state(state):
    try:
        import json
        with open(WORKSPACE_STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f, ensure_ascii=False, indent=4)
    except Exception as e:
        print(f"Error saving workspace state: {e}")

def update_workspace_name(name):
    state = load_workspace_state()
    state["workspace_name"] = name
    save_workspace_state(state)
    return state

def add_custom_page(title, has_subpages, is_hidden, icon="📄", description=""):
    state = load_workspace_state()
    if "custom_pages" not in state:
        state["custom_pages"] = []
    page_id = "page_" + str(uuid.uuid4())
    new_page = {
        "id": page_id,
        "title": title,
        "has_subpages": has_subpages,
        "is_hidden": is_hidden,
        "icon": icon if icon else "📄",
        "description": description if description else "",
        "created_at": datetime.now().isoformat()
    }
    state["custom_pages"].append(new_page)
    save_workspace_state(state)
    return new_page

def update_custom_page(page_id, title=None, has_subpages=None, is_hidden=None, icon=None, description=None):
    state = load_workspace_state()
    if "custom_pages" not in state:
        return False
    for page in state["custom_pages"]:
        if page["id"] == page_id:
            if title is not None:
                page["title"] = title
            if has_subpages is not None:
                page["has_subpages"] = has_subpages
            if is_hidden is not None:
                page["is_hidden"] = is_hidden
            if icon is not None:
                page["icon"] = icon
            if description is not None:
                page["description"] = description
            save_workspace_state(state)
            return True
    return False

def delete_custom_page(page_id):
    state = load_workspace_state()
    if "custom_pages" not in state:
        return False
    original_len = len(state["custom_pages"])
    state["custom_pages"] = [p for p in state["custom_pages"] if p["id"] != page_id]
    if len(state["custom_pages"]) < original_len:
        save_workspace_state(state)
        state_file = get_state_file(page_id)
        if os.path.exists(state_file):
            try:
                os.remove(state_file)
            except:
                pass
        return True
    return False

def load_state(page_id="progress"):
    state_file = get_state_file(page_id)
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
    
    if not os.path.exists(state_file):
        state = {"projects": {}}
    else:
        try:
            with open(state_file, "r", encoding="utf-8") as f:
                state = json.load(f)
                if "projects" not in state:
                    state = {"projects": {}}
        except Exception:
            state = {"projects": {}}
            
    updated = False
    
    # "progress" 페이지(기본 홈)일 때만 디폴트 프로젝트 2개를 생성
    if page_id == "progress":
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
                "### 🛠️ 2. 사용 기술 상세 설명 (Tech Stack Guide)\n"
                "- **Streamlit (Frontend/Backend)**\n"
                "  - *개념*: 파이썬(Python) 코드만으로 간편하게 웹 애플리케이션을 만들 수 있게 해주는 프레임워크입니다.\n"
                "  - *쉽게 말해*: 복잡한 웹 디자인 언어(HTML, CSS, JS) 없이도 파이썬 스크립트만으로 직관적이고 멋진 웹 대시보드 화면을 뚝딱 만들게 해주는 도구입니다.\n"
                "- **Strapi (Headless CMS)**\n"
                "  - *개념*: **CMS(Content Management System)**는 글이나 이미지 등의 콘텐츠를 쉽게 등록하고 관리할 수 있도록 해주는 시스템입니다. Strapi는 그 중에서도 웹 화면을 배제하고 오직 데이터 저장과 관리 기능만을 API 형태로 전문 공급하는 'Headless CMS'입니다.\n"
                "  - *쉽게 말해*: 네이버 블로그의 글쓰기/관리자 화면처럼 웹에서 간편하게 글을 적으면, 이를 안전하게 저장해 두었다가 필요할 때 Streamlit 화면으로 가져다 쓸 수 있게 중개해주는 서비스입니다.\n"
                "- **SQLite (Database)**\n"
                "  - *개념*: 서버 설치 없이 파일 하나로 가볍게 작동하는 파일 기반 관계형 데이터베이스입니다.\n"
                "  - *쉽게 말해*: 복잡한 데이터베이스 서버 프로그램을 별도로 띄울 필요 없이, 로컬 환경에서 하나의 파일 형태로 블로그 포스트 정보들을 안전하고 신속하게 읽고 쓰며 기록해주는 보관함 역할을 합니다.\n\n"
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
        
    # 기존 프로젝트들에 'documents'가 없는 경우, 'description'을 첫 번째 문서(마크다운 블록)로 마이그레이션
    for pid, proj in state["projects"].items():
        if "documents" not in proj:
            proj["documents"] = {}
            desc_content = proj.get("description", "").strip()
            
            doc_id = str(uuid.uuid4())
            proj["documents"][doc_id] = {
                "id": doc_id,
                "title": "📜 기본 기획서 및 설명",
                "parent_id": None,
                "created_at": proj.get("created_at", datetime.now().isoformat()),
                "blocks": [
                    {
                        "id": str(uuid.uuid4()),
                        "type": "text",
                        "content": desc_content if desc_content else "새로운 페이지 내용을 입력하세요."
                    }
                ]
            }
            updated = True

    if updated:
        save_state(state, page_id)
        
    return state

def save_state(state, page_id="progress"):
    try:
        state_file = get_state_file(page_id)
        with open(state_file, "w", encoding="utf-8") as f:
            json.dump(state, f, ensure_ascii=False, indent=4)
    except Exception as e:
        print(f"Error saving state: {e}")

def add_project(name, description="", page_id="progress"):
    """새로운 일반 프로젝트(Todo/Plan)를 추가합니다."""
    state = load_state(page_id)
    project_id = str(uuid.uuid4())
    
    state["projects"][project_id] = {
        "id": project_id,
        "name": name,
        "description": description,
        "status": "계획 중", # 계획 중, 진행 중, 완료
        "created_at": datetime.now().isoformat(),
        "tasks": [] # 각 요소는 {"id": "uuid", "title": "할 일", "completed": False} 형태
    }
    
    save_state(state, page_id)
    return project_id

def delete_project(project_id, page_id="progress"):
    state = load_state(page_id)
    if project_id in state["projects"]:
        del state["projects"][project_id]
        save_state(state, page_id)
        return True
    return False

def update_project(project_id, name=None, description=None, status=None, page_id="progress"):
    """프로젝트 메타데이터 수정"""
    state = load_state(page_id)
    if project_id in state["projects"]:
        if name is not None:
            state["projects"][project_id]["name"] = name
        if description is not None:
            state["projects"][project_id]["description"] = description
        if status is not None:
            state["projects"][project_id]["status"] = status
        save_state(state, page_id)
        return True
    return False

def get_projects(page_id="progress"):
    """모든 프로젝트를 최신순으로 가져옵니다."""
    state = load_state(page_id)
    projects = list(state["projects"].values())
    projects.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return projects

def get_project(project_id, page_id="progress"):
    state = load_state(page_id)
    return state["projects"].get(project_id)

def add_task(project_id, title, page_id="progress"):
    """프로젝트에 새로운 할 일 추가"""
    state = load_state(page_id)
    if project_id in state["projects"]:
        task_id = str(uuid.uuid4())
        state["projects"][project_id]["tasks"].append({
            "id": task_id,
            "title": title,
            "completed": False
        })
        save_state(state, page_id)
        return task_id
    return None

def toggle_task(project_id, task_id, completed, page_id="progress"):
    """할 일 완료 여부 토글"""
    state = load_state(page_id)
    if project_id in state["projects"]:
        for task in state["projects"][project_id]["tasks"]:
            if task["id"] == task_id:
                task["completed"] = completed
                save_state(state, page_id)
                return True
    return False

def delete_task(project_id, task_id, page_id="progress"):
    """할 일 삭제"""
    state = load_state(page_id)
    if project_id in state["projects"]:
        original_len = len(state["projects"][project_id]["tasks"])
        state["projects"][project_id]["tasks"] = [
            t for t in state["projects"][project_id]["tasks"] if t["id"] != task_id
        ]
        if len(state["projects"][project_id]["tasks"]) < original_len:
            save_state(state, page_id)
            return True
    return False

def add_document(project_id, title, parent_id=None, page_id="progress"):
    """프로젝트 내에 새로운 문서를 추가하고 기본 텍스트 블록을 하나 생성합니다."""
    state = load_state(page_id)
    if project_id in state["projects"]:
        doc_id = str(uuid.uuid4())
        default_block = {
            "id": str(uuid.uuid4()),
            "type": "text",
            "content": ""
        }
        
        if "documents" not in state["projects"][project_id]:
            state["projects"][project_id]["documents"] = {}
            
        state["projects"][project_id]["documents"][doc_id] = {
            "id": doc_id,
            "title": title,
            "parent_id": parent_id,
            "created_at": datetime.now().isoformat(),
            "blocks": [default_block]
        }
        save_state(state, page_id)
        return doc_id
    return None

def delete_document(project_id, doc_id, page_id="progress"):
    """문서를 삭제하며, 해당 문서의 모든 하위 문서도 연쇄 삭제합니다."""
    state = load_state(page_id)
    if project_id in state["projects"] and "documents" in state["projects"][project_id]:
        docs = state["projects"][project_id]["documents"]
        if doc_id in docs:
            to_delete = {doc_id}
            queue = [doc_id]
            while queue:
                current_id = queue.pop(0)
                for d_id, d_val in list(docs.items()):
                    if d_val.get("parent_id") == current_id:
                        if d_id not in to_delete:
                            to_delete.add(d_id)
                            queue.append(d_id)
            
            for target_id in to_delete:
                if target_id in docs:
                    del docs[target_id]
                    
            save_state(state, page_id)
            return True
    return False

def update_document_title(project_id, doc_id, title, page_id="progress"):
    """문서의 제목을 수정합니다."""
    state = load_state(page_id)
    if project_id in state["projects"] and "documents" in state["projects"][project_id]:
        docs = state["projects"][project_id]["documents"]
        if doc_id in docs:
            docs[doc_id]["title"] = title
            save_state(state, page_id)
            return True
    return False

def add_block(project_id, doc_id, block_type, content=None, after_block_id=None, page_id="progress"):
    """문서 내 특정 블록 뒤 또는 맨 뒤에 새로운 블록을 추가합니다."""
    state = load_state(page_id)
    if project_id in state["projects"] and "documents" in state["projects"][project_id]:
        docs = state["projects"][project_id]["documents"]
        if doc_id in docs:
            block_id = str(uuid.uuid4())
            if content is None:
                if block_type == "text":
                    content = ""
                elif block_type == "code":
                    content = "print('Hello World')"
                elif block_type == "table":
                    content = [["헤더1", "헤더2"], ["", ""]]
                else:
                    content = ""
                    
            new_block = {
                "id": block_id,
                "type": block_type,
                "content": content
            }
            
            blocks = docs[doc_id].setdefault("blocks", [])
            if after_block_id:
                idx = -1
                for i, b in enumerate(blocks):
                    if b["id"] == after_block_id:
                        idx = i
                        break
                if idx != -1:
                    blocks.insert(idx + 1, new_block)
                else:
                    blocks.append(new_block)
            else:
                blocks.append(new_block)
                
            save_state(state, page_id)
            return block_id
    return None

def update_block(project_id, doc_id, block_id, content, page_id="progress"):
    """문서 내 특정 블록의 내용을 갱신합니다."""
    state = load_state(page_id)
    if project_id in state["projects"] and "documents" in state["projects"][project_id]:
        docs = state["projects"][project_id]["documents"]
        if doc_id in docs:
            blocks = docs[doc_id].get("blocks", [])
            for b in blocks:
                if b["id"] == block_id:
                    b["content"] = content
                    save_state(state, page_id)
                    return True
    return False

def delete_block(project_id, doc_id, block_id, page_id="progress"):
    """문서 내 특정 블록을 삭제합니다."""
    state = load_state(page_id)
    if project_id in state["projects"] and "documents" in state["projects"][project_id]:
        docs = state["projects"][project_id]["documents"]
        if doc_id in docs:
            blocks = docs[doc_id].get("blocks", [])
            for i, b in enumerate(blocks):
                if b["id"] == block_id:
                    blocks.pop(i)
                    save_state(state, page_id)
                    return True
    return False

def move_block(project_id, doc_id, block_id, direction, page_id="progress"):
    """문서 내 특정 블록의 위치를 위/아래로 이동합니다."""
    state = load_state(page_id)
    if project_id in state["projects"] and "documents" in state["projects"][project_id]:
        docs = state["projects"][project_id]["documents"]
        if doc_id in docs:
            blocks = docs[doc_id].get("blocks", [])
            idx = -1
            for i, b in enumerate(blocks):
                if b["id"] == block_id:
                    idx = i
                    break
            if idx == -1:
                return False
            if direction == "up" and idx > 0:
                blocks[idx], blocks[idx - 1] = blocks[idx - 1], blocks[idx]
                save_state(state, page_id)
                return True
            elif direction == "down" and idx < len(blocks) - 1:
                blocks[idx], blocks[idx + 1] = blocks[idx + 1], blocks[idx]
                save_state(state, page_id)
                return True
    return False
