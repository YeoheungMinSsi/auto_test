import { useState, useEffect } from "react";
import { CheckSquare, Square, Plus, Trash2, ListTodo } from "lucide-react";

interface TodoListProps {
  isDarkMode?: boolean;
  language?: "ko" | "en";
  workspaceData?: any;
  onNavigateProject?: (projectId: string) => void;
}

interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  projectId: string;
  projectName: string;
  pageId: string;
  pageTitle: string;
}

interface ProjectData {
  id: string;
  name: string;
  tasks: Array<{ id: string; title: string; completed: boolean }>;
}

export default function TodoList({ language = "ko", workspaceData, onNavigateProject }: TodoListProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projectsList, setProjectsList] = useState<Array<{ id: string; name: string; pageId: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>("all");

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [targetProjectId, setTargetProjectId] = useState<string>("");

  const loadAllTasks = async () => {
    try {
      setIsLoading(true);
      const allTasksList: TaskItem[] = [];
      const projs: Array<{ id: string; name: string; pageId: string }> = [];

      // 1. 기본 진행 상황 (progress) 프로젝트 로드
      const resProgress = await fetch("http://localhost:8000/api/projects?page_id=progress");
      if (resProgress.ok) {
        const data: ProjectData[] = await resProgress.json();
        if (Array.isArray(data)) {
          data.forEach(p => {
            projs.push({ id: p.id, name: p.name, pageId: "progress" });
            (p.tasks || []).forEach(t => {
              allTasksList.push({
                ...t,
                projectId: p.id,
                projectName: p.name,
                pageId: "progress",
                pageTitle: language === "en" ? "Progress" : "진행 상황"
              });
            });
          });
        }
      }

      // 2. 커스텀 하위 페이지의 프로젝트 로드
      const customPages = workspaceData?.custom_pages || [];
      for (const page of customPages) {
        if (page.has_subpages) {
          try {
            const resCustom = await fetch(`http://localhost:8000/api/projects?page_id=${page.id}`);
            if (resCustom.ok) {
              const data: ProjectData[] = await resCustom.json();
              if (Array.isArray(data)) {
                data.forEach(p => {
                  projs.push({ id: p.id, name: p.name, pageId: page.id });
                  (p.tasks || []).forEach(t => {
                    allTasksList.push({
                      ...t,
                      projectId: p.id,
                      projectName: p.name,
                      pageId: page.id,
                      pageTitle: page.title
                    });
                  });
                });
              }
            }
          } catch (e) {
            console.error(e);
          }
        }
      }

      setProjectsList(projs);
      if (projs.length > 0 && !targetProjectId) {
        setTargetProjectId(projs[0].id);
      }
      setTasks(allTasksList);
    } catch (err) {
      console.error("Error loading all tasks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllTasks();
  }, [workspaceData]);

  // 실시간 토글 (낙관적 업데이트)
  const handleToggleTask = (task: TaskItem) => {
    const newStatus = !task.completed;
    setTasks(prev => prev.map(t => (t.id === task.id && t.projectId === task.projectId ? { ...t, completed: newStatus } : t)));

    fetch(`http://localhost:8000/api/projects/${task.projectId}/tasks/${task.id}?page_id=${task.pageId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: newStatus })
    }).catch(err => {
      console.error("Error toggling task:", err);
      loadAllTasks();
    });
  };

  // 실시간 삭제 (낙관적 업데이트)
  const handleDeleteTask = (task: TaskItem) => {
    setTasks(prev => prev.filter(t => !(t.id === task.id && t.projectId === task.projectId)));

    fetch(`http://localhost:8000/api/projects/${task.projectId}/tasks/${task.id}?page_id=${task.pageId}`, {
      method: "DELETE"
    }).catch(err => {
      console.error("Error deleting task:", err);
      loadAllTasks();
    });
  };

  // 새 할 일 추가
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !targetProjectId) return;

    const targetProj = projectsList.find(p => p.id === targetProjectId);
    if (!targetProj) return;

    const tempId = "temp-" + Date.now();
    const titleToAdd = newTaskTitle.trim();
    setNewTaskTitle("");

    const newTaskItem: TaskItem = {
      id: tempId,
      title: titleToAdd,
      completed: false,
      projectId: targetProj.id,
      projectName: targetProj.name,
      pageId: targetProj.pageId,
      pageTitle: targetProj.pageId === "progress" ? (language === "en" ? "Progress" : "진행 상황") : targetProj.name
    };

    setTasks(prev => [newTaskItem, ...prev]);

    fetch(`http://localhost:8000/api/projects/${targetProj.id}/tasks?page_id=${targetProj.pageId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: titleToAdd })
    })
      .then(res => res.json())
      .then(() => {
        loadAllTasks();
      })
      .catch(err => {
        console.error("Error adding task:", err);
        loadAllTasks();
      });
  };

  // 필터링 적용
  const filteredTasks = tasks.filter(t => {
    if (selectedProjectFilter !== "all" && t.projectId !== selectedProjectFilter) return false;
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });

  const totalCount = tasks.length;
  const completedCount = tasks.filter(t => t.completed).length;
  const activeCount = totalCount - completedCount;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="flex-1 p-8 max-w-5xl mx-auto space-y-6 overflow-y-auto h-full">
      {/* 대시보드 헤더 */}
      <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
              <ListTodo size={24} />
            </span>
            <span>{language === "en" ? "Global Todo Dashboard" : "통합 할 일 대시보드"}</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {language === "en" 
              ? "Manage all tasks across your workspace projects in one place." 
              : "워크스페이스의 모든 프로젝트에 등록된 할 일을 한눈에 모아서 확인하고 관리하세요."}
          </p>
        </div>

        {/* 진행률 바 & 통계 카드 */}
        <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
          <div className="text-center">
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{progressPercent}%</div>
            <div className="text-[10px] text-gray-400 font-semibold uppercase">{language === "en" ? "Completion" : "달성률"}</div>
          </div>
          <div className="h-8 w-px bg-gray-200 dark:bg-gray-700"></div>
          <div className="space-y-1 min-w-[120px]">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-gray-500">{language === "en" ? "Completed" : "완료"}</span>
              <span className="text-green-600 dark:text-green-400 font-mono">{completedCount}/{totalCount}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* 할 일 추가 폼 */}
      <form onSubmit={handleAddTask} className="bg-white dark:bg-[#1e1e1e] p-4 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row gap-3 transition-colors">
        <select
          value={targetProjectId}
          onChange={e => setTargetProjectId(e.target.value)}
          className="px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {projectsList.length === 0 ? (
            <option value="">{language === "en" ? "No project available" : "프로젝트 없음"}</option>
          ) : (
            projectsList.map(p => (
              <option key={p.id} value={p.id}>
                📁 {p.name} ({p.pageId === "progress" ? (language === "en" ? "Progress" : "진행 상황") : "Custom"})
              </option>
            ))
          )}
        </select>

        <input 
          type="text"
          required
          value={newTaskTitle}
          onChange={e => setNewTaskTitle(e.target.value)}
          placeholder={language === "en" ? "Add a new task..." : "새로운 할 일을 입력하세요..."}
          className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          type="submit"
          disabled={projectsList.length === 0}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/10 transition-all cursor-pointer"
        >
          <Plus size={16} /> {language === "en" ? "Add Task" : "할 일 추가"}
        </button>
      </form>

      {/* 필터 툴바 */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/60 p-1 rounded-xl">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === "all" ? "bg-white dark:bg-[#1e1e1e] text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {language === "en" ? "All" : "전체"} ({totalCount})
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === "active" ? "bg-white dark:bg-[#1e1e1e] text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {language === "en" ? "Active" : "진행 중"} ({activeCount})
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === "completed" ? "bg-white dark:bg-[#1e1e1e] text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {language === "en" ? "Completed" : "완료됨"} ({completedCount})
          </button>
        </div>

        {/* 프로젝트별 필터 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-semibold">{language === "en" ? "Filter by project:" : "프로젝트 필터:"}</span>
          <select
            value={selectedProjectFilter}
            onChange={e => setSelectedProjectFilter(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">{language === "en" ? "All Projects" : "모든 프로젝트"}</option>
            {projectsList.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 할 일 목록 */}
      <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200/80 dark:border-gray-800 rounded-2xl divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden shadow-sm transition-colors">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-gray-400 italic">
            {language === "en" ? "Loading tasks..." : "할 일 불러오는 중..."}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="text-3xl">✨</div>
            <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              {language === "en" ? "No tasks found" : "표시할 할 일이 없습니다."}
            </div>
            <div className="text-xs text-gray-400">
              {language === "en" ? "Add a new task above or select a different filter." : "위 폼에서 새로운 할 일을 추가하거나 필터를 변경해 보세요."}
            </div>
          </div>
        ) : (
          filteredTasks.map(task => (
            <div
              key={`${task.projectId}-${task.id}`}
              className="p-4 flex items-center justify-between hover:bg-gray-50/80 dark:hover:bg-[#252525]/50 transition-colors group"
            >
              <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-4">
                <button
                  type="button"
                  onClick={() => handleToggleTask(task)}
                  className="cursor-pointer text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-transform active:scale-90"
                >
                  {task.completed ? (
                    <CheckSquare size={20} className="text-blue-600 dark:text-blue-400" />
                  ) : (
                    <Square size={20} />
                  )}
                </button>

                <div className="flex flex-col min-w-0 flex-1">
                  <span
                    onClick={() => handleToggleTask(task)}
                    className={`text-sm cursor-pointer select-none transition-all ${
                      task.completed
                        ? "line-through text-gray-400 dark:text-gray-500 font-normal"
                        : "text-gray-800 dark:text-gray-200 font-medium"
                    }`}
                  >
                    {task.title}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                    <span 
                      onClick={() => onNavigateProject?.(task.projectId)}
                      className="hover:underline hover:text-blue-500 cursor-pointer flex items-center gap-1"
                    >
                      📁 {task.projectName}
                    </span>
                    <span>•</span>
                    <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.2 rounded text-[10px]">
                      {task.pageTitle}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => handleDeleteTask(task)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all cursor-pointer"
                  title={language === "en" ? "Delete Task" : "할 일 삭제"}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
