import { useState, useEffect } from "react";
import { Search, Filter, Calendar, User, Eye, X } from "lucide-react";

interface BlogPost {
  id: string | number;
  title: string;
  content: string;
  category: string;
  author: string;
  createdAt: string;
}

export default function Blog() {
  const [activeTab, setActiveTab] = useState<"read" | "write">("read");
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // 필터 및 검색 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState("전체");

  // 글 쓰기 폼 상태
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("관리자");
  const [category, setCategory] = useState("AI & Data");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 상세 보기 모달 상태
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  // 블로그 글 목록 가져오기
  const loadBlogPosts = () => {
    setIsLoading(true);
    setError("");
    const catArg = selectedCat === "전체" ? "" : `?category=${encodeURIComponent(selectedCat)}`;
    
    fetch(`http://localhost:8000/api/strapi/blog${catArg}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError("Strapi DB 연동에 실패했습니다. 서버가 실행 중인지 확인하세요.");
        } else if (Array.isArray(data.posts)) {
          setPosts(data.posts);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("서버 통신 실패");
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (activeTab === "read") {
      loadBlogPosts();
    }
  }, [activeTab, selectedCat]);

  // 검색 키워드 필터링
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredPosts(posts);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = posts.filter(p => 
        p.title.toLowerCase().includes(query) || 
        p.content.toLowerCase().includes(query)
      );
      setFilteredPosts(filtered);
    }
  }, [searchQuery, posts]);

  // 글 발행 제출
  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 모두 채워주세요.");
      return;
    }

    setIsSubmitting(true);
    fetch("http://localhost:8000/api/strapi/blog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, category, author })
    })
      .then(res => res.json())
      .then(data => {
        setIsSubmitting(false);
        if (data.success) {
          alert("🎉 글이 성공적으로 발행되었습니다!");
          setTitle("");
          setContent("");
          setActiveTab("read"); // 읽기 화면으로 전환
        } else {
          alert("글 발행에 실패했습니다. DB 연결을 확인해 주세요.");
        }
      })
      .catch(err => {
        console.error(err);
        alert("서버 연결 실패");
        setIsSubmitting(false);
      });
  };

  const categories = ["AI & Data", "Python & Streamlit", "개발 일지", "기타"];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* 타이틀 헤더 */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            📝 블로그 포스트 관리
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Strapi CMS에 저장된 포스트 목록을 조회하고 실시간으로 새 글을 작성 및 발행할 수 있습니다.
          </p>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("read")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "read" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          📖 블로그 읽기
        </button>
        <button
          onClick={() => setActiveTab("write")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "write" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          ✍️ 새 글 작성
        </button>
      </div>

      {/* 탭 내용 */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm min-h-[400px]">
        {activeTab === "read" && (
          <div className="space-y-6">
            {/* 검색 및 필터 바 */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200/40">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="제목 또는 내용 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                />
              </div>
              
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Filter size={16} className="text-gray-400" />
                <select
                  value={selectedCat}
                  onChange={(e) => setSelectedCat(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none bg-white w-full md:w-40"
                >
                  <option value="전체">전체 카테고리</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-sm flex items-center gap-2">
                <span>⚠️ {error}</span>
              </div>
            )}

            {isLoading ? (
              <div className="h-64 flex items-center justify-center text-sm text-gray-400">
                블로그 로딩 중...
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="h-64 border border-dashed rounded-xl flex items-center justify-center text-gray-400 italic text-sm">
                포스팅이 존재하지 않습니다. 새 글 작성을 통해 블로그 첫 글을 남겨 보세요!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {filteredPosts.map(post => (
                  <div
                    key={post.id}
                    className="border border-gray-200 rounded-2xl p-5 hover:shadow-xl transition-all bg-white flex flex-col justify-between h-56 hover:-translate-y-0.5 group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full w-max">
                        {post.category}
                      </div>
                      <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-base line-clamp-1">
                        {post.title}
                      </h4>
                      <p className="text-xs text-gray-500 mt-2 line-clamp-4 leading-relaxed whitespace-pre-wrap">
                        {post.content.replace(/[#*`>]/g, "")} {/* 간단하게 마크다운 제거 */}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-400 border-t pt-3 mt-3 shrink-0">
                      <span className="flex items-center gap-1">
                        <User size={12} /> {post.author}
                      </span>
                      <button
                        onClick={() => setSelectedPost(post)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-gray-50 hover:bg-gray-100 border text-gray-600 hover:text-gray-900 rounded-lg transition-colors font-semibold"
                      >
                        <Eye size={12} /> 자세히 보기
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "write" && (
          <form onSubmit={handlePublish} className="space-y-4 max-w-2xl mx-auto">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">
              ✍️ 새로운 블로그 글 작성
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">글 제목</label>
                <input
                  type="text" required
                  placeholder="포스트 제목을 입력하세요."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border rounded-xl focus:outline-none focus:border-blue-500 bg-gray-50"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">작성자</label>
                <input
                  type="text" required
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border rounded-xl focus:outline-none bg-gray-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">카테고리</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border rounded-xl focus:outline-none bg-white"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">본문 내용 (마크다운 지원)</label>
              <textarea
                required
                rows={12}
                placeholder="마크다운 문법으로 자유롭게 글을 작성해보세요."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border rounded-xl focus:outline-none focus:border-blue-500 bg-gray-50 font-mono"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold text-sm shadow-md shadow-indigo-500/10 flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? "글 발행 중..." : "🚀 글 발행하기"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 포스트 상세 모달 */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border p-6 w-full max-w-3xl shadow-2xl h-[85vh] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b pb-4 mb-4">
                <div>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">
                    {selectedPost.category}
                  </span>
                  <h3 className="text-xl font-bold mt-1 text-gray-950">{selectedPost.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                    <span className="flex items-center gap-1"><User size={12} /> {selectedPost.author}</span>
                    <span className="flex items-center gap-1"><Calendar size={12} /> {selectedPost.createdAt.substring(0, 10)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPost(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* 본문 스크롤 영역 */}
              <div className="overflow-y-auto max-h-[55vh] pr-2 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-sans bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                {selectedPost.content}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t shrink-0">
              <button
                onClick={() => setSelectedPost(null)}
                className="px-5 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 shadow-md shadow-gray-900/10"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
