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

  useEffect(() => {
    setInitialContent(null);
    fetch(`http://localhost:8000/api/projects/${projectId}?page_id=${pageId || "progress"}`)
      .then(res => res.json())
      .then(data => {
        const doc = data.documents?.[docId];
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
      isDarkMode={isDarkMode} 
      pageId={pageId} 
      language={language}
      onNavigate={onNavigate}
      onWorkspaceUpdate={onWorkspaceUpdate}
    />
  );
}

interface WrapperProps {
  projectId: string;
  docId: string;
  docTitle: string;
  initialContent: any[];
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

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-10 py-12 flex flex-col h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <input 
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          className="text-4xl font-bold pl-12 focus:outline-none text-gray-800 dark:text-gray-100 bg-transparent w-full border-none"
          placeholder={language === "en" ? "Untitled" : "제목 없음"}
        />
        <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
          saveStatus === "saved" ? "bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400" :
          saveStatus === "saving" ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400" : "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
        }`}>
          {saveStatus === "saved" ? (language === "en" ? "Saved" : "클라우드 저장됨") :
           saveStatus === "saving" ? (language === "en" ? "Saving..." : "저장 중...") : (language === "en" ? "Save Failed" : "저장 실패")}
        </span>
      </div>
      <div className="flex-1">
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
    </div>
  );
}
