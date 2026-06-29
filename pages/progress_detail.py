import streamlit as st
import os
import sys

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
        delete_task
    )
except ImportError as e:
    st.error(f"상태 관리 모듈(app_utils/state_manager.py)을 불러올 수 없습니다. 오류: {e}")
    import traceback
    st.code(traceback.format_exc())
    st.stop()

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
        
    st.title(f"🔍 진행 상황 - {project['name']}")
    
    if st.button("⬅️ 목록으로 돌아가기"):
        st.switch_page("pages/progress.py")
        
    st.divider()
    
    # 1. 프로젝트 설명 / Implementation Plan 영역
    st.subheader("📝 프로젝트 상세 설명 (Implementation Plan)")
    with st.expander("설명 수정하기"):
        new_desc = st.text_area("내용", value=project.get("description", ""), height=150, key="edit_desc")
        if st.button("설명 저장", type="primary"):
            update_project(project_id, description=new_desc.strip())
            st.success("저장되었습니다.")
            st.rerun()
            
    if project.get("description"):
        st.markdown(project["description"])
    else:
        st.info("등록된 설명이 없습니다.")
        
    st.divider()
    
    # 2. Todo List 영역
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
