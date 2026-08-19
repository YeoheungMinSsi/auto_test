import { useState, useEffect } from "react";
import { Trash2, Edit3, Plus, ArrowLeft, FileText } from "lucide-react";
import NotionEditor from "./NotionEditor";

interface ProjectsProps {
  selectedProjectId: string | null;
  selectedDocId: string | null;
  onNavigate: (projId: string | null, docId: string | null) => void;
  isDarkMode: boolean;
  customPageId?: string;
  customPageTitle?: string;
  customPageIcon?: string;
  customPageDescription?: string;
  onWorkspaceUpdate?: () => void;
  language?: "ko" | "en";
}

const PROJECT_PAGE_ICONS = ["📄", "📝", "🚀", "📊", "💡", "📚", "⚙️", "📁", "🎨", "🔬", "📌", "🎯", "💻", "📂", "✨", "🔍", "⚡", "🔒", "🛠️", "💬"];

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
  tasks: Task[];
  documents?: Record<string, Document>;
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

interface Document {
  id: string;
  title: string;
  parent_id: string | null;
  blocks: any[];
}

export default function Projects({ 
  selectedProjectId, 
  selectedDocId, 
  onNavigate, 
  isDarkMode, 
  customPageId, 
  customPageTitle, 
  customPageIcon, 
  customPageDescription, 
  onWorkspaceUpdate,
  language = "ko"
}: ProjectsProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showIconPopover, setShowIconPopover] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newProjDesc, setNewProjDesc] = useState("");
  
  // 프로젝트 편집 모달 상태
  const [editProjId, setEditProjId] = useState<string | null>(null);
  const [editProjName, setEditProjName] = useState("");
  const [editProjStatus, setEditProjStatus] = useState("계획 중");

  // 상세 보기 상태
  const [projectDetail, setProjectDetail] = useState<Project | null>(null);

  // 새 문서 상태
  const [newDocTitle, setNewDocTitle] = useState("");
  const [addingDocParentId, setAddingDocParentId] = useState<string | null>(null);
  const [showDocModal, setShowDocModal] = useState(false);

  // 프로젝트 목록 로드
  const loadProjects = () => {
    fetch(`http://localhost:8000/api/projects?page_id=${customPageId || "progress"}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProjects(data);
        }
      })
      .catch(err => console.error("Error loading projects:", err));
  };

  useEffect(() => {
    loadProjects();
  }, [selectedProjectId, customPageId]); // customPageId 변경시에도 재로드 필요

  // 단일 프로젝트 상세 로드 함수
  const loadProjectDetail = (projId: string) => {
    fetch(`http://localhost:8000/api/projects/${projId}?page_id=${customPageId || "progress"}`)
      .then(res => res.json())
      .then(data => {
        setProjectDetail(data);
      })
      .catch(err => console.error("Error loading project detail:", err));
  };

  useEffect(() => {
    if (selectedProjectId) {
      fetch(`http://localhost:8000/api/projects/${selectedProjectId}?page_id=${customPageId || "progress"}`)
        .then(res => res.json())
        .then(data => {
          setProjectDetail(data);
        })
        .catch(err => console.error("Error loading project detail:", err));
    } else {
      setProjectDetail(null);
    }
  }, [selectedProjectId, selectedDocId, customPageId]);

  // 프로젝트 생성
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;

    fetch(`http://localhost:8000/api/projects?page_id=${customPageId || "progress"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newProjName, description: newProjDesc })
    })
      .then(res => res.json())
      .then(() => {
        setNewProjName("");
        setNewProjDesc("");
        setShowAddModal(false);
        loadProjects();
        onWorkspaceUpdate?.();
      })
      .catch(err => console.error("Error creating project:", err));
  };

  // 프로젝트 삭제
  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("이 프로젝트를 정말 삭제하시겠습니까?")) return;

    fetch(`http://localhost:8000/api/projects/${id}?page_id=${customPageId || "progress"}`, {
      method: "DELETE"
    })
      .then(() => {
        if (selectedProjectId === id) {
          onNavigate(null, null);
        }
        loadProjects();
        onWorkspaceUpdate?.();
      })
      .catch(err => console.error("Error deleting project:", err));
  };

  // 프로젝트 수정 적용
  const handleUpdateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProjId || !editProjName.trim()) return;

    fetch(`http://localhost:8000/api/projects/${editProjId}?page_id=${customPageId || "progress"}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editProjName, status: editProjStatus })
    })
      .then(() => {
        setEditProjId(null);
        loadProjects();
        onWorkspaceUpdate?.();
      })
      .catch(err => console.error("Error updating project:", err));
  };

  // 문서 생성
  const handleCreateDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim() || !selectedProjectId) return;

    fetch(`http://localhost:8000/api/projects/${selectedProjectId}/documents?page_id=${customPageId || "progress"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newDocTitle, parent_id: addingDocParentId })
    })
      .then(res => res.json())
      .then(data => {
        setNewDocTitle("");
        setAddingDocParentId(null);
        setShowDocModal(false);
        // 생성된 문서를 즉시 바라보도록 이동
        onNavigate(selectedProjectId, data.id);
      })
      .catch(err => console.error("Error creating document:", err));
  };

  // 문서 삭제
  const handleDeleteDocument = (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedProjectId || !confirm("이 문서를 삭제하시겠습니까? 하위 문서도 모두 함께 삭제됩니다.")) return;

    fetch(`http://localhost:8000/api/projects/${selectedProjectId}/documents/${docId}?page_id=${customPageId || "progress"}`, {
      method: "DELETE"
    })
      .then(() => {
        onNavigate(selectedProjectId, null);
      })
      .catch(err => console.error("Error deleting document:", err));
  };

  // 계층형 문서 트리 그리기
  const renderDetailDocTree = (docs: Record<string, Document>, parentId: string | null = null, level: number = 0) => {
    const list = Object.values(docs).filter(d => d.parent_id === parentId);
    if (list.length === 0) return null;

    return (
      <div className="space-y-1 mt-1">
        {list.map(doc => {
          const isSelected = selectedDocId === doc.id;
          return (
            <div key={doc.id} className="flex flex-col">
              <div 
                style={{ paddingLeft: `${level * 12 + 8}px` }}
                onClick={() => onNavigate(selectedProjectId, doc.id)}
                className={`flex items-center justify-between py-1.5 px-3 rounded-lg text-sm cursor-pointer transition-colors ${
                  isSelected ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText size={16} className={isSelected ? "text-blue-500" : "text-gray-400"} />
                  <span className="truncate">{doc.title}</span>
                </div>
                <div className="flex items-center gap-1.5 opacity-0 hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddingDocParentId(doc.id);
                      setShowDocModal(true);
                    }}
                    className="p-1 text-[10px] bg-gray-200 text-gray-700 hover:bg-gray-300 rounded font-bold"
                  >
                    + 하위
                  </button>
                  <button 
                    onClick={(e) => handleDeleteDocument(doc.id, e)}
                    className="p-1 text-[10px] bg-red-100 text-red-600 hover:bg-red-200 rounded"
                  >
                    삭제
                  </button>
                </div>
              </div>
              {renderDetailDocTree(docs, doc.id, level + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "완료": return "bg-green-500 text-white";
      case "진행 중": return "bg-blue-500 text-white";
      default: return "bg-gray-400 text-white";
    }
  };

  const handleUpdatePageIcon = (icon: string) => {
    if (!customPageId) return;
    fetch(`http://localhost:8000/api/workspace/pages/${customPageId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ icon })
    }).then(() => {
      onWorkspaceUpdate?.();
      setShowIconPopover(false);
    }).catch(err => console.error(err));
  };

  // ------------------ 리스트 화면 ------------------
  if (!selectedProjectId) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between bg-white dark:bg-[#1e1e1e] p-6 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm transition-colors relative">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 relative">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => customPageId && setShowIconPopover(!showIconPopover)}
                  className={`text-2xl p-1 rounded-xl transition-all ${
                    customPageId ? "hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer hover:scale-110" : ""
                  }`}
                  title={customPageId ? "클릭하여 아이콘 변경" : "기본 프로젝트"}
                >
                  {customPageIcon || "📊"}
                </button>

                {showIconPopover && customPageId && (
                  <div className="absolute left-0 top-10 bg-white dark:bg-[#252525] border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-2xl z-50 w-64">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">페이지 아이콘 변경</div>
                    <div className="grid grid-cols-5 gap-1.5 max-h-36 overflow-y-auto">
                      {PROJECT_PAGE_ICONS.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => handleUpdatePageIcon(icon)}
                          className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                            (customPageIcon || "📊") === icon 
                              ? "bg-blue-500 text-white shadow-md scale-105" 
                              : "hover:bg-gray-100 dark:hover:bg-gray-800"
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <span>{customPageTitle || "프로젝트 진행 상황 대시보드"}</span>
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {customPageDescription || "연구 계획, 개발 스케줄, Todo 리스트와 개발 노트를 계층적으로 정돈하여 기획을 관리하세요."}
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm flex items-center gap-2 shadow-lg shadow-blue-500/10 transition-all"
          >
            <Plus size={16} /> 새 프로젝트 생성
          </button>
        </div>

        {/* 프로젝트 그리드 목록 */}
        {projects.length === 0 ? (
          <div className="h-64 border border-dashed rounded-2xl flex items-center justify-center text-gray-400 italic">
            등록된 프로젝트가 없습니다. 위의 버튼을 눌러 첫 프로젝트를 만들어 보세요!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {projects.map(proj => (
              <div 
                key={proj.id}
                onClick={() => onNavigate(proj.id, null)}
                className="bg-white rounded-2xl border border-gray-200/80 p-5 hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between h-48 group relative hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(proj.status)}`}>
                      {proj.status}
                    </span>
                    
                    {/* 설정용 드롭다운 대신 간단한 조작 버튼 배치 */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditProjId(proj.id);
                          setEditProjName(proj.name);
                          setEditProjStatus(proj.status);
                        }}
                        className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-800"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteProject(proj.id, e)}
                        className="p-1 hover:bg-red-50 rounded text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-base line-clamp-1">
                    📁 {proj.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-2 line-clamp-3 leading-relaxed">
                    {proj.description || "등록된 설명이 없습니다."}
                  </p>
                </div>
                
                <div className="text-[10px] text-gray-400 border-t pt-2 flex items-center justify-between">
                  <span>생성: {proj.created_at.substring(0, 10)}</span>
                  <span>할 일: {proj.tasks.filter(t => t.completed).length}/{proj.tasks.length}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 프로젝트 추가 모달 */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl border p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-lg font-bold mb-4 text-gray-950">새 프로젝트 생성</h3>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">프로젝트 이름</label>
                  <input 
                    type="text" required
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border rounded-xl focus:outline-none focus:border-blue-500 bg-gray-50"
                    placeholder="예: 논문 자동화 설계"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">설명 / 기획 내용</label>
                  <textarea 
                    value={newProjDesc}
                    onChange={(e) => setNewProjDesc(e.target.value)}
                    rows={4}
                    className="w-full px-3.5 py-2 text-sm border rounded-xl focus:outline-none focus:border-blue-500 bg-gray-50"
                    placeholder="기본적인 Implementation Plan을 적어주세요."
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-500/10"
                  >
                    생성하기
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 프로젝트 수정 모달 */}
        {editProjId && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl border p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-lg font-bold mb-4">프로젝트 설정 변경</h3>
              <form onSubmit={handleUpdateProject} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">프로젝트명</label>
                  <input 
                    type="text" required
                    value={editProjName}
                    onChange={(e) => setEditProjName(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border rounded-xl focus:outline-none bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">상태 변경</label>
                  <select 
                    value={editProjStatus}
                    onChange={(e) => setEditProjStatus(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border rounded-xl focus:outline-none bg-white"
                  >
                    <option value="계획 중">계획 중</option>
                    <option value="진행 중">진행 중</option>
                    <option value="완료">완료</option>
                  </select>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button 
                    type="button"
                    onClick={() => setEditProjId(null)}
                    className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600"
                  >
                    취소
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
                  >
                    변경 적용
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ------------------ 상세 화면 (Project Overview & Notion Editor) ------------------
  if (!projectDetail) {
    return <div className="p-8 text-center text-gray-500">{language === "en" ? "Loading..." : "로딩 중..."}</div>;
  }

  const rootDocs = Object.values(projectDetail.documents || {}).filter(d => d.parent_id === null);
  const allDocs = Object.values(projectDetail.documents || {});

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white dark:bg-[#121212] transition-colors">
      {/* 상세 헤더 */}
      <div className="px-6 py-4 border-b border-gray-200/60 dark:border-gray-800 bg-[#fafafa] dark:bg-[#1a1a1a] flex items-center justify-between shrink-0 transition-colors">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onNavigate(null, null)}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400 transition-colors"
            title={language === "en" ? "Back to project list" : "프로젝트 목록으로 이동"}
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2">
            <h2 
              onClick={() => onNavigate(selectedProjectId, null)}
              className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="프로젝트 홈으로 이동"
            >
              📁 {projectDetail.name}
            </h2>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(projectDetail.status)}`}>
              {projectDetail.status}
            </span>
          </div>

          {selectedDocId && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 pl-2 border-l border-gray-200 dark:border-gray-700">
              <button 
                onClick={() => onNavigate(selectedProjectId, null)}
                className="hover:text-blue-500 hover:underline cursor-pointer"
              >
                {language === "en" ? "Overview" : "개요"}
              </button>
              <span>/</span>
              <span className="text-gray-800 dark:text-gray-200 font-semibold truncate max-w-[200px]">
                {projectDetail.documents?.[selectedDocId]?.title || (language === "en" ? "Untitled" : "제목 없음")}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedDocId && (
            <button
              onClick={() => onNavigate(selectedProjectId, null)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
            >
              🏠 {language === "en" ? "Project Home" : "프로젝트 홈"}
            </button>
          )}
          <button
            onClick={() => {
              setAddingDocParentId(null);
              setShowDocModal(true);
            }}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus size={14} /> {language === "en" ? "New Document" : "새 문서 추가"}
          </button>
        </div>
      </div>

      {/* 메인 내용 렌더링 */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex divide-x divide-gray-200/60 dark:divide-gray-800">
          {/* 좌측 문서 트리 영역 */}
          <div className="w-64 bg-[#fbfbfa] dark:bg-[#181818] p-4 flex flex-col justify-between shrink-0 h-full overflow-y-auto transition-colors">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                <span 
                  onClick={() => onNavigate(selectedProjectId, null)}
                  className="cursor-pointer hover:text-blue-500 transition-colors"
                >
                  📑 {language === "en" ? "Document Tree" : "문서 트리"}
                </span>
                <button 
                  onClick={() => {
                    setAddingDocParentId(null);
                    setShowDocModal(true);
                  }}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 transition-colors"
                  title="루트 문서 추가"
                >
                  <Plus size={14} />
                </button>
              </div>
              
              {projectDetail.documents && Object.keys(projectDetail.documents).length > 0 ? (
                renderDetailDocTree(projectDetail.documents, null)
              ) : (
                <div className="text-xs text-gray-400 italic p-3 text-center">
                  {language === "en" ? "No documents yet" : "생성된 문서가 없습니다."}
                </div>
              )}
            </div>
          </div>

          {/* 우측 화면 (문서 에디터 또는 프로젝트 홈 개요 대시보드) */}
          <div className="flex-1 h-full overflow-y-auto">
            {selectedDocId && projectDetail.documents?.[selectedDocId] ? (
              <div className="h-full flex flex-col">
                <NotionEditor 
                  projectId={projectDetail.id}
                  docId={selectedDocId} 
                  docTitle={projectDetail.documents[selectedDocId].title}
                  isDarkMode={isDarkMode}
                  pageId={customPageId}
                  language={language}
                  onNavigate={onNavigate}
                  onWorkspaceUpdate={() => {
                    loadProjectDetail(projectDetail.id);
                    onWorkspaceUpdate?.();
                  }}
                />
              </div>
            ) : (
              /* 프로젝트 홈 / 개요 대시보드 화면 */
              <div className="p-10 max-w-5xl mx-auto space-y-8">
                {/* 프로젝트 정보 헤더 카드 */}
                <div className="bg-gradient-to-br from-white to-gray-50 dark:from-[#1e1e1e] dark:to-[#181818] p-8 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-3xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-3">
                        <span>📁</span>
                        <span>{projectDetail.name}</span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed max-w-2xl">
                        {projectDetail.description || (language === "en" ? "No description provided." : "프로젝트에 대한 설명이 등록되지 않았습니다.")}
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${getStatusColor(projectDetail.status)} shadow-sm`}>
                      {projectDetail.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-6 pt-2 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800">
                    <div>
                      <span className="font-semibold">{language === "en" ? "Total Documents:" : "총 문서 수:"}</span>{" "}
                      <span className="font-bold text-gray-700 dark:text-gray-300">{allDocs.length}개</span>
                    </div>
                    <div>
                      <span className="font-semibold">{language === "en" ? "Root Documents:" : "루트 문서 수:"}</span>{" "}
                      <span className="font-bold text-gray-700 dark:text-gray-300">{rootDocs.length}개</span>
                    </div>
                  </div>
                </div>

                {/* 하위 문서 및 페이지 그리드 섹션 */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <FileText size={18} className="text-blue-500" />
                      <span>{language === "en" ? "Project Documents & Sub-pages" : "프로젝트 하위 문서 및 페이지 목록"}</span>
                    </h3>
                    <button
                      onClick={() => {
                        setAddingDocParentId(null);
                        setShowDocModal(true);
                      }}
                      className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} /> {language === "en" ? "Add Document" : "새 문서 추가"}
                    </button>
                  </div>

                  {allDocs.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {allDocs.map((doc) => {
                        const childCount = allDocs.filter(d => d.parent_id === doc.id).length;
                        return (
                          <div
                            key={doc.id}
                            onClick={() => onNavigate(selectedProjectId, doc.id)}
                            className="p-5 bg-white dark:bg-[#1e1e1e] border border-gray-200/80 dark:border-gray-800 rounded-2xl hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between group h-36 relative"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg font-bold shrink-0 group-hover:scale-110 transition-transform">
                                  📄
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {doc.title}
                                  </h4>
                                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                    {doc.parent_id ? "하위 문서" : "루트 문서"}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={(e) => handleDeleteDocument(doc.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded-md transition-all"
                                title="문서 삭제"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800/60 text-xs text-gray-400">
                              <span className="text-[11px]">
                                {childCount > 0 ? `하위 페이지 ${childCount}개` : "단일 문서"}
                              </span>
                              <span className="text-blue-500 group-hover:translate-x-1 transition-transform font-bold">
                                열기 →
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {/* 새 문서 생성 카드 */}
                      <div
                        onClick={() => {
                          setAddingDocParentId(null);
                          setShowDocModal(true);
                        }}
                        className="p-5 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-950/10 cursor-pointer transition-all flex flex-col items-center justify-center gap-2 h-36 text-center group"
                      >
                        <Plus size={24} className="text-gray-400 group-hover:text-blue-500 group-hover:scale-110 transition-all" />
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {language === "en" ? "Create New Document" : "새 문서 생성하기"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => {
                        setAddingDocParentId(null);
                        setShowDocModal(true);
                      }}
                      className="p-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-center space-y-3 cursor-pointer hover:border-blue-500 transition-all"
                    >
                      <div className="text-4xl">📄</div>
                      <div className="text-sm font-bold text-gray-700 dark:text-gray-300">
                        {language === "en" ? "No documents yet" : "생성된 문서가 없습니다."}
                      </div>
                      <div className="text-xs text-gray-400">
                        {language === "en" ? "Click to create the first document for this project." : "이 프로젝트의 첫 문서를 생성하고 기획을 시작하세요."}
                      </div>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md">
                        + {language === "en" ? "Create First Document" : "첫 문서 생성"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 새 문서 생성 모달 */}
      {showDocModal && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              {addingDocParentId ? (language === "en" ? "Create Sub-Document" : "하위 문서 생성") : (language === "en" ? "Create Root Document" : "루트 문서 생성")}
            </h3>
            <form onSubmit={handleCreateDocument} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">
                  {language === "en" ? "Document Title" : "문서 제목"}
                </label>
                <input 
                  type="text" 
                  required
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="예: 개발 파트별 설계 기획"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button 
                  type="button"
                  onClick={() => {
                    setShowDocModal(false);
                    setAddingDocParentId(null);
                  }}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  취소
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700"
                >
                  문서 만들기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
