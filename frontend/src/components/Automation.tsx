import { useState, useEffect, useRef } from "react";
import { Search, Download, Play, RefreshCw, Layers, CheckCircle2, AlertCircle, Terminal } from "lucide-react";

interface Paper {
  title: string;
  source: string;
  url?: string;
  pdf_url?: string;
  authors?: string | string[];
  year?: string | number;
  doi?: string;
  pdf_path?: string;
}

interface StrapiPaper {
  id: string | number;
  title: string;
  authors?: string;
  published_year?: string | number;
  category?: string;
  doi?: string;
  source_url?: string;
  pdf_path?: string;
  summary?: string;
}

interface TaskStatus {
  status: "queued" | "running" | "completed" | "failed";
  logs: string[];
  returncode: number | null;
}

export default function Automation() {
  const [activeTab, setActiveTab] = useState<"pipeline1" | "pipeline2" | "strapi">("pipeline1");
  
  // 공통 분류(카테고리) 목록
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  
  // 탭 1-1 상태
  const [searchQuery, setSearchQuery] = useState("컴퓨터 비전");
  const [searchLimit, setSearchLimit] = useState(5);
  const [searchSources, setSearchSources] = useState<string[]>(["arxiv", "semantic"]);
  const [searchResults, setSearchResults] = useState<Paper[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPaperCats, setSelectedPaperCats] = useState<Record<number, string>>({});
  const [downloadStatuses, setDownloadStatuses] = useState<Record<number, "idle" | "loading" | "success" | "error">>({});

  // 탭 1-2 상태
  const [autoCategory, setAutoCategory] = useState("");
  const [autoQuery, setAutoQuery] = useState("Quantum Computing");
  const [autoLimit, setAutoLimit] = useState(1);
  const [autoSources, setAutoSources] = useState<string[]>(["arxiv", "semantic"]);
  
  // 탭 2 상태 (PPT)
  const [pptCategory, setPptCategory] = useState("");
  const [pptPapers, setPptPapers] = useState<any[]>([]);
  const [selectedPptPaperIndex, setSelectedPptPaperIndex] = useState<number>(-1);
  
  // 탭 3 상태 (Strapi)
  const [strapiFilterCat, setStrapiFilterCat] = useState("전체보기");
  const [strapiPapers, setStrapiPapers] = useState<StrapiPaper[]>([]);
  const [isStrapiLoading, setIsStrapiLoading] = useState(false);
  const [strapiError, setStrapiError] = useState("");

  // 백그라운드 태스크 제어 관련 상태
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
  const [showLogTerminal, setShowLogTerminal] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // 카테고리 목록 불러오기
  const loadCategories = () => {
    fetch("http://localhost:8000/api/categories")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCategories(data);
          if (data.length > 0) {
            if (!autoCategory) setAutoCategory(data[0]);
            if (!pptCategory) setPptCategory(data[0]);
          }
        }
      })
      .catch(err => console.error("Error loading categories:", err));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // 카테고리 신규 추가
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    fetch("http://localhost:8000/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: newCategoryName.trim() })
    })
      .then(res => res.json())
      .then(() => {
        setNewCategoryName("");
        loadCategories();
      })
      .catch(err => console.error("Error creating category:", err));
  };

  // 1-1. 검색 실행
  const handleSearch = () => {
    setIsSearching(true);
    setSearchResults([]);
    const sourcesParam = searchSources.join(",");
    fetch(`http://localhost:8000/api/papers/search?query=${encodeURIComponent(searchQuery)}&sources=${sourcesParam}&limit=${searchLimit}`)
      .then(res => {
        if (!res.ok) throw new Error("검색 오류");
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setSearchResults(data);
          // 기본 카테고리 지정
          const initialCats: Record<number, string> = {};
          data.forEach((_, idx) => {
            initialCats[idx] = categories[0] || "temp";
          });
          setSelectedPaperCats(initialCats);
        }
        setIsSearching(false);
      })
      .catch(err => {
        console.error(err);
        alert("논문 검색에 실패했습니다.");
        setIsSearching(false);
      });
  };

  // 1-1. 개별 논문 다운로드
  const handleDownload = (paper: Paper, index: number) => {
    const category = selectedPaperCats[index] || "temp";
    setDownloadStatuses(prev => ({ ...prev, [index]: "loading" }));
    
    fetch("http://localhost:8000/api/papers/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paper, category })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setDownloadStatuses(prev => ({ ...prev, [index]: "success" }));
        } else {
          setDownloadStatuses(prev => ({ ...prev, [index]: "error" }));
        }
      })
      .catch(err => {
        console.error(err);
        setDownloadStatuses(prev => ({ ...prev, [index]: "error" }));
      });
  };

  // 백그라운드 태스크 로그 조회 폴링
  useEffect(() => {
    if (!activeTaskId) return;

    setShowLogTerminal(true);
    const interval = setInterval(() => {
      fetch(`http://localhost:8000/api/tasks/${activeTaskId}`)
        .then(res => res.json())
        .then((data: TaskStatus) => {
          setTaskStatus(data);
          if (data.status === "completed" || data.status === "failed") {
            clearInterval(interval);
            loadCategories();
            if (activeTab === "strapi") handleLoadStrapi();
          }
        })
        .catch(err => {
          console.error("Task status poll error:", err);
          clearInterval(interval);
        });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTaskId]);

  // 터미널 스크롤 하단 고정
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [taskStatus?.logs]);

  // 1-2. 자동 수집 및 AI 요약
  const handleAutoRun = () => {
    alert("자동 수집 및 요약은 다소 시간이 걸리는 백그라운드 프로세스입니다.");
    setIsSearching(true);
    
    const sourcesParam = autoSources.join(",");
    fetch(`http://localhost:8000/api/papers/search?query=${encodeURIComponent(autoQuery)}&sources=${sourcesParam}&limit=${autoLimit}`)
      .then(res => res.json())
      .then(async (papers: Paper[]) => {
        if (!Array.isArray(papers) || papers.length === 0) {
          alert("검색 결과가 없어 요약을 진행하지 못했습니다.");
          setIsSearching(false);
          return;
        }
        
        setIsSearching(false);
        const targetPaper = papers[0];
        const resDl = await fetch("http://localhost:8000/api/papers/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paper: targetPaper, category: autoCategory })
        });
        const dlResult = await resDl.json();
        
        if (!dlResult.success) {
          alert("이미 존재하는 논문이거나 다운로드에 실패했습니다. (메타데이터만 수집되었을 수 있습니다.)");
        }
        
        const resCol = await fetch("http://localhost:8000/api/collected-papers");
        const collected: any[] = await resCol.json();
        const latestPaper = collected.find(c => c.title === targetPaper.title && c.pdf_path);
        
        if (!latestPaper || !latestPaper.pdf_path) {
          alert("PDF 다운로드 경로를 확보하지 못해 AI 요약을 시작할 수 없습니다.");
          return;
        }

        const resSum = await fetch("http://localhost:8000/api/papers/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdf_path: latestPaper.pdf_path, title: latestPaper.title })
        });
        const sumResult = await resSum.json();
        if (sumResult.task_id) {
          setActiveTaskId(sumResult.task_id);
          setTaskStatus({ status: "queued", logs: ["요약 파이프라인 큐 진입..."], returncode: null });
        }
      })
      .catch(err => {
        console.error(err);
        alert("자동 수집 프로세스 도중 에러가 발생했습니다.");
        setIsSearching(false);
      });
  };

  // 탭 2: 카테고리 변경 시 요약 논문 파일 로드
  useEffect(() => {
    if (!pptCategory) return;
    fetch(`http://localhost:8000/api/category-summaries?category=${encodeURIComponent(pptCategory)}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPptPapers(data);
          setSelectedPptPaperIndex(data.length > 0 ? 0 : -1);
        }
      })
      .catch(err => console.error("Error loading summaries:", err));
  }, [pptCategory, activeTaskId]);

  // 탭 2: PPT 생성 실행
  const handleGeneratePpt = () => {
    if (selectedPptPaperIndex === -1 || pptPapers.length === 0) return;
    const selected = pptPapers[selectedPptPaperIndex];
    
    fetch("http://localhost:8000/api/ppt/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json_path: selected.json_path, title: selected.title })
    })
      .then(res => res.json())
      .then(data => {
        if (data.task_id) {
          setActiveTaskId(data.task_id);
          setTaskStatus({ status: "queued", logs: ["이미지 및 PPT 생성 파이프라인 작동 시작..."], returncode: null });
        }
      })
      .catch(err => {
        console.error(err);
        alert("PPT 생성 요청 중 에러 발생");
      });
  };

  // 탭 3: Strapi 데이터 조회
  const handleLoadStrapi = () => {
    setIsStrapiLoading(true);
    setStrapiError("");
    setStrapiPapers([]);
    
    const catArg = strapiFilterCat === "전체보기" ? "" : `?category=${encodeURIComponent(strapiFilterCat)}`;
    fetch(`http://localhost:8000/api/strapi/papers${catArg}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          if (data.error === "STRAPI_API_TOKEN_MISSING") {
            setStrapiError("Strapi API 토큰이 설정되지 않았습니다. .env 파일을 체크해 주세요.");
          } else {
            setStrapiError(data.error);
          }
        } else if (Array.isArray(data.papers)) {
          setStrapiPapers(data.papers);
        }
        setIsStrapiLoading(false);
      })
      .catch(err => {
        setStrapiError(err.message || "서버 통신 실패");
        setIsStrapiLoading(false);
      });
  };

  useEffect(() => {
    if (activeTab === "strapi") {
      handleLoadStrapi();
    }
  }, [activeTab, strapiFilterCat]);

  const sourceOptions = ["arxiv", "scienceon", "riss", "semantic", "openalex", "pmc", "assembly"];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* 타이틀 헤더 */}
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            🚀 AI 논문 자동화 파이프라인
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            원하는 분야의 논문 수집, 요약 분석, 발표용 PPT 자동 생성을 원스톱으로 지원합니다.
          </p>
        </div>
        
        {/* 새 분류 추가 폼 */}
        <form onSubmit={handleCreateCategory} className="flex gap-2">
          <input 
            type="text" 
            placeholder="새 분야 추가 (예: science/quantum)"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
          <button 
            type="submit"
            className="px-3 py-1.5 text-xs bg-gray-800 text-white rounded-lg hover:bg-gray-700 font-semibold"
          >
            카테고리 생성
          </button>
        </form>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("pipeline1")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "pipeline1" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          📥 파이프라인 1: 논문 수집 및 요약
        </button>
        <button
          onClick={() => setActiveTab("pipeline2")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "pipeline2" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          🎨 파이프라인 2: 이미지 & PPT 제작
        </button>
        <button
          onClick={() => setActiveTab("strapi")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "strapi" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          🗄️ Strapi DB 보관함
        </button>
      </div>

      {/* 태스크 상태 실시간 터미널 */}
      {showLogTerminal && taskStatus && (
        <div className="bg-[#1e1e1e] rounded-xl border border-gray-800 shadow-xl overflow-hidden">
          <div className="px-4 py-2 bg-[#2d2d2d] border-b border-gray-800 flex items-center justify-between text-xs text-gray-400 font-mono">
            <span className="flex items-center gap-1.5">
              <Terminal size={14} className="text-blue-400 animate-pulse" />
              백그라운드 작업 콘솔 로그 (상태: <span className="font-bold text-white uppercase">{taskStatus.status}</span>)
            </span>
            <button 
              onClick={() => setShowLogTerminal(false)}
              className="hover:text-white px-1"
            >
              닫기
            </button>
          </div>
          <div className="p-4 h-48 overflow-y-auto font-mono text-xs text-green-400/90 space-y-1 bg-[#121212]">
            {taskStatus.logs.map((log, i) => (
              <div key={i} className="whitespace-pre-wrap">{log}</div>
            ))}
            <div ref={terminalEndRef} />
          </div>
        </div>
      )}

      {/* 탭 콘텐츠 */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm min-h-[400px]">
        {activeTab === "pipeline1" && (
          <div className="space-y-8">
            {/* 1-1. 검색 수집 */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 border-b pb-2 mb-4">
                🔍 1-1. 검색 결과 및 선택적 수집
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-gray-50 p-4 rounded-xl mb-4 border border-gray-200/40">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 mb-1">검색 키워드</label>
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">논문 개수 (최대 20)</label>
                  <input 
                    type="number" 
                    min={1} max={20}
                    value={searchLimit}
                    onChange={(e) => setSearchLimit(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm flex items-center justify-center gap-1.5"
                  >
                    {isSearching ? <RefreshCw className="animate-spin" size={16} /> : <Search size={16} />}
                    학술 사이트 검색
                  </button>
                </div>
              </div>
              
              {/* 소스 멀티셀렉트 */}
              <div className="mb-6">
                <span className="text-xs font-bold text-gray-500 block mb-1.5">검색 대상 사이트 선택</span>
                <div className="flex flex-wrap gap-2">
                  {sourceOptions.map(src => {
                    const isSelected = searchSources.includes(src);
                    return (
                      <button
                        key={src}
                        onClick={() => {
                          setSearchSources(prev => 
                            isSelected ? prev.filter(s => s !== src) : [...prev, src]
                          );
                        }}
                        className={`px-2.5 py-1 text-xs rounded-full border font-medium uppercase transition-colors ${
                          isSelected ? "bg-blue-50 border-blue-500 text-blue-600" : "bg-white border-gray-300 text-gray-500"
                        }`}
                      >
                        {src}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 검색 결과 리스트 */}
              {searchResults.length > 0 && (
                <div className="space-y-4">
                  <div className="text-xs text-gray-400">총 {searchResults.length}개의 논문이 검색되었습니다.</div>
                  <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                    {searchResults.map((paper, idx) => (
                      <div key={idx} className="p-4 bg-white hover:bg-gray-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <h4 className="font-semibold text-gray-900 text-sm">{paper.title}</h4>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="font-bold text-indigo-600 uppercase bg-indigo-50 px-1.5 py-0.5 rounded">{paper.source}</span>
                            {paper.year && <span>{paper.year}년</span>}
                            {paper.authors && (
                              <span className="truncate max-w-[200px]">
                                {Array.isArray(paper.authors) ? paper.authors.join(", ") : paper.authors}
                              </span>
                            )}
                          </div>
                          {paper.url && (
                            <a href={paper.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline inline-block">
                              원문 보러가기 &rarr;
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <select
                            value={selectedPaperCats[idx] || ""}
                            onChange={(e) => setSelectedPaperCats(prev => ({ ...prev, [idx]: e.target.value }))}
                            className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none"
                          >
                            {categories.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleDownload(paper, idx)}
                            disabled={downloadStatuses[idx] === "loading" || downloadStatuses[idx] === "success"}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0 ${
                              downloadStatuses[idx] === "success" ? "bg-green-50 text-green-600 border border-green-200" :
                              downloadStatuses[idx] === "error" ? "bg-red-50 text-red-600 border border-red-200" :
                              "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            {downloadStatuses[idx] === "loading" ? <RefreshCw className="animate-spin" size={12} /> : 
                             downloadStatuses[idx] === "success" ? <CheckCircle2 size={12} /> : <Download size={12} />}
                            {downloadStatuses[idx] === "success" ? "수집 완료" : "다운로드"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 1-2. 분야별 자동 수집 & 요약 */}
            <div className="border-t pt-8">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 border-b pb-2 mb-4">
                🚀 1-2. 분야별 자동 수집 & 요약
              </h3>
              <p className="text-xs text-gray-400 mb-4">기존 분야(폴더)를 선택하여 1건의 논문을 수집하고 요약 파이프라인을 기동합니다.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-gray-50 p-4 rounded-xl border border-gray-200/40">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">분류(폴더) 선택</label>
                  <select 
                    value={autoCategory}
                    onChange={(e) => setAutoCategory(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none bg-white"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 mb-1">자동 검색 키워드</label>
                  <input 
                    type="text" 
                    value={autoQuery}
                    onChange={(e) => setAutoQuery(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">수집 개수 (최대 10)</label>
                  <input 
                    type="number" 
                    min={1} max={10}
                    value={autoLimit}
                    onChange={(e) => setAutoLimit(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none bg-white"
                  />
                </div>
              </div>

              {/* 자동 수집용 검색 소스 멀티셀렉트 */}
              <div className="mt-4 bg-gray-50 p-4 rounded-xl border border-gray-200/40 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <span className="text-xs font-bold text-gray-500 block mb-1.5">검색 대상 사이트 선택</span>
                  <div className="flex flex-wrap gap-2">
                    {sourceOptions.map(src => {
                      const isSelected = autoSources.includes(src);
                      return (
                        <button
                          key={src}
                          onClick={() => {
                            setAutoSources(prev => 
                              isSelected ? prev.filter(s => s !== src) : [...prev, src]
                            );
                          }}
                          className={`px-2.5 py-1 text-xs rounded-full border font-medium uppercase transition-colors ${
                            isSelected ? "bg-indigo-50 border-indigo-500 text-indigo-600" : "bg-white border-gray-300 text-gray-500"
                          }`}
                        >
                          {src}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="shrink-0">
                  <button
                    onClick={handleAutoRun}
                    disabled={isSearching}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold text-sm flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/10"
                  >
                    {isSearching ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} />}
                    자동 수집/요약 시작
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "pipeline2" && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 border-b pb-2 mb-4">
              🎨 2단계: 수집된 논문으로 발표 자료(PPT) 자동 생성
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">📂 분류(카테고리) 선택</label>
                  <select 
                    value={pptCategory}
                    onChange={(e) => setPptCategory(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none bg-white"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">📄 요약이 완료된 논문 리스트</label>
                  {pptPapers.length === 0 ? (
                    <div className="text-xs text-gray-400 italic bg-gray-50 p-4 rounded-lg text-center border border-dashed">
                      이 카테고리에는 요약 완료된 논문이 없습니다.
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-xl overflow-hidden divide-y max-h-64 overflow-y-auto">
                      {pptPapers.map((paper, i) => (
                        <div
                          key={i}
                          onClick={() => setSelectedPptPaperIndex(i)}
                          className={`p-3 text-xs cursor-pointer transition-colors ${
                            selectedPptPaperIndex === i ? "bg-blue-50 text-blue-700 font-semibold" : "bg-white hover:bg-gray-50 text-gray-600"
                          }`}
                        >
                          {paper.title}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {pptPapers.length > 0 && selectedPptPaperIndex !== -1 && (
                  <button
                    onClick={handleGeneratePpt}
                    className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 font-semibold text-sm shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-1.5"
                  >
                    <Layers size={16} />
                    PPT 생성 시작
                  </button>
                )}
              </div>

              {/* 요약 JSON 미리보기 */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1.5">📝 요약 정보 미리보기 (JSON)</label>
                {selectedPptPaperIndex !== -1 && pptPapers[selectedPptPaperIndex] ? (
                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl h-96 overflow-y-auto font-mono text-xs text-gray-700">
                    <pre>{JSON.stringify(pptPapers[selectedPptPaperIndex].data, null, 2)}</pre>
                  </div>
                ) : (
                  <div className="h-96 border border-dashed border-gray-200 rounded-xl flex items-center justify-center text-xs text-gray-400 italic">
                    논문을 선택하면 요약 메타데이터가 여기에 노출됩니다.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "strapi" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-2 mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                🗄️ Strapi DB에 저장된 논문 보관함
              </h3>
              
              <div className="flex items-center gap-2">
                <select 
                  value={strapiFilterCat}
                  onChange={(e) => setStrapiFilterCat(e.target.value)}
                  className="text-xs border border-gray-300 rounded-lg px-2.5 py-1 focus:outline-none bg-white"
                >
                  <option value="전체보기">전체보기</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button
                  onClick={handleLoadStrapi}
                  disabled={isStrapiLoading}
                  className="p-1.5 border rounded-lg hover:bg-gray-50 transition-colors text-gray-500"
                >
                  <RefreshCw size={14} className={isStrapiLoading ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            {strapiError && (
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl flex items-center gap-2 text-sm">
                <AlertCircle size={16} />
                <span>{strapiError}</span>
              </div>
            )}

            {isStrapiLoading ? (
              <div className="h-64 flex items-center justify-center text-sm text-gray-400">
                <RefreshCw className="animate-spin mr-2" size={16} /> 데이터 로딩 중...
              </div>
            ) : strapiPapers.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-gray-400 italic border border-dashed rounded-xl">
                저장된 논문이 없습니다.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200 inline-block font-semibold">
                  DB에 총 {strapiPapers.length}개의 논문 데이터가 존재합니다.
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {strapiPapers.map((paper, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all bg-white flex flex-col md:flex-row gap-6">
                      <div className="flex-1 space-y-4">
                        <div>
                          <h4 className="font-bold text-gray-900 text-lg">📄 {paper.title}</h4>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 rounded text-gray-600">ID: {paper.id}</span>
                            <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-600 rounded">카테고리: {paper.category}</span>
                            {paper.published_year && <span className="text-xs font-semibold px-2 py-0.5 bg-green-50 text-green-600 rounded">년도: {paper.published_year}</span>}
                          </div>
                        </div>

                        <div className="text-xs text-gray-500 space-y-1">
                          <div>👤 **저자**: {paper.authors || "미상"}</div>
                          {paper.doi && <div>🔗 **DOI**: {paper.doi}</div>}
                          {paper.pdf_path && <div>📂 **로컬 PDF**: {paper.pdf_path}</div>}
                        </div>

                        {paper.source_url && (
                          <a 
                            href={paper.source_url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-block text-xs font-semibold text-blue-500 hover:underline"
                          >
                            원문 링크 보기 &rarr;
                          </a>
                        )}
                      </div>

                      <div className="md:w-3/5 bg-gray-50 rounded-xl p-4 border border-gray-200/50">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">AI 요약 분석</span>
                        {paper.summary ? (
                          <div className="text-sm text-gray-700 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">{paper.summary}</div>
                        ) : (
                          <div className="text-xs text-amber-600 italic bg-amber-50/50 p-3 rounded-lg border border-amber-100 flex items-center gap-1.5">
                            <AlertCircle size={14} /> 요약이 진행되지 않은 논문입니다. 파이프라인에서 요약을 수행해 주세요.
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
