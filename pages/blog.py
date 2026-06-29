import streamlit as st
from paper_summary.apis.strapi_client import StrapiClient

# Strapi 클라이언트 초기화
strapi = StrapiClient()

# st.dialog 데코레이터를 이용한 상세 팝업 창 정의
@st.dialog("상세 보기 🔍", width="large")
def show_post_detail(post):
    st.write(f"### {post['title']}")
    st.write(f"📁 **카테고리:** `{post['category']}` | 👤 **작성자:** `{post['author']}` | 📅 **작성일:** `{post['createdAt'][:10]}`")
    st.divider()
    # 마크다운 본문 출력
    st.markdown(post["content"])
    st.write("")
    if st.button("닫기", use_container_width=True, type="primary"):
        st.rerun()

st.title("📝 블로그 포스트 관리")
st.markdown("Strapi 데이터베이스와 실시간으로 연동되는 블로그 글쓰기 및 목록 조회 화면입니다.")

# 탭을 사용하여 '글 읽기'와 '글 쓰기' 화면 분리
tab_read, tab_write = st.tabs(["📖 블로그 읽기", "✍️ 새 글 작성"])

with tab_write:
    st.subheader("새로운 블로그 글 작성")
    st.markdown("내용을 입력하고 저장하면 Strapi DB에 실시간으로 등록됩니다.")
    
    with st.form("blog_write_form", clear_on_submit=True):
        title = st.text_input("제목", placeholder="포스트 제목을 입력하세요.")
        author = st.text_input("작성자", value="관리자")
        category = st.selectbox("카테고리", ["AI & Data", "Python & Streamlit", "개발 일지", "기타"])
        content = st.text_area("본문 내용 (마크다운 지원)", placeholder="마크다운 문법으로 자유롭게 글을 작성해보세요.", height=350)
        
        submit_button = st.form_submit_button("🚀 글 발행하기", use_container_width=True)
        
        if submit_button:
            if not title.strip():
                st.error("제목을 입력해주세요!")
            elif not content.strip():
                st.error("본문 내용을 입력해주세요!")
            else:
                post_data = {
                    "title": title,
                    "content": content,
                    "category": category,
                    "author": author
                }
                
                with st.spinner("Strapi DB에 저장 중..."):
                    result = strapi.create_blog_post(post_data)
                    
                if result:
                    st.success(f"🎉 '{title}' 포스트가 성공적으로 발행되어 DB에 저장되었습니다!")
                    # 화면을 새로고침하여 캐시 업데이트 유도
                    st.rerun()
                else:
                    st.error("오류: DB 저장에 실패했습니다. Strapi 서버 작동 상태 및 API 권한 설정을 확인하세요.")

with tab_read:
    st.subheader("발행된 블로그 글 목록")
    
    # 실시간 검색 및 카테고리 필터
    col_search, col_filter = st.columns([3, 1])
    with col_search:
        search_query = st.text_input("🔍 제목 또는 내용 검색", placeholder="검색어를 입력하세요.")
    with col_filter:
        selected_cat = st.selectbox("📁 카테고리 필터", ["전체", "AI & Data", "Python & Streamlit", "개발 일지", "기타"])
    
    # DB에서 데이터 가져오기
    with st.spinner("DB로부터 포스트를 불러오는 중..."):
        filter_cat = None if selected_cat == "전체" else selected_cat
        # DB에서 최신 글 100개 fetch
        posts = strapi.get_blog_posts(category=filter_cat)
        
    if not posts:
        st.info("발행된 블로그 글이 없습니다. '새 글 작성' 탭에서 첫 글을 등록해 보세요!")
    else:
        # 검색 필터 적용
        if search_query:
            posts = [
                p for p in posts 
                if search_query.lower() in p["title"].lower() 
                or (p["content"] and search_query.lower() in p["content"].lower())
            ]
            
        if not posts:
            st.warning("검색 결과와 일치하는 포스트가 없습니다.")
        else:
            # 3열 카드 그리드 레이아웃 배치
            cols = st.columns(3)
            for idx, post in enumerate(posts):
                col_idx = idx % 3
                with cols[col_idx]:
                    with st.container(border=True):
                        # 카드 헤더
                        st.markdown(f"### {post['title']}")
                        st.markdown(f"📁 **카테고리:** `{post['category']}`")
                        st.markdown(f"👤 `{post['author']}` | 📅 `{post['createdAt'][:10]}`")
                        st.write("") # 간격 조절
                        
                        # 상세보기 버튼 클릭 시 dialog 팝업 호출
                        if st.button("자세히 보기 🔍", key=f"view_{post['id']}", use_container_width=True):
                            show_post_detail(post)
