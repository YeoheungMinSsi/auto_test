import sys
import os
import uuid
import glob
import subprocess
import json
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any

# 백엔드 모듈 경로 인식
base_dir = os.path.dirname(os.path.abspath(__file__))
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)
# paper_summary 경로도 추가
paper_summary_dir = os.path.join(base_dir, "paper_summary")
if paper_summary_dir not in sys.path:
    sys.path.insert(0, paper_summary_dir)

import app_utils.state_manager as sm
import uvicorn
from paper_summary.downloader import PaperDownloader
from paper_summary.apis.strapi_client import StrapiClient

app = FastAPI(title="Paper Automation & Notion Dashboard API")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Models ----
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class TaskCreate(BaseModel):
    title: str

class TaskToggle(BaseModel):
    completed: bool

class DocumentCreate(BaseModel):
    title: str
    parent_id: Optional[str] = None

class DocumentContentUpdate(BaseModel):
    blocks: List[Any]

class DownloadRequest(BaseModel):
    paper: dict
    category: str

class SummarizeRequest(BaseModel):
    pdf_path: str
    title: str

class PptGenerateRequest(BaseModel):
    json_path: str
    title: str

class BlogPostCreate(BaseModel):
    title: str
    content: str
    category: str
    author: str

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None

class DocumentTitleUpdate(BaseModel):
    title: str

class WorkspaceUpdate(BaseModel):
    workspace_name: str

class CustomPageCreate(BaseModel):
    title: str
    has_subpages: bool = False
    is_hidden: bool = False
    icon: Optional[str] = "📄"
    description: Optional[str] = ""

class CustomPageUpdate(BaseModel):
    title: Optional[str] = None
    has_subpages: Optional[bool] = None
    is_hidden: Optional[bool] = None
    icon: Optional[str] = None
    description: Optional[str] = None

# ---- Background Tasks State ----
active_tasks = {}

def run_background_process(task_id: str, cmd: list):
    active_tasks[task_id] = {"status": "running", "logs": [], "returncode": None}
    try:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding='utf-8',
            errors='replace'
        )
        for line in process.stdout:
            active_tasks[task_id]["logs"].append(line.strip())
            if len(active_tasks[task_id]["logs"]) > 200:
                active_tasks[task_id]["logs"].pop(0)
        process.wait()
        active_tasks[task_id]["status"] = "completed" if process.returncode == 0 else "failed"
        active_tasks[task_id]["returncode"] = process.returncode
    except Exception as e:
        active_tasks[task_id]["status"] = "failed"
        active_tasks[task_id]["logs"].append(f"Error: {str(e)}")

# ---- Health ----
@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

# ---- Workspace & Custom Pages ----
@app.get("/api/workspace")
def get_workspace():
    return sm.load_workspace_state()

@app.put("/api/workspace")
def update_workspace(data: WorkspaceUpdate):
    return sm.update_workspace_name(data.workspace_name)

@app.post("/api/workspace/pages")
def create_custom_page(data: CustomPageCreate):
    return sm.add_custom_page(data.title, data.has_subpages, data.is_hidden, data.icon, data.description)

@app.put("/api/workspace/pages/{page_id}")
def update_custom_page(page_id: str, data: CustomPageUpdate):
    if sm.update_custom_page(page_id, data.title, data.has_subpages, data.is_hidden, data.icon, data.description):
        return {"success": True}
    raise HTTPException(status_code=404, detail="Page not found")

@app.delete("/api/workspace/pages/{page_id}")
def delete_custom_page(page_id: str):
    if sm.delete_custom_page(page_id):
        return {"success": True}
    raise HTTPException(status_code=404, detail="Page not found")

# ---- Projects ----
@app.get("/api/projects")
def list_projects(page_id: str = "progress"):
    return sm.get_projects(page_id)

@app.get("/api/projects/{project_id}")
def get_project(project_id: str, page_id: str = "progress"):
    proj = sm.get_project(project_id, page_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return proj

@app.post("/api/projects")
def create_project(data: ProjectCreate, page_id: str = "progress"):
    pid = sm.add_project(data.name, data.description, page_id)
    proj = sm.get_project(pid, page_id)
    return proj

@app.delete("/api/projects/{project_id}")
def delete_project(project_id: str, page_id: str = "progress"):
    if sm.delete_project(project_id, page_id):
        return {"success": True}
    raise HTTPException(status_code=404, detail="Project not found")

# ---- Tasks ----
@app.post("/api/projects/{project_id}/tasks")
def create_task(project_id: str, data: TaskCreate, page_id: str = "progress"):
    tid = sm.add_task(project_id, data.title, page_id)
    if not tid:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"id": tid}

@app.put("/api/projects/{project_id}/tasks/{task_id}")
def toggle_task(project_id: str, task_id: str, data: TaskToggle, page_id: str = "progress"):
    if sm.toggle_task(project_id, task_id, data.completed, page_id):
        return {"success": True}
    raise HTTPException(status_code=404, detail="Task not found")

@app.delete("/api/projects/{project_id}/tasks/{task_id}")
def delete_task(project_id: str, task_id: str, page_id: str = "progress"):
    if sm.delete_task(project_id, task_id, page_id):
        return {"success": True}
    raise HTTPException(status_code=404, detail="Task not found")

# ---- Documents ----
@app.post("/api/projects/{project_id}/documents")
def create_document(project_id: str, data: DocumentCreate, page_id: str = "progress"):
    doc_id = sm.add_document(project_id, data.title, data.parent_id, page_id)
    if not doc_id:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"id": doc_id}

@app.put("/api/projects/{project_id}/documents/{doc_id}/content")
def update_document_content(project_id: str, doc_id: str, data: DocumentContentUpdate, page_id: str = "progress"):
    """
    기존 Streamlit식 개별 블록 업데이트를 대체하여, BlockNote의 전체 JSON 구조를 
    첫 번째 블록의 'content'에 통째로 덮어쓰거나, 별도의 구조로 저장합니다.
    호환성을 위해 doc.blocks = data.blocks 형태로 직접 저장하도록 state_manager 우회 업데이트 수행
    """
    state = sm.load_state(page_id)
    if project_id in state["projects"] and "documents" in state["projects"][project_id]:
        docs = state["projects"][project_id]["documents"]
        if doc_id in docs:
            # BlockNote 규격대로 덮어씌움
            docs[doc_id]["blocks"] = data.blocks
            sm.save_state(state, page_id)
            return {"success": True}
    raise HTTPException(status_code=404, detail="Document not found")

@app.put("/api/projects/{project_id}")
def update_project_endpoint(project_id: str, data: ProjectUpdate, page_id: str = "progress"):
    if sm.update_project(project_id, name=data.name, status=data.status, page_id=page_id):
        return {"success": True}
    raise HTTPException(status_code=404, detail="Project not found")

@app.put("/api/projects/{project_id}/documents/{doc_id}/title")
def update_document_title_endpoint(project_id: str, doc_id: str, data: DocumentTitleUpdate, page_id: str = "progress"):
    if sm.update_document_title(project_id, doc_id, data.title, page_id):
        return {"success": True}
    raise HTTPException(status_code=404, detail="Document not found")

@app.delete("/api/projects/{project_id}/documents/{doc_id}")
def delete_document_endpoint(project_id: str, doc_id: str, page_id: str = "progress"):
    if sm.delete_document(project_id, doc_id, page_id):
        return {"success": True}
    raise HTTPException(status_code=404, detail="Document not found")

# ---- Categories ----
@app.get("/api/categories")
def list_categories():
    categories_dir = os.path.join(base_dir, "paper_summary", "categories")
    if not os.path.exists(categories_dir):
        return []
    cats = []
    for root, dirs, files in os.walk(categories_dir):
        if root != categories_dir:
            rel_path = os.path.relpath(root, categories_dir)
            cats.append(rel_path.replace("\\", "/"))
    return sorted(list(set(cats)))

@app.post("/api/categories")
def create_category(data: dict):
    category = data.get("category")
    if not category:
        raise HTTPException(status_code=400, detail="Category name is required")
    categories_dir = os.path.join(base_dir, "paper_summary", "categories")
    target_dir = os.path.join(categories_dir, os.path.normpath(category))
    os.makedirs(target_dir, exist_ok=True)
    return {"success": True}

# ---- Papers ----
@app.get("/api/papers/search")
def search_papers(query: str, sources: str = "arxiv,semantic", limit: int = 5):
    venv_python = os.path.join(base_dir, "venv", "Scripts", "python.exe")
    step1_fetch = os.path.join(base_dir, "paper_summary", "fetch_papers.py")
    
    if not os.path.exists(venv_python):
        raise HTTPException(status_code=500, detail="가상환경 파이썬을 찾을 수 없습니다.")
        
    cmd = [venv_python, step1_fetch, "--query", query, "--category", "temp", "--sources", sources, "--limit", str(limit), "--search-only"]
    
    temp_dir = os.path.join(base_dir, "paper_summary", "categories", "temp")
    os.makedirs(temp_dir, exist_ok=True)
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=f"검색 실패: {result.stderr or result.stdout}")
            
        search_tmp_path = os.path.join(base_dir, "paper_summary", "search_results_tmp.json")
        if os.path.exists(search_tmp_path):
            with open(search_tmp_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/papers/download")
def download_paper(data: DownloadRequest):
    try:
        downloader = PaperDownloader(base_dir)
        success = downloader.download_pdf(data.paper, data.category)
        return {"success": success}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/collected-papers")
def list_collected_papers():
    history_file = os.path.join(base_dir, "paper_summary", "collected_papers.json")
    if os.path.exists(history_file):
        try:
            with open(history_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []

# ---- Tasks Status ----
@app.get("/api/tasks/{task_id}")
def get_task_status(task_id: str):
    if task_id not in active_tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    return active_tasks[task_id]

# ---- Summarize ----
def run_summarize_task(task_id: str, pdf_abs_path: str):
    venv_python = os.path.join(base_dir, "venv", "Scripts", "python.exe")
    step2_summarize = os.path.join(base_dir, "paper_summary", "summarizer.py")
    cmd = [venv_python, step2_summarize, "--pdf", pdf_abs_path, "--force"]
    run_background_process(task_id, cmd)

@app.post("/api/papers/summarize")
def summarize_paper(data: SummarizeRequest, background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())
    active_tasks[task_id] = {"status": "queued", "logs": [], "returncode": None}
    
    pdf_path = data.pdf_path
    if not os.path.isabs(pdf_path):
        pdf_path = os.path.join(base_dir, "paper_summary", pdf_path)
        
    background_tasks.add_task(run_summarize_task, task_id, pdf_path)
    return {"task_id": task_id}

# ---- PPT Generate ----
@app.get("/api/category-summaries")
def list_category_summaries(category: str):
    categories_dir = os.path.join(base_dir, "paper_summary", "categories")
    target_dir = os.path.join(categories_dir, os.path.normpath(category))
    if not os.path.exists(target_dir):
        return []
    json_files = glob.glob(os.path.join(target_dir, "*_summary.json"))
    
    results = []
    for jf in json_files:
        try:
            with open(jf, 'r', encoding='utf-8') as f:
                data = json.load(f)
                title = data.get("title", os.path.basename(jf))
                results.append({
                    "title": title,
                    "json_path": jf.replace("\\", "/"),
                    "data": data
                })
        except Exception:
            pass
    return results

def run_ppt_task(task_id: str, json_path: str):
    venv_python = os.path.join(base_dir, "venv", "Scripts", "python.exe")
    step3_image = os.path.join(base_dir, "img_generator", "generate_images.py")
    step4_ppt = os.path.join(base_dir, "ppt_generator", "generate_ppt.py")
    
    active_tasks[task_id] = {"status": "running", "logs": ["Step 3: 이미지 생성 시작..."], "returncode": None}
    cmd3 = [venv_python, step3_image, "--json", json_path, "--force"]
    
    try:
        p3 = subprocess.Popen(cmd3, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace")
        for line in p3.stdout:
            active_tasks[task_id]["logs"].append(f"[Image Gen] {line.strip()}")
            if len(active_tasks[task_id]["logs"]) > 200:
                active_tasks[task_id]["logs"].pop(0)
        p3.wait()
        
        if p3.returncode != 0:
            active_tasks[task_id]["status"] = "failed"
            active_tasks[task_id]["returncode"] = p3.returncode
            active_tasks[task_id]["logs"].append("Step 3 이미지 생성 실패!")
            return
            
        active_tasks[task_id]["logs"].append("Step 3 이미지 생성 완료. Step 4 PPT 생성 시작...")
        
        cmd4 = [venv_python, step4_ppt, "--json", json_path]
        p4 = subprocess.Popen(cmd4, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace")
        for line in p4.stdout:
            active_tasks[task_id]["logs"].append(f"[PPT Gen] {line.strip()}")
            if len(active_tasks[task_id]["logs"]) > 200:
                active_tasks[task_id]["logs"].pop(0)
        p4.wait()
        
        active_tasks[task_id]["status"] = "completed" if p4.returncode == 0 else "failed"
        active_tasks[task_id]["returncode"] = p4.returncode
        if p4.returncode == 0:
            active_tasks[task_id]["logs"].append("Step 4 PPT 생성 완료!")
        else:
            active_tasks[task_id]["logs"].append("Step 4 PPT 생성 실패!")
    except Exception as e:
        active_tasks[task_id]["status"] = "failed"
        active_tasks[task_id]["logs"].append(f"Error: {str(e)}")

@app.post("/api/ppt/generate")
def generate_ppt_endpoint(data: PptGenerateRequest, background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())
    active_tasks[task_id] = {"status": "queued", "logs": [], "returncode": None}
    
    json_path = data.json_path
    if not os.path.isabs(json_path):
        json_path = os.path.join(base_dir, "paper_summary", json_path)
        
    background_tasks.add_task(run_ppt_task, task_id, json_path)
    return {"task_id": task_id}

# ---- Workspace & Custom Pages ----
@app.get("/api/workspace")
def get_workspace():
    return sm.load_workspace_state()

@app.put("/api/workspace")
def update_workspace(data: WorkspaceUpdate):
    if sm.update_workspace_name(data.workspace_name):
        return {"success": True}
    raise HTTPException(status_code=500, detail="Failed to update workspace name")

@app.post("/api/workspace/pages")
def create_custom_page(data: CustomPageCreate):
    new_page = sm.add_custom_page(data.title, data.has_subpages, data.is_hidden)
    if new_page:
        return new_page
    raise HTTPException(status_code=500, detail="Failed to create custom page")

@app.put("/api/workspace/pages/{page_id}")
def update_custom_page(page_id: str, data: CustomPageUpdate):
    if sm.update_custom_page(page_id, data.title, data.has_subpages, data.is_hidden):
        return {"success": True}
    raise HTTPException(status_code=404, detail="Custom page not found")

@app.delete("/api/workspace/pages/{page_id}")
def delete_custom_page(page_id: str):
    if sm.delete_custom_page(page_id):
        return {"success": True}
    raise HTTPException(status_code=404, detail="Custom page not found")

# ---- Strapi Integration ----
@app.get("/api/strapi/papers")
def get_strapi_papers(category: Optional[str] = None):
    try:
        strapi = StrapiClient()
        if not strapi.token:
            return {"error": "STRAPI_API_TOKEN_MISSING", "papers": []}
        papers = strapi.get_papers(category=category)
        return {"papers": papers}
    except Exception as e:
        return {"error": str(e), "papers": []}

@app.get("/api/strapi/blog")
def get_strapi_blog(category: Optional[str] = None):
    try:
        strapi = StrapiClient()
        posts = strapi.get_blog_posts(category=category)
        return {"posts": posts}
    except Exception as e:
        return {"error": str(e), "posts": []}

@app.post("/api/strapi/blog")
def create_strapi_blog(data: BlogPostCreate):
    try:
        strapi = StrapiClient()
        post_data = {
            "title": data.title,
            "content": data.content,
            "category": data.category,
            "author": data.author
        }
        result = strapi.create_blog_post(post_data)
        if result:
            return {"success": True, "result": result}
        raise HTTPException(status_code=500, detail="Strapi DB 저장 실패")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
