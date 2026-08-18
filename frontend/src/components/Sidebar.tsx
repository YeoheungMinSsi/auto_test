import { useEffect, useState } from "react";
import { FileText, Home, Rocket, BarChart2, BookOpen, ChevronRight, ChevronDown, Plus, MoreHorizontal, Sun, Moon, Settings, MoreVertical, X, Globe } from "lucide-react";

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string, projId?: string | null, docId?: string | null) => void;
  selectedProjectId: string | null;
  selectedDocId: string | null;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  workspaceData?: any;
  onWorkspaceUpdate?: () => void;
  language?: "ko" | "en";
  onLanguageChange?: (lang: "ko" | "en") => void;
}

interface Project {
  id: string;
  name: string;
  status: string;
  documents?: Record<string, any>;
}

const SIDEBAR_ICONS = ["📄", "📝", "🚀", "📊", "💡", "📚", "⚙️", "📁", "🎨", "🔬", "📌", "🎯", "💻", "📂", "✨", "🔍", "⚡", "🔒", "🛠️", "💬"];

export default function Sidebar({ 
  currentView, 
  onNavigate, 
  selectedProjectId, 
  selectedDocId, 
  isDarkMode, 
  onToggleDarkMode, 
  workspaceData, 
  onWorkspaceUpdate,
  language = "ko",
  onLanguageChange
}: SidebarProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [showColorPopover, setShowColorPopover] = useState(false);
  const [workspaceColor, setWorkspaceColor] = useState(() => {
    return localStorage.getItem("workspaceColor") || "from-blue-500 to-indigo-600";
  });

  const [showWorkspaceSettings, setShowWorkspaceSettings] = useState(false);
  const [workspaceNameInput, setWorkspaceNameInput] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<"ko" | "en">(language);

  const [pageSettingsId, setPageSettingsId] = useState<string | null>(null);
  const [pageEditData, setPageEditData] = useState({ title: "", description: "", icon: "📄", has_subpages: false, is_hidden: false });

  // 현재 뷰가 하위 페이지 지원을 가진 커스텀 페이지인지 판별
  const currentCustomPage = workspaceData?.custom_pages?.find((p: any) => p.id === currentView);
  const isCustomSubpage = currentCustomPage && currentCustomPage.has_subpages;
  const activePageId = isCustomSubpage ? currentView : "progress";

  const loadSidebarProjects = () => {
    fetch(`http://localhost:8000/api/projects?page_id=${activePageId}`)
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
  }, [currentView, selectedProjectId, activePageId]);

  useEffect(() => {
    setSelectedLanguage(language);
  }, [language]);

  const toggleExpand = (pid: string) => {
    setExpandedProjects(prev => ({ ...prev, [pid]: !prev[pid] }));
  };

  const handleAddProject = (e: React.MouseEvent, forcePageId?: string) => {
    e.stopPropagation();
    const targetId = forcePageId || activePageId;
    const name = prompt(language === "en" ? "Enter new project name:" : "새로운 프로젝트의 이름을 입력하세요:");
    if (!name || !name.trim()) return;

    fetch(`http://localhost:8000/api/projects?page_id=${targetId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: "" })
    })
      .then(res => res.json())
      .then((newProj) => {
        loadSidebarProjects();
        onWorkspaceUpdate?.();
        const targetView = targetId === "progress" ? "projects" : targetId;
        onNavigate(targetView, newProj.id, null);
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
      if (onLanguageChange && selectedLanguage !== language) {
        onLanguageChange(selectedLanguage);
      }
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
    if (window.confirm(language === "en" ? "Are you sure you want to delete this page?" : "이 페이지를 삭제하시겠습니까?")) {
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
      <div className={`space-y-0.5 ${level > 0 ? "pl-2.5 border-l border-gray-200/60 dark:border-gray-700" : ""}`}>
        {docList.map(doc => {
          const isSelected = selectedDocId === doc.id;
          const hasChildren = Object.values(docs).some(d => d.parent_id === doc.id);
          return (
            <div key={doc.id} className="space-y-0.5">
              <div 
                onClick={() => onNavigate(isCustomSubpage ? currentView : "projects", projectId, doc.id)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs cursor-pointer transition-colors ${
                  isSelected ? "bg-blue-100/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold" : "text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-800"
                }`}
              >
                <FileText size={12} className="shrink-0 text-gray-400" />
                <span className="truncate flex-1">{doc.title}</span>
              </div>
              {hasChildren && renderDocTree(docs, projectId, doc.id, level + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  const shouldShowProjects = currentView === "projects" || isCustomSubpage;

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
            setSelectedLanguage(language);
            setShowWorkspaceSettings(true);
          }} className="p-1 hover:bg-gray-300 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors" title="설정">
            <Settings size={14} />
          </button>
        </div>

        {/* 상단 네비게이션 */}
        <div className="p-2 space-y-0.5 border-b border-gray-200/40 dark:border-gray-800/80 text-xs shrink-0">
          <div 
            onClick={() => onNavigate("home")}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all ${
              currentView === "home" ? "bg-gray-200/80 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold" : "text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-800"
            }`}
          >
            <Home size={16} /> <span>{language === "en" ? "Home" : "홈"}</span>
          </div>
          <div 
            onClick={() => onNavigate("automation")}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all ${
              currentView === "automation" ? "bg-gray-200/80 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold" : "text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-800"
            }`}
          >
            <Rocket size={16} /> <span>🚀 {language === "en" ? "Paper Automation" : "논문 자동화"}</span>
          </div>
          <div 
            onClick={() => onNavigate("projects", null, null)}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-all group ${
              currentView === "projects" && !selectedProjectId ? "bg-gray-200/80 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold" : "text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart2 size={16} /> <span>📊 {language === "en" ? "Progress" : "진행 상황"}</span>
            </div>
            <button
              type="button"
              onClick={(e) => handleAddProject(e, "progress")}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-300 dark:hover:bg-gray-700 rounded text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-all"
              title={language === "en" ? "New Project" : "새 프로젝트 생성"}
            >
              <Plus size={13} />
            </button>
          </div>
          <div 
            onClick={() => onNavigate("blog")}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all ${
              currentView === "blog" ? "bg-gray-200/80 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold" : "text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-800"
            }`}
          >
            <BookOpen size={16} /> <span>📝 {language === "en" ? "Blog" : "블로그 관리"}</span>
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
                  <span className="text-sm shrink-0">{page.icon || "📄"}</span> <span className="truncate">{page.title}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  {page.has_subpages && (
                    <button
                      type="button"
                      onClick={(e) => handleAddProject(e, page.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all"
                      title={language === "en" ? "Add Project" : "프로젝트 추가"}
                    >
                      <Plus size={13} />
                    </button>
                  )}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setPageEditData({ 
                        title: page.title, 
                        description: page.description || "", 
                        icon: page.icon || "📄", 
                        has_subpages: page.has_subpages, 
                        is_hidden: page.is_hidden 
                      });
                      setPageSettingsId(page.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all flex items-center justify-center cursor-pointer"
                    title={language === "en" ? "Page Settings" : "페이지 설정"}
                  >
                    <MoreVertical size={14} className="pointer-events-none" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 프로젝트 진행 리스트 */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {shouldShowProjects && (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 select-none relative group">
                <span className="flex items-center gap-1 font-extrabold text-indigo-500 dark:text-indigo-400 truncate">
                  <BarChart2 size={11} /> {isCustomSubpage ? currentCustomPage?.title : (language === "en" ? "Workspace Projects" : "프로젝트 목록")}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => handleAddProject(e)}
                    className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                    title={language === "en" ? "Add Project" : "프로젝트 추가"}
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
                  <div className="px-2.5 text-xs text-gray-400 italic">
                    {language === "en" ? "No projects found" : "등록된 프로젝트 없음"}
                  </div>
                ) : (
                  projects.map(project => (
                    <div key={project.id} className="space-y-0.5">
                      <div 
                        onClick={() => {
                          toggleExpand(project.id);
                          onNavigate(isCustomSubpage ? currentView : "projects", project.id, null);
                        }}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-all group ${
                          selectedProjectId === project.id ? "bg-gray-200/80 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold" : "text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-800"
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 truncate">
                          {expandedProjects[project.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          <span className="truncate">{project.name}</span>
                        </div>
                      </div>

                      {expandedProjects[project.id] && project.documents && (
                        <div className="mt-0.5 space-y-0.5 border-l border-gray-200 dark:border-gray-700 ml-2.5">
                          {renderDocTree(project.documents, project.id, null)}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 하단 제어부 및 다크모드 스위치 */}
      <div className="p-3 border-t border-gray-200/60 dark:border-gray-800 flex items-center justify-between shrink-0 bg-[#f7f7f5] dark:bg-[#1e1e1e] transition-colors">
        <div className="text-[10px] text-gray-400 font-semibold uppercase">{language === "en" ? "Theme" : "테마"}</div>
        <button 
          onClick={onToggleDarkMode}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-800 transition-all border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-[#2a2a2a]"
        >
          {isDarkMode ? <Sun size={13} className="text-amber-500" /> : <Moon size={13} className="text-indigo-500" />}
          <span>{isDarkMode ? (language === "en" ? "Light" : "라이트") : (language === "en" ? "Dark" : "다크")}</span>
        </button>
      </div>

      {/* 워크스페이스 설정 모달 */}
      {showWorkspaceSettings && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                {language === "en" ? "Workspace Settings" : "워크스페이스 설정"}
              </h2>
              <button onClick={() => setShowWorkspaceSettings(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === "en" ? "Workspace Name" : "워크스페이스 이름"}
                </label>
                <input 
                  type="text" 
                  value={workspaceNameInput}
                  onChange={e => setWorkspaceNameInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-[#121212] dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                  <Globe size={14} /> {language === "en" ? "Language (Editor & UI)" : "언어 설정 (에디터 및 UI)"}
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedLanguage("ko")}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                      selectedLanguage === "ko"
                        ? "bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-600 dark:text-blue-400 shadow-sm"
                        : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    🇰🇷 한국어 (Korean)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedLanguage("en")}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                      selectedLanguage === "en"
                        ? "bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-600 dark:text-blue-400 shadow-sm"
                        : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    🇺🇸 English (영어)
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowWorkspaceSettings(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">{language === "en" ? "Cancel" : "취소"}</button>
              <button onClick={handleUpdateWorkspace} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">{language === "en" ? "Save" : "저장"}</button>
            </div>
          </div>
        </div>
      )}

      {/* 커스텀 페이지 관리 모달 */}
      {pageSettingsId && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                {language === "en" ? "Page Settings" : "페이지 설정"}
              </h2>
              <button onClick={() => setPageSettingsId(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === "en" ? "Change Icon" : "아이콘 수정"}
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 max-h-28 overflow-y-auto">
                  {SIDEBAR_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setPageEditData({ ...pageEditData, icon })}
                      className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all ${
                        (pageEditData.icon || "📄") === icon 
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === "en" ? "Page Title" : "페이지 제목"}
                </label>
                <input 
                  type="text" 
                  value={pageEditData.title}
                  onChange={e => setPageEditData({...pageEditData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-[#121212] dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === "en" ? "Page Description" : "페이지 설명"}
                </label>
                <input 
                  type="text" 
                  value={pageEditData.description || ""}
                  onChange={e => setPageEditData({...pageEditData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-[#121212] dark:text-white text-sm"
                  placeholder={language === "en" ? "Enter a brief description." : "페이지에 대한 짧은 설명을 입력하세요."}
                />
              </div>
              
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {language === "en" ? "Sub-page support" : "하위 페이지 지원"}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={pageEditData.has_subpages} onChange={e => setPageEditData({...pageEditData, has_subpages: e.target.checked})} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {language === "en" ? "Hide page" : "숨기기 옵션"}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={pageEditData.is_hidden} onChange={e => setPageEditData({...pageEditData, is_hidden: e.target.checked})} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
                </label>
              </div>
            </div>
            
            <div className="mt-8 flex justify-between items-center">
              <button onClick={() => handleDeletePage(pageSettingsId)} className="text-sm font-medium text-red-500 hover:text-red-600">{language === "en" ? "Delete" : "페이지 삭제"}</button>
              <div className="flex gap-3">
                <button onClick={() => setPageSettingsId(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">{language === "en" ? "Cancel" : "취소"}</button>
                <button onClick={handleUpdatePage} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">{language === "en" ? "Save" : "저장"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
