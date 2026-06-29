import streamlit as st

st.set_page_config(page_title="AI 논문 자동화 대시보드", page_icon="📝", layout="wide")

# 사이드바 없이 네비게이션을 직접 제어하기 위해 st.navigation 사용
pg = st.navigation(
    {
        "Main": [
            st.Page("pages/home.py", title="🏠 홈", default=True),
        ],
        "Workflows": [
            st.Page("pages/automation.py", title="🚀 논문 자동화 파이프라인"),
            st.Page("pages/progress.py", title="📊 현재 진행 상황"),
        ],
        "Hidden": [
            st.Page("pages/progress_detail.py", title="작업 상세"),
        ]
    },
    position="sidebar" # 사이드바에 메뉴 표시
)

pg.run()
