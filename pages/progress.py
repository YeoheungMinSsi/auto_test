import streamlit as st
import os
import sys
import html

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
        get_projects,
        add_project,
        delete_project,
        update_project
    )
except ImportError as e:
    st.error(f"상태 관리 모듈(app_utils/state_manager.py)을 불러올 수 없습니다. 오류: {e}")
    import traceback
    st.code(traceback.format_exc())
    st.stop()

def show():
    # CSS 수정: absolute position을 완전히 제거하여 React hydration을 방해하지 않고 
    # 팝오버 내부의 화살표/아이콘(expand_more) 제거 및 우측 정렬 적용
    st.markdown(
        """
        <style>
        /* st.popover를 우측 끝으로 정렬 */
        div[data-testid="stPopover"] {
            display: flex !important;
            justify-content: flex-end !important;
            align-items: flex-start !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        
        /* st.popover 버튼 스타일: 외곽선 제거, 배경 투명화, 크기 적절히 줄임 */
        div[data-testid="stPopover"] > button {
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
            padding: 0px 4px !important;
            font-size: 1.25em !important;
            color: #9ca3af !important;
            cursor: pointer !important;
            min-height: unset !important;
            width: 24px !important;
            height: 24px !important;
            line-height: 1 !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
        }
        
        div[data-testid="stPopover"] > button:hover {
            color: #1f2937 !important;
        }
        
        /* 팝오버 내부의 텍스트 크기 상속 보장 */
        div[data-testid="stPopover"] > button * {
            font-size: inherit !important;
        }
        
        /* 팝오버 우측의 화살표를 완전히 가림 */
        div[data-testid="stPopover"] > button svg,
        div[data-testid="stPopover"] > button span[data-testid="stIcon"],
        div[data-testid="stPopover"] > button > div > div:nth-child(2),
        div[data-testid="stPopover"] > button span:not(:first-child) {
            display: none !important;
        }
        
        /* st.container(border=True) 카드 레이아웃의 최소 높이 확보 */
        div[data-testid="stVerticalBlockBorder"] {
            padding: 14px 16px 14px 16px !important;
            min-height: 70px !important;
        }
        </style>
        """,
        unsafe_allow_html=True
    )

    # 버튼 클릭 콜백 함수들
    if "add_popover_cnt" not in st.session_state:
        st.session_state["add_popover_cnt"] = 0

    def handle_add():
        name = st.session_state.get("new_proj_name", "").strip()
        desc = st.session_state.get("new_proj_desc", "").strip()
        if name:
            add_project(name, desc)
            st.session_state["new_proj_name"] = ""
            st.session_state["new_proj_desc"] = ""
            st.session_state["add_popover_cnt"] += 1

    def handle_update(pid):
        new_name = st.session_state.get(f"rename_{pid}", "").strip()
        new_status = st.session_state.get(f"status_{pid}")
        if new_name:
            update_project(pid, name=new_name, status=new_status)

    def handle_delete(pid):
        delete_project(pid)

    # 1. 상단 메뉴 - 대제목 오른쪽에 새 프로젝트 추가하기 배치
    header_col1, header_col2 = st.columns([5, 1])
    
    with header_col1:
        st.title("📊 현재 진행 상황")
        st.markdown("앞으로 진행할 프로젝트들의 계획(Implementation Plan)과 Todo List를 관리하는 대시보드입니다.")
        
    with header_col2:
        st.write("")
        st.write("")
        # key에 카운터를 넣어 등록 성공 시 자동으로 팝오버가 닫히도록 설정
        add_popover_key = f"add_popover_{st.session_state['add_popover_cnt']}"
        with st.popover("➕ 새 프로젝트 추가하기", use_container_width=True, key=add_popover_key):
            st.subheader("새 프로젝트 생성")
            st.markdown("새로운 기능 개발이나 연구 계획을 추가해보세요.")
            st.text_input("프로젝트 이름", key="new_proj_name")
            st.text_area("프로젝트 설명 / Implementation Plan", height=100, key="new_proj_desc")
            st.button("프로젝트 생성", type="primary", use_container_width=True, on_click=handle_add)
                    
    st.divider()
    
    projects = get_projects()
    
    if not projects:
        st.info("등록된 프로젝트가 없습니다. 위의 '새 프로젝트 추가하기' 버튼을 눌러 프로젝트를 등록해주세요.")
        return
        
    # 5. 1열에 4개의 컴포넌트가 보이도록 변경
    cols = st.columns(4)
    
    for idx, project in enumerate(projects):
        col = cols[idx % 4]
        with col:
            with st.container(border=True):
                status_colors = {
                    "계획 중": "#9ca3af",
                    "진행 중": "#3b82f6",
                    "완료": "#10b981"
                }
                color = status_colors.get(project.get("status", "계획 중"), "#9ca3af")
                
                card_cols = st.columns([5, 1])
                
                with card_cols[0]:
                    escaped_name = html.escape(project['name'])
                    escaped_status = html.escape(project.get("status", "계획 중"))
                    desc_tooltip = project.get("description", "등록된 설명이 없습니다.")
                    escaped_tooltip = html.escape(desc_tooltip).replace('\r', '').replace('\n', ' ')
                    
                    # 4. 진행 상황을 대제목 오른쪽에 배치
                    st.markdown(
                        f"""
                        <a href="/progress_detail?project_id={project['id']}" target="_self" style="text-decoration: none; color: inherit; display: block; min-height: 40px;" title="{escaped_tooltip}">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-weight: bold; font-size: 1.1em; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 65%;">
                                    📁 {escaped_name}
                                </span>
                                <span style="background-color: {color}; color: white; padding: 3px 9px; border-radius: 12px; font-size: 0.75em; font-weight: bold; white-space: nowrap;">
                                    {escaped_status}
                                </span>
                            </div>
                        </a>
                        """,
                        unsafe_allow_html=True
                    )
                    
                with card_cols[1]:
                    # 햄버거 버튼 메뉴
                    # 이름이나 상태가 변경되면 key가 바뀌면서 팝오버가 자동으로 닫힙니다.
                    popover_key = f"popover_{project['id']}_{project['name']}_{project.get('status', '계획 중')}"
                    with st.popover("⋮", use_container_width=False, key=popover_key):
                        st.markdown("**프로젝트 설정**")
                        st.text_input("프로젝트명 변경", value=project['name'], key=f"rename_{project['id']}")
                        st.selectbox(
                            "상태 변경", 
                            ["계획 중", "진행 중", "완료"], 
                            index=["계획 중", "진행 중", "완료"].index(project.get("status", "계획 중")), 
                            key=f"status_{project['id']}"
                        )
                        
                        # 3. 콜백을 사용하여 팝오버가 올바르게 닫히도록 수정
                        st.button(
                            "변경 적용", 
                            key=f"btn_update_{project['id']}", 
                            use_container_width=True, 
                            type="primary",
                            on_click=handle_update,
                            args=(project['id'],)
                        )
                                
                        st.divider()
                        st.button(
                            "🗑️ 프로젝트 삭제", 
                            key=f"btn_del_{project['id']}", 
                            use_container_width=True,
                            on_click=handle_delete,
                            args=(project['id'],)
                        )

show()
