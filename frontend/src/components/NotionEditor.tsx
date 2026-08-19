import { useEffect, useState, useRef } from "react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote, SuggestionMenuController, getDefaultReactSlashMenuItems, type DefaultReactSuggestionItem } from "@blocknote/react";
import { ko, en } from "@blocknote/core/locales";
import { FileText } from "lucide-react";

interface NotionEditorProps {
  projectId: string;
  docId: string;
  docTitle: string;
  isDarkMode: boolean;
  pageId?: string;
  language?: "ko" | "en";
  onNavigate?: (projId: string | null, docId: string | null) => void;
  onWorkspaceUpdate?: () => void;
}

export default function NotionEditor({ 
  projectId, 
  docId, 
  docTitle, 
  isDarkMode, 
  pageId, 
  language = "ko",
  onNavigate,
  onWorkspaceUpdate
}: NotionEditorProps) {
  const [initialContent, setInitialContent] = useState<any[] | null>(null);
  const [subDocuments, setSubDocuments] = useState<any[]>([]);
  const [allDocuments, setAllDocuments] = useState<Record<string, any>>({});
  const [projectName, setProjectName] = useState<string>("");

  const loadDocData = () => {
    fetch(`http://localhost:8000/api/projects/${projectId}?page_id=${pageId || "progress"}`)
      .then(res => res.json())
      .then(data => {
        setProjectName(data.name || "");
        const docs = data.documents || {};
        setAllDocuments(docs);
        const doc = docs[docId];

        // 직속 하위 문서 목록 필터링
        const children = Object.values(docs).filter((d: any) => d.parent_id === docId);
        setSubDocuments(children);

        if (doc && doc.blocks && doc.blocks.length > 0) {
          const generateId = () => Math.random().toString(36).substring(2, 9);
          const parsedBlocks: any[] = [];
          
          doc.blocks.forEach((b: any) => {
            if (typeof b.content === "string") {
              let cleanContent = b.content
                .replace(/<p>/g, "")
                .replace(/<\/p>/g, "\n")
                .replace(/<br\s*\/?>/g, "\n")
                .replace(/<.*?>/g, "");
                
              const lines = cleanContent.split("\n");
              
              lines.forEach((line: string) => {
                const trimmed = line.trim();
                if (!trimmed) return;
                
                if (trimmed.startsWith("### ")) {
                  parsedBlocks.push({
                    id: generateId(),
                    type: "heading",
                    props: { level: 3 },
                    content: [{ type: "text", text: trimmed.replace("### ", ""), styles: {} }]
                  });
                } else if (trimmed.startsWith("## ")) {
                  parsedBlocks.push({
                    id: generateId(),
                    type: "heading",
                    props: { level: 2 },
                    content: [{ type: "text", text: trimmed.replace("## ", ""), styles: {} }]
                  });
                } else if (trimmed.startsWith("# ")) {
                  parsedBlocks.push({
                    id: generateId(),
                    type: "heading",
                    props: { level: 1 },
                    content: [{ type: "text", text: trimmed.replace("# ", ""), styles: {} }]
                  });
                } else if (trimmed.startsWith("- ")) {
                  parsedBlocks.push({
                    id: generateId(),
                    type: "bulletListItem",
                    content: [{ type: "text", text: trimmed.replace("- ", ""), styles: {} }]
                  });
                } else {
                  parsedBlocks.push({
                    id: generateId(),
                    type: "paragraph",
                    content: [{ type: "text", text: trimmed, styles: {} }]
                  });
                }
              });
            } else {
              parsedBlocks.push(b);
            }
          });
          
          const finalBlocks = parsedBlocks.length > 0 ? parsedBlocks : [
            {
              id: generateId(),
              type: "paragraph",
              content: ""
            }
          ];
          setInitialContent(finalBlocks);
        } else {
          setInitialContent([
            {
              type: "paragraph",
              content: "",
            }
          ]);
        }
      })
      .catch(err => {
        console.error("Error fetching doc blocks:", err);
        setInitialContent([
          {
            type: "paragraph",
            content: language === "en" ? "Error loading document." : "문서를 불러오는 도중 에러가 발생했습니다.",
          }
        ]);
      });
  };

  useEffect(() => {
    setInitialContent(null);
    loadDocData();
  }, [projectId, docId, pageId]);

  if (!initialContent) {
    return <div className="p-12 text-center text-xs text-gray-400 italic">{language === "en" ? "Loading document..." : "문서 불러오는 중..."}</div>;
  }

  return (
    <EditorWrapper 
      key={`${docId}-${language}`} 
      projectId={projectId} 
      docId={docId} 
      docTitle={docTitle} 
      initialContent={initialContent} 
      subDocuments={subDocuments}
      allDocuments={allDocuments}
      projectName={projectName}
      isDarkMode={isDarkMode} 
      pageId={pageId} 
      language={language}
      onNavigate={onNavigate}
      onWorkspaceUpdate={() => {
        loadDocData();
        onWorkspaceUpdate?.();
      }}
    />
  );
}

interface WrapperProps {
  projectId: string;
  docId: string;
  docTitle: string;
  initialContent: any[];
  subDocuments: any[];
  allDocuments: Record<string, any>;
  projectName: string;
  isDarkMode: boolean;
  pageId?: string;
  language: "ko" | "en";
  onNavigate?: (projId: string | null, docId: string | null) => void;
  onWorkspaceUpdate?: () => void;
}

function EditorWrapper({ 
  projectId, 
  docId, 
  docTitle, 
  initialContent, 
  subDocuments,
  allDocuments,
  projectName,
  isDarkMode, 
  pageId, 
  language,
  onNavigate,
  onWorkspaceUpdate
}: WrapperProps) {
  const editor = useCreateBlockNote({
    initialContent: initialContent,
    dictionary: language === "en" ? en : ko,
  });

  const saveTimerRef = useRef<any>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");

  const saveContent = (blocks: any[]) => {
    setSaveStatus("saving");
    fetch(`http://localhost:8000/api/projects/${projectId}/documents/${docId}/content?page_id=${pageId || "progress"}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSaveStatus("saved");
        } else {
          setSaveStatus("unsaved");
        }
      })
      .catch(err => {
        console.error("Save error:", err);
        setSaveStatus("unsaved");
      });
  };

  const handleEditorChange = () => {
    setSaveStatus("unsaved");
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      saveContent(editor.document);
    }, 1500);
  };

  const [title, setTitle] = useState(docTitle);
  useEffect(() => {
    setTitle(docTitle);
  }, [docTitle]);

  const handleTitleBlur = () => {
    if (title.trim() === "" || title === docTitle) return;
    
    fetch(`http://localhost:8000/api/projects/${projectId}/documents/${docId}/title?page_id=${pageId || "progress"}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() })
    })
      .then(res => res.json())
      .then(() => onWorkspaceUpdate?.())
      .catch(err => console.error("Title save error:", err));
  };

  const handleCreateSubpage = () => {
    const subTitle = prompt(language === "en" ? "Enter sub-page title:" : "새 하위 문서의 제목을 입력하세요:");
    if (!subTitle || !subTitle.trim()) return;

    fetch(`http://localhost:8000/api/projects/${projectId}/documents?page_id=${pageId || "progress"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: subTitle.trim(),
        parent_id: docId
      })
    })
      .then(res => res.json())
      .then(newDoc => {
        onWorkspaceUpdate?.();
        if (newDoc && newDoc.id) {
          onNavigate?.(projectId, newDoc.id);
        }
      })
      .catch(err => console.error("Error creating subpage:", err));
  };

  // 노션 스타일의 하위 페이지 생성 아이템 (/page)
  const getCustomSlashMenuItems = (editor: any, query: string) => {
    const defaultItems = getDefaultReactSlashMenuItems(editor);

    const subpageItem: DefaultReactSuggestionItem = {
      title: language === "en" ? "Page" : "페이지 (하위 문서)",
      subtext: language === "en" ? "Create a sub-page inside this document" : "현재 문서 내에 새로운 하위 문서를 만듭니다",
      aliases: ["page", "페이지", "subpage", "하위페이지", "문서", "doc", "document"],
      group: language === "en" ? "Advanced" : "고급",
      icon: <FileText size={18} className="text-blue-500" />,
      onItemClick: () => {
        handleCreateSubpage();
      }
    };

    const allItems = [subpageItem, ...defaultItems];

    if (!query) return allItems;
    const q = query.toLowerCase();
    return allItems.filter(item => 
      item.title.toLowerCase().includes(q) ||
      (item.subtext && item.subtext.toLowerCase().includes(q)) ||
      (item.aliases && item.aliases.some(a => a.toLowerCase().includes(q)))
    );
  };

  // 부모 계층 브레드크럼 계산
  const breadcrumbs: any[] = [];
  let curr = allDocuments[docId];
  while (curr && curr.parent_id && allDocuments[curr.parent_id]) {
    curr = allDocuments[curr.parent_id];
    breadcrumbs.unshift(curr);
  }

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-10 py-10 flex flex-col h-full overflow-y-auto">
      {/* 상단 브레드크럼 네비게이션 */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mb-6 font-medium pl-12 flex-wrap">
        <span 
          onClick={() => {
            const rootDoc = Object.values(allDocuments).find(d => d.parent_id === null);
            if (rootDoc) onNavigate?.(projectId, rootDoc.id);
          }}
          className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
          title="프로젝트 최상위 문서로 이동"
        >
          📁 {projectName || (language === "en" ? "Project" : "프로젝트")}
        </span>
        {breadcrumbs.map(b => (
          <div key={b.id} className="flex items-center gap-1.5">
            <span>/</span>
            <span 
              onClick={() => onNavigate?.(projectId, b.id)}
              className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer truncate max-w-[150px]"
              title={b.title}
            >
              📄 {b.title}
            </span>
          </div>
        ))}
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-300 font-semibold truncate max-w-[180px]">
          📄 {title || (language === "en" ? "Untitled" : "제목 없음")}
        </span>
      </div>

      <div className="flex items-center justify-between mb-4 shrink-0">
        <input 
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          className="text-4xl font-bold pl-12 focus:outline-none text-gray-800 dark:text-gray-100 bg-transparent w-full border-none"
          placeholder={language === "en" ? "Untitled" : "제목 없음"}
        />
        <span className={`text-[10px] px-2 py-0.5 rounded font-mono shrink-0 ${
          saveStatus === "saved" ? "bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400" :
          saveStatus === "saving" ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400" : "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
        }`}>
          {saveStatus === "saved" ? (language === "en" ? "Saved" : "클라우드 저장됨") :
           saveStatus === "saving" ? (language === "en" ? "Saving..." : "저장 중...") : (language === "en" ? "Save Failed" : "저장 실패")}
        </span>
      </div>

      {/* 에디터 본문 영역 */}
      <div className="flex-1 min-h-[300px]">
        <BlockNoteView 
          editor={editor} 
          theme={isDarkMode ? "dark" : "light"} 
          onChange={handleEditorChange}
          slashMenu={false}
        >
          <SuggestionMenuController 
            triggerCharacter="/" 
            getItems={async (query) => getCustomSlashMenuItems(editor, query)} 
          />
        </BlockNoteView>
      </div>

      {/* 하위 페이지 목록 카드 섹션 (노션 스타일) */}
      <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <FileText size={14} className="text-blue-500" />
            <span>{language === "en" ? "Sub-pages in this document" : "이 문서의 하위 페이지"}</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full font-mono">
              {subDocuments.length}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCreateSubpage}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all cursor-pointer"
          >
            + {language === "en" ? "Add Sub-page" : "하위 페이지 추가"}
          </button>
        </div>

        {subDocuments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {subDocuments.map((subDoc) => (
              <div
                key={subDoc.id}
                onClick={() => onNavigate?.(projectId, subDoc.id)}
                className="p-4 bg-white dark:bg-[#1e1e1e] border border-gray-200/80 dark:border-gray-800 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 truncate">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-semibold shrink-0 group-hover:scale-110 transition-transform">
                    📄
                  </div>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                    {subDoc.title}
                  </span>
                </div>
                <span className="text-gray-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all text-xs font-bold shrink-0">
                  →
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div 
            onClick={handleCreateSubpage}
            className="p-5 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-center text-xs text-gray-400 dark:text-gray-500 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-500 cursor-pointer transition-all flex flex-col items-center justify-center gap-1"
          >
            <span>{language === "en" ? "No sub-pages yet. Click to create one." : "등록된 하위 페이지가 없습니다. 클릭하여 새로운 하위 문서를 만들어보세요."}</span>
          </div>
        )}
      </div>
    </div>
  );
}
