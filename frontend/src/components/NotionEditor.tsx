import { useEffect, useState, useRef } from "react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";

interface NotionEditorProps {
  projectId: string;
  docId: string;
  docTitle: string;
  isDarkMode: boolean;
  pageId?: string;
}

export default function NotionEditor({ projectId, docId, docTitle, isDarkMode, pageId }: NotionEditorProps) {
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
                .replace(/<.*?>/g, ""); // 기타 잔여 HTML 태그 제거
                
              const lines = cleanContent.split("\n");
              
              lines.forEach((line: string) => {
                const trimmed = line.trim();
                if (!trimmed) return;
                
                // 마크다운 파싱 및 노션 블록 규격 변환
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
              // 이미 BlockNote 규격의 오브젝트거나 다른 형식이면 그대로 패스
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
            content: "문서를 불러오는 도중 에러가 발생했습니다.",
          }
        ]);
      });
  }, [projectId, docId]);

  if (!initialContent) {
    return <div className="p-12 text-center text-xs text-gray-400 italic">문서 불러오는 중...</div>;
  }

  return <EditorWrapper key={docId} projectId={projectId} docId={docId} docTitle={docTitle} initialContent={initialContent} isDarkMode={isDarkMode} pageId={pageId} />;
}

interface WrapperProps {
  projectId: string;
  docId: string;
  docTitle: string;
  initialContent: any[];
  isDarkMode: boolean;
  pageId?: string;
}

function EditorWrapper({ projectId, docId, docTitle, initialContent, isDarkMode, pageId }: WrapperProps) {
  const editor = useCreateBlockNote({
    initialContent: initialContent,
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
    
    fetch(`http://localhost:8000/api/projects/${projectId}/documents/${docId}/title`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() })
    })
      .then(res => res.json())
      .catch(err => console.error("Title save error:", err));
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
          placeholder="제목 없음"
        />
        <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
          saveStatus === "saved" ? "bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400" :
          saveStatus === "saving" ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400" : "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
        }`}>
          {saveStatus === "saved" ? "클라우드 저장됨" :
           saveStatus === "saving" ? "저장 중..." : "저장 실패"}
        </span>
      </div>
      <div className="flex-1">
        <BlockNoteView editor={editor} theme={isDarkMode ? "dark" : "light"} onChange={handleEditorChange} />
      </div>
    </div>
  );
}
