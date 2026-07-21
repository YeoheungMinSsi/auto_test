import { useState, useEffect } from "react"
import Sidebar from "./components/Sidebar"
import Automation from "./components/Automation"
import Projects from "./components/Projects"
import Blog from "./components/Blog"
import { Plus, MoreVertical, X } from "lucide-react"

function App() {
  const [currentView, setCurrentView] = useState<"home" | "automation" | "projects" | "blog" | string>("home");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [workspaceData, setWorkspaceData] = useState<any>(null);
  const [showCreatePageModal, setShowCreatePageModal] = useState(false);
  const [newPageData, setNewPageData] = useState({ title: "", has_subpages: false, is_hidden: false });
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true);

  const loadWorkspace = () => {
    fetch("http://localhost:8000/api/workspace")
      .then(res => {
        if (!res.ok) throw new Error("Server not responding");
        setIsBackendConnected(true);
        return res.json();
      })
      .then(data => setWorkspaceData(data))
      .catch(err => {
        console.error("Error fetching workspace:", err);
        setIsBackendConnected(false);
      });
  };

  useEffect(() => {
    loadWorkspace();
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const handleNavigate = (view: string, projId?: string | null, docId?: string | null) => {
    setCurrentView(view);
    if (projId !== undefined) setSelectedProjectId(projId);
    if (docId !== undefined) setSelectedDocId(docId);
  };

  const handleCreatePage = () => {
    if (!newPageData.title.trim()) return;
    fetch("http://localhost:8000/api/workspace/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPageData)
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to create page");
        return res.json();
      })
      .then(() => {
        loadWorkspace();
        setShowCreatePageModal(false);
        setNewPageData({ title: "", has_subpages: false, is_hidden: false });
      })
      .catch(err => {
        console.error("Error creating page:", err);
        setIsBackendConnected(false);
      });
  };

  const handleDeletePage = (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("이 페이지를 삭제하시겠습니까?")) {
      fetch(`http://localhost:8000/api/workspace/pages/${pageId}`, { method: "DELETE" })
        .then(res => {
          if (!res.ok) throw new Error("Failed to delete page");
          if (currentView === pageId) setCurrentView("home");
          loadWorkspace();
        })
        .catch(err => {
          console.error("Error deleting page:", err);
          setIsBackendConnected(false);
        });
    }
  };

  const renderContent = () => {
    // 커스텀 페이지 렌더링
    if (workspaceData && workspaceData.custom_pages && workspaceData.custom_pages.some((p:any) => p.id === currentView)) {
       return (
         <Projects 
           selectedProjectId={selectedProjectId} 
           selectedDocId={selectedDocId} 
           onNavigate={(projId, docId) => handleNavigate(currentView, projId, docId)} 
           isDarkMode={isDarkMode}
           customPageId={currentView} // Projects가 custom page 데이터를 불러오게 향후 연동가능
         />
       );
    }

    switch (currentView) {
      case "home":
        return (
          <div className="flex-1 overflow-y-auto bg-[#fafafa] dark:bg-[#121212] p-12 text-[#37352f] dark:text-gray-200 flex flex-col items-center mx-auto min-h-full">
            <div className="text-center space-y-6 max-w-4xl w-full mt-10">
              <div className="w-20 h-20 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20 text-white text-3xl font-bold animate-pulse">
                📝
              </div>
              <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 sm:text-6xl">
                {workspaceData?.workspace_name || "Auto Workspace"}
              </h1>
              <p className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed max-w-2xl mx-auto">
                논문 수집 및 PPT 자동화 서비스와 프로젝트 관리 공간을 통합 제공하는 AI 개발 대시보드입니다.
              </p>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-6 w-full">
                <div onClick={() => handleNavigate("automation")} className="relative p-6 bg-white dark:bg-[#1e1e1e] rounded-xl border border-gray-200/80 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-xl transition-all cursor-pointer group text-left">
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">🚀</div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">논문 자동화</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">논문 검색/요약 및 이미지, PPT 생성 파이프라인</p>
                </div>
                <div onClick={() => handleNavigate("projects")} className="relative p-6 bg-white dark:bg-[#1e1e1e] rounded-xl border border-gray-200/80 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-xl transition-all cursor-pointer group text-left">
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📊</div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">진행 상황</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Implementation Plan 및 문서 공간 & 할 일 관리</p>
                </div>
                <div onClick={() => handleNavigate("blog")} className="relative p-6 bg-white dark:bg-[#1e1e1e] rounded-xl border border-gray-200/80 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-xl transition-all cursor-pointer group text-left">
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📝</div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">블로그 관리</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Strapi CMS와 연동되는 포스팅 관리</p>
                </div>

                {/* 커스텀 페이지 렌더링 */}
                {workspaceData?.custom_pages?.map((page: any) => (
                  <div key={page.id} onClick={() => handleNavigate(page.id)} className="relative p-6 bg-white dark:bg-[#1e1e1e] rounded-xl border border-gray-200/80 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-xl transition-all cursor-pointer group text-left">
                    <button 
                      onClick={(e) => handleDeletePage(page.id, e)}
                      className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical size={16} />
                    </button>
                    <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📄</div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      {page.title} {page.is_hidden && <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1 rounded text-gray-500">숨김</span>}
                    </h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {page.has_subpages ? "문서 및 하위 페이지 지원" : "기본 문서"}
                    </p>
                  </div>
                ))}

                {/* + 커스텀 페이지 생성 버튼 */}
                <div 
                  onClick={() => setShowCreatePageModal(true)}
                  className="p-6 bg-transparent rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[140px]"
                >
                  <Plus size={32} className="text-gray-400 group-hover:text-blue-500 mb-2" />
                  <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">새 하위 페이지 생성</span>
                </div>
              </div>
            </div>
          </div>
        );
      case "automation":
        return <Automation />;
      case "projects":
        return (
          <Projects 
            selectedProjectId={selectedProjectId} 
            selectedDocId={selectedDocId} 
            onNavigate={(projId, docId) => handleNavigate("projects", projId, docId)} 
            isDarkMode={isDarkMode}
          />
        );
      case "blog":
        return <Blog />;
      default:
        return <div className="p-12 text-center text-gray-500 dark:text-gray-400">페이지를 찾을 수 없습니다.</div>;
    }
  };

  return (
    <div className="flex w-full h-screen overflow-hidden bg-white dark:bg-[#121212] text-[#37352f] dark:text-gray-200 font-sans antialiased transition-colors">
      <Sidebar 
        currentView={currentView} 
        onNavigate={handleNavigate}
        selectedProjectId={selectedProjectId}
        selectedDocId={selectedDocId}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        workspaceData={workspaceData}
        onWorkspaceUpdate={loadWorkspace}
      />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fafafa] dark:bg-[#121212] transition-colors">
        {!isBackendConnected && (
          <div className="bg-red-500 text-white px-6 py-2.5 text-sm flex items-center justify-between font-semibold shrink-0 shadow-md">
            <span className="flex items-center gap-2">
              ⚠️ 백엔드 API 서버(localhost:8000)에 연결할 수 없습니다. 기능 동작을 위해 'python main.py' 백엔드 서버를 먼저 실행해 주세요.
            </span>
            <button 
              onClick={loadWorkspace}
              className="bg-white text-red-600 hover:bg-red-50 px-3 py-1 rounded-md text-xs font-bold transition-colors"
            >
              서버 재연결 시도
            </button>
          </div>
        )}

        <div className="h-12 border-b border-gray-200/60 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] flex items-center justify-between px-6 text-sm text-gray-500 dark:text-gray-400 font-medium shrink-0 transition-colors">
          <div className="flex items-center gap-2">
            <span className="cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" onClick={() => handleNavigate("home")}>Auto Workspace</span>
            {currentView !== "home" && (
              <>
                <span className="text-gray-300 dark:text-gray-600">/</span>
                <span className="text-gray-800 dark:text-gray-200">
                  {currentView === "automation" ? "🚀 논문 자동화 파이프라인" : 
                   currentView === "blog" ? "📝 블로그 관리" : 
                   currentView === "projects" ? "📊 프로젝트 진행 상황" : workspaceData?.custom_pages?.find((p:any)=>p.id===currentView)?.title || currentView}
                </span>
              </>
            )}
          </div>
          <div className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1.5 font-semibold transition-all ${
            isBackendConnected 
              ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800/50" 
              : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isBackendConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}></span>
            Backend: {isBackendConnected ? "Connected" : "Disconnected"}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </div>

      {/* 새 하위 페이지 생성 모달 */}
      {showCreatePageModal && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">새 하위 페이지 생성</h2>
              <button onClick={() => setShowCreatePageModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={20}/></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">페이지 제목</label>
                <input 
                  type="text" 
                  value={newPageData.title}
                  onChange={e => setNewPageData({...newPageData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-[#121212] dark:text-white"
                  placeholder="예: 데이터 분석 결과"
                />
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">하위 페이지 내 추가 페이지 생성 지원</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">진행 상황 페이지처럼 내부 문서 구조를 가집니다.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={newPageData.has_subpages} onChange={e => setNewPageData({...newPageData, has_subpages: e.target.checked})} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">다른 사람에게 숨기기</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">사이드바 및 홈 화면에서 이 페이지를 비공개로 처리합니다.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={newPageData.is_hidden} onChange={e => setNewPageData({...newPageData, is_hidden: e.target.checked})} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
                </label>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setShowCreatePageModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleCreatePage} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
