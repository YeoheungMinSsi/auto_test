import { useEffect, useState } from "react";
import { FileText, Home, Rocket, BarChart2, BookOpen, ChevronRight, ChevronDown, Plus, MoreHorizontal, Sun, Moon, Settings, MoreVertical, X } from "lucide-react";

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string, projId?: string | null, docId?: string | null) => void;
  selectedProjectId: string | null;
  selectedDocId: string | null;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  workspaceData?: any;
  onWorkspaceUpdate?: () => void;
}

interface Project {
  id: string;
  name: string;
  status: string;
  documents?: Record<string, any>;
}

export default function Sidebar({ currentView, onNavigate, selectedProjectId, selectedDocId, isDarkMode, onToggleDarkMode, workspaceData, onWorkspaceUpdate }: SidebarProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [showColorPopover, setShowColorPopover] = useState(false);
  const [workspaceColor, setWorkspaceColor] = useState(() => {
    return localStorage.getItem("workspaceColor") || "from-blue-500 to-indigo-600";
  });

  const [showWorkspaceSettings, setShowWorkspaceSettings] = useState(false);
  const [workspaceNameInput, setWorkspaceNameInput] = useState("");

  const [pageSettingsId, setPageSettingsId] = useState<string | null>(null);
  const [pageEditData, setPageEditData] = useState({ title: "", has_subpages: false, is_hidden: false });

  const loadSidebarProjects = () => {
    fetch("http://localhost:8000/api/projects")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProjects(data);
          setExpandedProjects(prev => {
            const next = { ...prev };
            data.forEach(p => {
              if (p.id === selectedProjectId && next[p.id] === undefined) {
                next[p.id] = true;
              }
            });
            return next;
          });
        }
      })
      .catch(err => console.error("Error fetching projects:", err));
  };

  useEffect(() => {
    loadSidebarProjects();
  }, [currentView, selectedProjectId]);

  const toggleExpand = (pid: string) => {
    setExpandedProjects(prev => ({ ...prev, [pid]: !prev[pid] }));
  };

  const handleAddProject = (e: React.MouseEvent) => {
    e.stopPropagation();
    const name = prompt("새로운 프로젝트의 이름을 입력하세요:");
    if (!name || !name.trim()) return;

    fetch("http://localhost:8000/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: "" })
    })
      .then(res => res.json())
      .then(() => {
        loadSidebarProjects();
        onNavigate("projects", null, null);
      })
      .catch(err => console.error("Error creating project:", err));
  };

  const handleUpdateWorkspace = () => {
    if (!workspaceNameInput.trim()) return;
    fetch("http://localhost:8000/api/workspace", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_name: workspaceNameInput })
    }).then(() => {
      onWorkspaceUpdate?.();
      setShowWorkspaceSettings(false);
    }).catch(err => console.error(err));
  };

  const handleUpdatePage = () => {
    if (!pageSettingsId || !pageEditData.title.trim()) return;
    fetch(`http://localhost:8000/api/workspace/pages/${pageSettingsId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pageEditData)
    }).then(() => {
      onWorkspaceUpdate?.();
      setPageSettingsId(null);
    }).catch(err => console.error(err));
  };

  const handleDeletePage = (pageId: string) => {
    if (window.confirm("이 페이지를 삭제하시겠습니까?")) {
      fetch(`http://localhost:8000/api/workspace/pages/${pageId}`, { method: "DELETE" })
        .then(() => {
          if (currentView === pageId) onNavigate("home");
          onWorkspaceUpdate?.();
          setPageSettingsId(null);
        }).catch(err => console.error(err));
    }
  };

  const renderDocTree = (docs: Record<string, any>, projectId: string, parentId: string | null = null, level: number = 0) => {
    const docList = Object.values(docs).filter(doc => doc.parent_id === parentId);
    if (docList.length === 0) return null;

    return (
      <div className="flex flex-col">
        {docList.map(doc => {
          const isSelected = selectedDocId === doc.id;
          return (
            <div key={doc.id} className="flex flex-col">
              <div 
                style={{ paddingLeft: `${(level + 1) * 10 + 6}px` }}
                onClick={() => onNavigate("projects", projectId, doc.id)}
                className={`flex items-center gap-1.5 py-1 pr-3 text-xs hover:bg-gray-200/60 dark:hover:bg-gray-800 rounded cursor-pointer transition-colors ${
                  isSelected ? "bg-gray-200/80 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-semibold" : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
              >
                <FileText size={12} className="shrink-0 text-gray-400 dark:text-gray-500" />
                <span className="truncate">{doc.title}</span>
              </div>
              {renderDocTree(docs, projectId, doc.id, level + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-60 bg-[#fbfbfa] dark:bg-[#1a1a1a] border-r border-gray-200/60 dark:border-gray-800 h-screen flex flex-col text-[#37352f] dark:text-gray-300 select-none shrink-0 justify-between transition-colors">
      <div className="flex flex-col overflow-hidden flex-1">
        {/* 워크스페이스 헤더 */}
        <div className="p-4 hover:bg-gray-200/60 dark:hover:bg-gray-800 flex items-center justify-between font-semibold transition-colors border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div onClick={() => onNavigate("home")} className="cursor-pointer flex items-center gap-2 flex-1">
            <div className={`w-6 h-6 bg-gradient-to-br ${workspaceColor} rounded-lg text-white flex items-center justify-center text-xs font-bold shadow-md shadow-indigo-500/10 shrink-0`}>A</div>
            <span className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate pr-1">
              {workspaceData?.workspace_name || "Auto Workspace"}
            </span>
          </div>
          <button onClick={() => {
            setWorkspaceNameInput(workspaceData?.workspace_name || "Auto Workspace");
            setShowWorkspaceSettings(true);
          }} className="p-1 hover:bg-gray-300 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <Settings size={14} />
          </button>
        </div>
        
        {/* 메인 내비게이션 메뉴 */}
        <div className="px-2 pt-3 pb-2 text-sm space-y-0.5 border-b border-gray-100/60 dark:border-gray-800 shrink-0">
          <div 
            onClick={() => onNavigate("home")}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all ${
              currentView === "home" ? "bg-gray-200/80 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold" : "text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-800"
            }`}
          >
            <Home size={16} /> <span>홈</span>
          </div>
          <div 
            onClick={() => onNavigate("automation")}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all ${
              currentView === "automation" ? "bg-gray-200/80 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold" : "text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-800"
            }`}
          >
            <Rocket size={16} /> <span>🚀 논문 자동화</span>
          </div>
          <div 
            onClick={() => onNavigate("projects", null, null)}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all ${
              currentView === "projects" && !selectedProjectId ? "bg-gray-200/80 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold" : "text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-800"
            }`}
          >
            <BarChart2 size={16} /> <span>📊 진행 상황</span>
          </div>
          <div 
            onClick={() => onNavigate("blog")}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all ${
              currentView === "blog" ? "bg-gray-200/80 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold" : "text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-800"
            }`}
          >
            <BookOpen size={16} /> <span>📝 블로그 관리</span>
          </div>
          
          {workspaceData?.custom_pages?.map((page: any) => {
            if (page.is_hidden) return null;
            return (
              <div 
                key={page.id}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-all group ${
                  currentView === page.id ? "bg-gray-200/80 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold" : "text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-800"
                }`}
              >
                <div onClick={() => onNavigate(page.id)} className="flex items-center gap-2 flex-1 truncate">
                  <FileText size={16} /> <span className="truncate">{page.title}</span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setPageEditData({ title: page.title, has_subpages: page.has_subpages, is_hidden: page.is_hidden });
                    setPageSettingsId(page.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-opacity"
                >
                  <MoreVertical size={14} />
                </button>
              </div>
            );
          })}
        </div>

        {/* 프로젝트 진행 리스트 */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {currentView === "projects" && (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 select-none relative group">
                <span className="flex items-center gap-1 font-extrabold text-indigo-500 dark:text-indigo-400">
                  <BarChart2 size={11} /> workspace
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={handleAddProject}
                    className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                    title="프로젝트 추가"
                  >
                    <Plus size={13} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowColorPopover(!showColorPopover);
                    }}
                    className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                    title="설정 및 색상"
                  >
                    <MoreHorizontal size={13} />
                  </button>
                </div>

                {/* 색상 변경 팝오버 */}
                {showColorPopover && (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-6 bg-white dark:bg-[#252525] border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-xl z-50 w-44 font-normal normal-case text-gray-700 dark:text-gray-300 space-y-2"
                  >
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">워크스페이스 색상</div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { name: "블루", class: "from-blue-500 to-indigo-600" },
                        { name: "퍼플", class: "from-purple-500 to-pink-600" },
                        { name: "에메랄드", class: "from-emerald-500 to-teal-600" },
                        { name: "로즈", class: "from-rose-500 to-orange-500" }
                      ].map(color => (
                        <button
                          key={color.name}
                          onClick={() => {
                            setWorkspaceColor(color.class);
                            localStorage.setItem("workspaceColor", color.class);
                            setShowColorPopover(false);
                          }}
                          className={`w-6 h-6 rounded bg-gradient-to-br ${color.class} border-2 ${
                            workspaceColor === color.class ? "border-gray-900 dark:border-gray-100 scale-110" : "border-transparent"
                          }`}
                          title={color.name}
                        />
                      ))}
                    </div>
                    <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                    <button 
                      onClick={() => {
                        loadSidebarProjects();
                        setShowColorPopover(false);
                      }}
                      className="w-full text-left px-2 py-1 text-[11px] rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center gap-1 font-semibold"
                    >
                      새로고침
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-0.5">
                {projects.length === 0 ? (
                  <div className="px-2.5 text-xs text-gray-400 italic">등록된 프로젝트 없음</div>
                ) : (
                  projects.map(project => {
                    const isExpanded = expandedProjects[project.id];
                    const isCurrentProject = selectedProjectId === project.id;
                    return (
                      <div key={project.id} className="flex flex-col">
                        <div 
                          className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer hover:bg-gray-200/50 dark:hover:bg-gray-800 transition-colors ${
                            isCurrentProject && !selectedDocId ? "bg-gray-200/80 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold" : "text-gray-600 dark:text-gray-400 text-xs"
                          }`}
                        >
                          <div 
                            onClick={() => onNavigate("projects", project.id, null)}
                            className="flex items-center gap-1.5 truncate flex-1"
                          >
                            <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-blue-500"></span>
                            <span className="truncate">{project.name}</span>
                          </div>
                          {project.documents && Object.keys(project.documents).length > 0 && (
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(project.id);
                              }}
                              className="p-0.5 hover:bg-gray-300 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors shrink-0"
                            >
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </div>
                          )}
                        </div>
                        {isExpanded && project.documents && (
                          <div className="mt-0.5 space-y-0.5 border-l border-gray-200 dark:border-gray-700 ml-2.5">
                            {renderDocTree(project.documents, project.id, null)}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 하단 제어부 및 다크모드 스위치 */}
      <div className="p-3 border-t border-gray-200/60 dark:border-gray-800 flex items-center justify-between shrink-0 bg-[#f7f7f5] dark:bg-[#1e1e1e]/40 transition-colors">
        <div className="text-[10px] text-gray-400 font-semibold uppercase">테마</div>
        <button 
          onClick={onToggleDarkMode}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-800 transition-all border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900"
        >
          {isDarkMode ? <Sun size={13} className="text-amber-500" /> : <Moon size={13} className="text-indigo-500" />}
          <span>{isDarkMode ? "라이트" : "다크"}</span>
        </button>
      </div>

      {/* 워크스페이스 설정 모달 */}
      {showWorkspaceSettings && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">워크스페이스 설정</h2>
              <button onClick={() => setShowWorkspaceSettings(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">워크스페이스 이름</label>
                <input 
                  type="text" 
                  value={workspaceNameInput}
                  onChange={e => setWorkspaceNameInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-[#121212] dark:text-white"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowWorkspaceSettings(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
              <button onClick={handleUpdateWorkspace} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 커스텀 페이지 관리 모달 */}
      {pageSettingsId && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">페이지 설정</h2>
              <button onClick={() => setPageSettingsId(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">페이지 제목</label>
                <input 
                  type="text" 
                  value={pageEditData.title}
                  onChange={e => setPageEditData({...pageEditData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-[#121212] dark:text-white"
                />
              </div>
              
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">하위 페이지 지원</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={pageEditData.has_subpages} onChange={e => setPageEditData({...pageEditData, has_subpages: e.target.checked})} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">숨기기 옵션</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={pageEditData.is_hidden} onChange={e => setPageEditData({...pageEditData, is_hidden: e.target.checked})} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
                </label>
              </div>
            </div>
            
            <div className="mt-8 flex justify-between items-center">
              <button onClick={() => handleDeletePage(pageSettingsId)} className="text-sm font-medium text-red-500 hover:text-red-600">페이지 삭제</button>
              <div className="flex gap-3">
                <button onClick={() => setPageSettingsId(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">취소</button>
                <button onClick={handleUpdatePage} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">저장</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
