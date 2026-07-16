import streamlit as st
import os
import sys
import pandas as pd
import html
import re

def strip_tags(text):
    if not text:
        return ""
    # 간단한 태그 제거 및 HTML 엔티티 제거
    clean = re.compile('<.*?>')
    text = re.sub(clean, '', text)
    text = html.unescape(text).strip()
    # 보이지 않는 공백류(Zero-width 등) 제거
    text = text.replace('​', '')
    return text

# 상태 관리 모듈 경로 추가
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)

import importlib
try:
    import app_utils.state_manager
    importlib.reload(app_utils.state_manager)
except ImportError:
    pass

try:
    from app_utils.state_manager import (
        get_project,
        update_project,
        add_task,
        toggle_task,
        delete_task,
        add_document,
        delete_document,
        update_document_title,
        add_block,
        update_block,
        delete_block,
        move_block
    )
except ImportError as e:
    st.error(f"상태 관리 모듈(app_utils/state_manager.py)을 불러올 수 없습니다. 오류: {e}")
    import traceback
    st.code(traceback.format_exc())
    st.stop()

# 외부 리치 에디터 및 코드 에디터 로드
try:
    from streamlit_quill import st_quill
except ImportError:
    st.error("streamlit_quill 라이브러리를 불러올 수 없습니다. 터미널에서 pip install을 확인해 주세요.")
    st.stop()

try:
    from streamlit_ace import st_ace
except ImportError:
    st.error("streamlit_ace 라이브러리를 불러올 수 없습니다. 터미널에서 pip install을 확인해 주세요.")
    st.stop()


def render_tree(docs, project_id, parent_id=None, level=0):
    """문서 트리 목록을 계층적으로 렌더링합니다."""
    for doc_id, doc in list(docs.items()):
        if doc.get("parent_id") == parent_id:
            # 트리 인덴트 및 노드 간 정렬
            indent = "  " * level
            
            col_btn, col_opt = st.columns([5, 1.5])
            with col_btn:
                is_selected = st.session_state.get("selected_doc_id") == doc_id
                btn_label = f"{indent}👉 {doc['title']}" if is_selected else f"{indent}📄 {doc['title']}"
                
                # 버튼 클릭 시 해당 문서 보기
                if st.button(btn_label, key=f"select_{doc_id}", use_container_width=True):
                    st.session_state["selected_doc_id"] = doc_id
                    st.rerun()
            with col_opt:
                # 개별 문서 관리 메뉴 (이름수정 / 하위추가 / 삭제)
                with st.popover("⚙️", key=f"actions_{doc_id}", use_container_width=True):
                    st.markdown(f"**⚙️ '{doc['title']}' 설정**")
                    
                    # 제목 수정
                    new_title = st.text_input("제목 변경", value=doc['title'], key=f"rename_input_{doc_id}")
                    if st.button("변경 적용", key=f"btn_rename_{doc_id}", use_container_width=True):
                        if new_title.strip():
                            update_document_title(project_id, doc_id, new_title.strip())
                            # 만약 선택중인 문서면 갱신되도록 세션 상태 재조정
                            st.success("제목이 변경되었습니다.")
                            st.rerun()
                            
                    st.divider()
                    
                    # 하위 문서 추가
                    sub_title = st.text_input("하위 페이지 추가", key=f"sub_title_input_{doc_id}", placeholder="페이지 제목")
                    if st.button("➕ 하위 문서 생성", key=f"btn_add_sub_{doc_id}", use_container_width=True):
                        if sub_title.strip():
                            new_sub_id = add_document(project_id, sub_title.strip(), parent_id=doc_id)
                            st.session_state["selected_doc_id"] = new_sub_id
                            st.success("하위 문서가 생성되었습니다!")
                            st.rerun()
                            
                    st.divider()
                    
                    # 문서 삭제
                    if st.button("🗑️ 이 문서 삭제", key=f"btn_del_doc_{doc_id}", type="primary", use_container_width=True):
                        delete_document(project_id, doc_id)
                        if st.session_state.get("selected_doc_id") == doc_id:
                            st.session_state["selected_doc_id"] = None
                        st.success("문서가 삭제되었습니다.")
                        st.rerun()
            
            # 재귀적으로 자식 문서 렌더링
            render_tree(docs, project_id, parent_id=doc_id, level=level + 1)


def show():
    # URL 쿼리 파라미터에서 project_id가 넘어왔을 경우 session_state에 저장
    qp = st.query_params
    if "project_id" in qp:
        st.session_state["selected_project_id"] = qp["project_id"]

    if "selected_project_id" not in st.session_state:
        st.warning("선택된 프로젝트가 없습니다. 진행 상황 페이지로 돌아가주세요.")
        if st.button("⬅️ 돌아가기"):
            st.switch_page("pages/progress.py")
        return
        
    project_id = st.session_state["selected_project_id"]
    project = get_project(project_id)
    
    if not project:
        st.error("해당 프로젝트를 찾을 수 없습니다.")
        if st.button("⬅️ 돌아가기"):
            st.switch_page("pages/progress.py")
        return
        
    # 헤더 영역
    header_col1, header_col2 = st.columns([5, 1.2])
    with header_col1:
        st.title(f"📁 {project['name']}")
    with header_col2:
        st.write("")
        st.write("")
        if st.button("⬅️ 목록으로 돌아가기", use_container_width=True):
            st.switch_page("pages/progress.py")
            
    st.divider()

    # 문서와 Todo List를 보드 탭으로 이원화
    tab_workspace, tab_todos = st.tabs(["📄 문서 작업 공간 (Workspace)", "✅ Todo List"])

    # ------------------ 탭 1: 문서 작업 공간 ------------------
    with tab_workspace:
        # 좌측 문서 사이드바 (3), 우측 본문 에디터 (9)
        ws_col_left, ws_col_right = st.columns([3.5, 8.5])
        
        # 좌측: 문서 목록 트리 구조 영역
        with ws_col_left:
            st.subheader("📑 문서 트리")
            
            # 루트 문서는 프로젝트 생성 시 기본 제공되며, 이후 하위 문서 생성을 통해 구조화됩니다.
            
            # 프로젝트에 속한 문서들 트리 렌더링
            docs = project.get("documents", {})
            if not docs:
                st.info("작성된 문서가 없습니다.")
            else:
                render_tree(docs, project_id, parent_id=None, level=0)
                
        # 우측: 문서 블록 렌더러 및 에디터 영역
        with ws_col_right:
            selected_doc_id = st.session_state.get("selected_doc_id")
            
            if not selected_doc_id or selected_doc_id not in docs:
                st.info("👈 좌측 문서 트리에서 편집하거나 읽고 싶은 문서를 선택해 주세요.")
            else:
                doc = docs[selected_doc_id]
                
                # 상단 헤더
                st.subheader(f"📜 {doc['title']}")
                
                st.write("")
                
                blocks = doc.get("blocks", [])
                
                if not blocks:
                    st.warning("이 문서에는 블록이 없습니다. 아래 버튼으로 블록을 추가하세요.")
                else:
                    # 각 블록 순회하며 렌더링
                    for idx, block in enumerate(blocks):
                        block_id = block["id"]
                        b_type = block["type"]
                        b_content = block["content"]
                        
                        st.caption(f"🧱 블록 #{idx + 1} ({b_type.upper()})")
                        
                        # [1] 렌더링 & 입력 처리 영역
                        if b_type == "text":
                            # streamlit-quill 편집
                            updated_val = st_quill(value=b_content, key=f"quill_{block_id}", html=True)
                            if updated_val != b_content:
                                plain_text = strip_tags(updated_val)
                                
                                # 노션식 인라인 커맨드 인터셉트
                                if plain_text == "/표":
                                    # 명령어 지우기 (블록을 아예 비움)
                                    update_block(project_id, selected_doc_id, block_id, "")
                                    add_block(project_id, selected_doc_id, "table", after_block_id=block_id)
                                    st.rerun()
                                elif plain_text == "/코드":
                                    update_block(project_id, selected_doc_id, block_id, "")
                                    add_block(project_id, selected_doc_id, "code", after_block_id=block_id)
                                    st.rerun()
                                elif plain_text.startswith("/페이지"):
                                    title_part = plain_text.replace("/페이지", "").strip()
                                    new_title = title_part if title_part else "새 하위 페이지"
                                    # 현재 블록을 링크로 변경
                                    update_block(project_id, selected_doc_id, block_id, f"<p>📄 <b>하위 페이지: {html.escape(new_title)}</b></p>")
                                    new_doc_id = add_document(project_id, new_title, parent_id=selected_doc_id)
                                    st.session_state["selected_doc_id"] = new_doc_id
                                    st.rerun()
                                elif plain_text.startswith("- "):
                                    # - 입력 시 글머리 변환 (단일 블록 내에서 변환)
                                    content_part = plain_text[2:].strip()
                                    new_content = f"<ul><li>{html.escape(content_part)}</li></ul>"
                                    update_block(project_id, selected_doc_id, block_id, new_content)
                                    st.rerun()
                                else:
                                    update_block(project_id, selected_doc_id, block_id, updated_val)
                                    st.rerun()
                                
                        elif b_type == "code":
                            # streamlit-ace 편집
                            updated_val = st_ace(value=b_content, language="python", theme="monokai", key=f"ace_{block_id}")
                            if updated_val != b_content:
                                update_block(project_id, selected_doc_id, block_id, updated_val)
                                st.rerun()
                                
                        elif b_type == "table":
                            # st.data_editor 편집
                            # list of lists -> DataFrame 변환
                            try:
                                if len(b_content) > 0:
                                    headers = b_content[0]
                                    rows = b_content[1:]
                                    df = pd.DataFrame(rows, columns=headers)
                                else:
                                    df = pd.DataFrame([["", ""]], columns=["헤더1", "헤더2"])
                            except Exception:
                                df = pd.DataFrame([["", ""]], columns=["헤더1", "헤더2"])
                                
                            edited_df = st.data_editor(df, key=f"editor_df_{block_id}", num_rows="dynamic", use_container_width=True)
                            
                            # DataFrame -> list of lists 변환 후 저장
                            try:
                                new_headers = edited_df.columns.tolist()
                                new_rows = edited_df.values.tolist()
                                new_tbl = [new_headers] + new_rows
                                if new_tbl != b_content:
                                    update_block(project_id, selected_doc_id, block_id, new_tbl)
                                    st.rerun()
                            except Exception:
                                pass
                                
                        # [2] 블록 조작 컨트롤 툴바
                        ctrl_col1, ctrl_col2, ctrl_col3, ctrl_col4 = st.columns([1, 1, 1, 5])
                        with ctrl_col1:
                            if st.button("▲", key=f"btn_up_{block_id}", disabled=(idx == 0), help="위로 이동", use_container_width=True):
                                move_block(project_id, selected_doc_id, block_id, "up")
                                st.rerun()
                        with ctrl_col2:
                            if st.button("▼", key=f"btn_down_{block_id}", disabled=(idx == len(blocks) - 1), help="아래로 이동", use_container_width=True):
                                move_block(project_id, selected_doc_id, block_id, "down")
                                st.rerun()
                        with ctrl_col3:
                            if st.button("🗑️", key=f"btn_del_b_{block_id}", type="primary", help="삭제", use_container_width=True):
                                delete_block(project_id, selected_doc_id, block_id)
                                st.rerun()
                                
                        st.write("") # 블록 간 구분용 가벼운 공백

                    # 문서 끝에 블록을 이어가기 위한 보조 버튼 (노션 엔터키 대용)
                    if not blocks or blocks[-1]["type"] != "text" or strip_tags(blocks[-1]["content"]) != "":
                        if st.button("➕ 클릭하여 아래에 계속 작성하기", use_container_width=True):
                            add_block(project_id, selected_doc_id, "text")
                            st.rerun()

    # ------------------ 탭 2: Todo List 관리 ------------------
    with tab_todos:
        st.subheader("✅ Todo List")
        
        # 할 일 추가 폼
        with st.form(key="add_task_form", clear_on_submit=True):
            col1, col2 = st.columns([4, 1])
            with col1:
                new_task_title = st.text_input("새로운 할 일 입력", placeholder="예: UI 레이아웃 설계하기", label_visibility="collapsed")
            with col2:
                submit = st.form_submit_button("추가", use_container_width=True)
                
            if submit:
                if new_task_title.strip():
                    add_task(project_id, new_task_title.strip())
                    st.rerun()
                else:
                    st.error("내용을 입력해주세요.")
                    
        st.write("")
        
        tasks = project.get("tasks", [])
        if not tasks:
            st.info("아직 등록된 할 일이 없습니다.")
        else:
            for idx, task in enumerate(tasks):
                col_check, col_title, col_del = st.columns([1, 8, 1])
                with col_check:
                    # 체크박스 토글
                    is_checked = st.checkbox("", value=task["completed"], key=f"check_{task['id']}")
                    if is_checked != task["completed"]:
                        toggle_task(project_id, task["id"], is_checked)
                        st.rerun()
                        
                with col_title:
                    if task["completed"]:
                        st.markdown(f"~~{task['title']}~~")
                    else:
                        st.markdown(task['title'])
                        
                with col_del:
                    if st.button("❌", key=f"del_{task['id']}", help="삭제"):
                        delete_task(project_id, task["id"])
                        st.rerun()
                        
        st.write("")

show()
