import os

path = r'c:\Users\301\auto\app_utils\state_manager.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

workspace_funcs = '''
def get_state_file(page_id="progress"):
    return os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), f"{page_id}_state.json")

WORKSPACE_STATE_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "workspace_state.json")

def load_workspace_state():
    if not os.path.exists(WORKSPACE_STATE_FILE):
        state = {"workspace_name": "Auto Workspace", "custom_pages": []}
        save_workspace_state(state)
        return state
    try:
        import json
        with open(WORKSPACE_STATE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return {"workspace_name": "Auto Workspace", "custom_pages": []}

def save_workspace_state(state):
    try:
        import json
        with open(WORKSPACE_STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f, ensure_ascii=False, indent=4)
    except Exception as e:
        print(f"Error saving workspace state: {e}")
'''

content = content.replace(
    'STATE_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "progress_state.json")',
    workspace_funcs
)

content = content.replace('def load_state():', 'def load_state(page_id="progress"):\n    state_file = get_state_file(page_id)')
content = content.replace('if not os.path.exists(STATE_FILE):', 'if not os.path.exists(state_file):')
content = content.replace('with open(STATE_FILE', 'with open(state_file')
content = content.replace('save_state(state)', 'save_state(state, page_id)')

content = content.replace('def save_state(state):', 'def save_state(state, page_id="progress"):\n    state_file = get_state_file(page_id)')

content = content.replace('def add_project(name, description=""):', 'def add_project(name, description="", page_id="progress"):')
content = content.replace('def delete_project(project_id):', 'def delete_project(project_id, page_id="progress"):')
content = content.replace('def update_project(project_id, name=None, description=None, status=None):', 'def update_project(project_id, name=None, description=None, status=None, page_id="progress"):')
content = content.replace('def get_projects():', 'def get_projects(page_id="progress"):')
content = content.replace('def get_project(project_id):', 'def get_project(project_id, page_id="progress"):')
content = content.replace('def add_task(project_id, title):', 'def add_task(project_id, title, page_id="progress"):')
content = content.replace('def toggle_task(project_id, task_id, completed):', 'def toggle_task(project_id, task_id, completed, page_id="progress"):')
content = content.replace('def delete_task(project_id, task_id):', 'def delete_task(project_id, task_id, page_id="progress"):')
content = content.replace('def add_document(project_id, title, parent_id=None):', 'def add_document(project_id, title, parent_id=None, page_id="progress"):')
content = content.replace('def delete_document(project_id, doc_id):', 'def delete_document(project_id, doc_id, page_id="progress"):')
content = content.replace('def update_document_title(project_id, doc_id, title):', 'def update_document_title(project_id, doc_id, title, page_id="progress"):')
content = content.replace('def add_block(project_id, doc_id, block_type, content=None, after_block_id=None):', 'def add_block(project_id, doc_id, block_type, content=None, after_block_id=None, page_id="progress"):')
content = content.replace('def update_block(project_id, doc_id, block_id, content):', 'def update_block(project_id, doc_id, block_id, content, page_id="progress"):')
content = content.replace('def delete_block(project_id, doc_id, block_id):', 'def delete_block(project_id, doc_id, block_id, page_id="progress"):')
content = content.replace('def move_block(project_id, doc_id, block_id, direction):', 'def move_block(project_id, doc_id, block_id, direction, page_id="progress"):')

content = content.replace('state = load_state()', 'state = load_state(page_id)')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("state_manager.py refactored successfully.")
