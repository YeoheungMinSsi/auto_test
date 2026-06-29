import streamlit as st

def show():
    st.title("🏡 홈 (Home)")
    st.markdown("""
    환영합니다! **AI 논문 자동화 대시보드**에 오신 것을 환영합니다.
    이곳에서 논문을 수집하고 AI를 통해 요약하며, 최종적으로 PPT를 생성하는 과정을 자동화할 수 있습니다.
    
    원하시는 작업을 선택해주세요.
    """)
    
    st.divider()
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("🚀 논문 수집 및 자동화")
        st.write("논문을 검색, 수집, 요약하고 발표용 PPT를 자동으로 생성합니다.")
        if st.button("자동화 페이지로 이동 ➡️", type="primary", use_container_width=True):
            st.switch_page("pages/automation.py")
            
    with col2:
        st.subheader("📊 현재 진행 상황")
        st.write("지금까지 진행했던 모든 작업의 진행 상태와 로그를 확인합니다.")
        if st.button("진행 상황 페이지로 이동 ➡️", type="secondary", use_container_width=True):
            st.switch_page("pages/progress.py")

show()
