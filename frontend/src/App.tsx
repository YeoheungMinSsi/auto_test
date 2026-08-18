import { useState, useEffect } from "react"
import Sidebar from "./components/Sidebar"
import Automation from "./components/Automation"
import Projects from "./components/Projects"
import Blog from "./components/Blog"
import { Plus, MoreVertical, X, Edit2, Eye, EyeOff, Trash2 } from "lucide-react"

const PAGE_ICONS = ["📄", "📝", "🚀", "📊", "💡", "📚", "⚙️", "📁", "🎨", "🔬", "📌", "🎯", "💻", "📂", "✨", "🔍", "⚡", "🔒", "🛠️", "💬"];

function App() {
  const [currentView, setCurrentView] = useState<"home" | "automation" | "projects" | "blog" | string>("home");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [workspaceData, setWorkspaceData] = useState<any>(null);
  const [showCreatePageModal, setShowCreatePageModal] = useState(false);
  const [newPageData, setNewPageData] = useState({ title: "", description: "", icon: "📄", has_subpages: false, is_hidden: false });
  const [editingPage, setEditingPage] = useState<any>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const handleEditPage = (page: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPage({ ...page });
    setOpenDropdownId(null);
  };

  const handleUpdateEditingPage = () => {
    if (!editingPage || !editingPage.title.trim()) return;
    fetch(`http://localhost:8000/api/workspace/pages/${editingPage.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editingPage.title.trim(),
        description: editingPage.description,
        icon: editingPage.icon,
        has_subpages: editingPage.has_subpages,
        is_hidden: editingPage.is_hidden
      })
    })
    .then(res => {
      if (!res.ok) throw new Error("Failed to update page");
      loadWorkspace();
      setEditingPage(null);
    })
    .catch(err => {
      console.error("Error updating page:", err);
      setIsBackendConnected(false);
    });
  };

  const handleToggleHidden = (page: any, e: React.MouseEvent) => {
    e.stopPropagation();
    fetch(`http://localhost:8000/api/workspace/pages/${page.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_hidden: !page.is_hidden })
    })
    .then(res => {
      if (!res.ok) throw new Error("Failed to toggle hidden state");
      loadWorkspace();
    })
    .catch(err => {
      console.error("Error toggling hidden state:", err);
      setIsBackendConnected(false);
    });
    setOpenDropdownId(null);
  };

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
        setNewPageData({ title: "", description: "", icon: "📄", has_subpages: false, is_hidden: false });
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
       const currentPage = workspaceData.custom_pages.find((p:any) => p.id === currentView);
       return (
         <Projects 
           selectedProjectId={selectedProjectId} 
           selectedDocId={selectedDocId} 
           onNavigate={(projId, docId) => handleNavigate(currentView, projId, docId)} 
           isDarkMode={isDarkMode}
           customPageId={currentView}
           customPageTitle={currentPage?.title}
           customPageIcon={currentPage?.icon || "📄"}
           customPageDescription={currentPage?.description}
           onWorkspaceUpdate={loadWorkspace}
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
                    <div className="absolute top-2.5 right-2.5 z-10" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(openDropdownId === page.id ? null : page.id);
                        }}
                        className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200/90 dark:hover:bg-gray-700/90 opacity-0 group-hover:opacity-100 transition-all cursor-pointer flex items-center justify-center pointer-events-auto shadow-sm"
                        title="페이지 옵션"
                      >
                        <MoreVertical size={18} className="pointer-events-none" />
                      </button>
                      
                      {openDropdownId === page.id && (
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 mt-1 w-36 bg-white dark:bg-[#252525] rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-10 py-1 overflow-hidden"
                        >
                          <button 
                            onClick={(e) => handleEditPage(page, e)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#333] flex items-center gap-2"
                          >
                            <Edit2 size={14} /> 페이지 설정
                          </button>
                          <button 
                            onClick={(e) => handleToggleHidden(page, e)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#333] flex items-center gap-2"
                          >
                            {page.is_hidden ? <Eye size={14} /> : <EyeOff size={14} />} {page.is_hidden ? "보이게 하기" : "나만 보이기"}
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePage(page.id, e);
                              setOpenDropdownId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2"
                          >
                            <Trash2 size={14} /> 삭제
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">
                      {page.icon || "📄"}
                    </div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      {page.title} {page.is_hidden && <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1 rounded text-gray-500">숨김</span>}
                    </h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-2">
                      {page.description ? page.description : (page.has_subpages ? "문서 및 하위 페이지 지원" : "기본 문서")}
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
        
        <div className="flex-1 overflow-y-auto" onClick={() => setOpenDropdownId(null)}>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">아이콘 선택</label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 max-h-28 overflow-y-auto">
                  {PAGE_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setNewPageData({ ...newPageData, icon })}
                      className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all ${
                        newPageData.icon === icon 
                          ? "bg-blue-500 text-white shadow-md scale-105" 
                          : "hover:bg-gray-200 dark:hover:bg-gray-800"
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">페이지 제목</label>
                <input 
                  type="text" 
                  value={newPageData.title}
                  onChange={e => setNewPageData({...newPageData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-[#121212] dark:text-white"
                  placeholder="예: 메모장 및 기획서"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">페이지 설명 (선택)</label>
                <input 
                  type="text" 
                  value={newPageData.description}
                  onChange={e => setNewPageData({...newPageData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-[#121212] dark:text-white text-sm"
                  placeholder="예: 개인 프로젝트 아이디어를 자유롭게 메모하는 공간"
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
              <button onClick={() => setShowCreatePageModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">취소</button>
              <button onClick={handleCreatePage} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">생성</button>
            </div>
          </div>
        </div>
      )}

      {/* 페이지 편집/설정 모달 */}
      {editingPage && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">페이지 설정 및 편집</h2>
              <button onClick={() => setEditingPage(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={20}/></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">아이콘 수정</label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 max-h-28 overflow-y-auto">
                  {PAGE_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setEditingPage({ ...editingPage, icon })}
                      className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all ${
                        (editingPage.icon || "📄") === icon 
                          ? "bg-blue-500 text-white shadow-md scale-105" 
                          : "hover:bg-gray-200 dark:hover:bg-gray-800"
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">페이지 제목</label>
                <input 
                  type="text" 
                  value={editingPage.title}
                  onChange={e => setEditingPage({ ...editingPage, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-[#121212] dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">페이지 설명</label>
                <input 
                  type="text" 
                  value={editingPage.description || ""}
                  onChange={e => setEditingPage({ ...editingPage, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-[#121212] dark:text-white text-sm"
                  placeholder="페이지에 대한 짧은 설명을 입력하세요."
                />
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">하위 페이지 지원</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">내부 프로젝트 및 문서 생성 기능을 켭니다.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={editingPage.has_subpages} onChange={e => setEditingPage({ ...editingPage, has_subpages: e.target.checked })} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">숨기기 옵션</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">사이드바 및 홈 화면에서 이 페이지를 숨깁니다.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={editingPage.is_hidden} onChange={e => setEditingPage({ ...editingPage, is_hidden: e.target.checked })} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
                </label>
              </div>
            </div>

            <div className="mt-8 flex justify-between items-center">
              <button 
                onClick={(e) => {
                  handleDeletePage(editingPage.id, e);
                  setEditingPage(null);
                }} 
                className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
              >
                페이지 삭제
              </button>
              <div className="flex gap-3">
                <button onClick={() => setEditingPage(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">취소</button>
                <button onClick={handleUpdateEditingPage} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">저장</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
