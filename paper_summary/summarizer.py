import os
import json
import argparse
import requests
from pypdf import PdfReader
from tqdm import tqdm
from typing import Dict, Any, Optional, List

# 로컬 Ollama 엔드포인트
OLLAMA_API_URL = "http://localhost:11434/api/chat"

def extract_images_from_pdf(pdf_path: str, output_dir: str) -> List[str]:
    """
    pypdf를 사용하여 PDF 내부의 인라인 이미지를 추출해 지정된 폴더에 저장합니다.
    5KB 미만의 이미지(로고, 아이콘 등)는 무시합니다.
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    extracted_files = []
    try:
        reader = PdfReader(pdf_path)
        count = 0
        for page_num, page in enumerate(reader.pages):
            for img_idx, image_file_object in enumerate(page.images):
                # 5KB 이하의 매우 작은 이미지는 제외 (보통 화살표나 로고 아이콘임)
                if len(image_file_object.data) < 5000:
                    continue
                
                # 확장자 파싱
                ext = os.path.splitext(image_file_object.name)[1]
                if not ext or len(ext) > 5:
                    ext = ".png"
                    
                img_name = f"page_{page_num+1}_img_{img_idx+1}{ext}"
                img_path = os.path.join(output_dir, img_name)
                
                with open(img_path, "wb") as fp:
                    fp.write(image_file_object.data)
                extracted_files.append(img_path)
                count += 1
        print(f"[Summarizer] Extracted {count} images from PDF to: {output_dir}")
    except Exception as e:
        print(f"[Summarizer] Failed to extract images from PDF: {e}")
    return extracted_files

def request_section_summary(text: str, section_type: str, model: str) -> Optional[Dict[str, Any]]:
    """
    텍스트 청크를 받아 특정 도메인(섹션) 형식에 맞는 요약을 Ollama에 요청합니다.
    """
    if section_type == 'intro':
        system_prompt = (
            "You are an elite academic analyst. Analyze the provided text which represents the introduction and background of a research paper.\n"
            "Summarize the key problems the paper addresses, why they are important, and the overall motivation of the study.\n"
            "You must return ONLY a JSON object that strictly adheres to the following format without any markdown code block wrapper or extra text:\n"
            "{\n"
            '  "title": "서론 및 연구 배경",\n'
            '  "content": "A detailed summary in Korean (150-250 words) explaining the background, motivation, and problem statement."\n'
            "}"
        )
    elif section_type == 'methodology':
        system_prompt = (
            "You are an elite academic analyst. Analyze the provided text which is the methodology, core system design, and theoretical formulation of a research paper.\n"
            "Identify the proposed methods, algorithms, system architecture, and crucially, any key mathematical equations (formulas) presented in LaTeX format.\n"
            "You must return ONLY a JSON object that strictly adheres to the following format without any markdown code block wrapper or extra text:\n"
            "{\n"
            '  "title": "제안 방법론 및 핵심 이론",\n'
            '  "content": "A detailed summary in Korean (150-250 words) explaining the system design, core methodology, and workflow.",\n'
            '  "equations": [\n'
            '    {\n'
            '      "formula": "The main mathematical formula in LaTeX format (e.g., E = mc^2 or \\\\mathcal{L} = ...)",\n'
            '      "explanation": "Detailed Korean explanation of the formula, defining the variables and its physical/mathematical meaning."\n'
            '    }\n'
            '  ]\n'
            "}"
        )
    else: # experiments_conclusion
        system_prompt = (
            "You are an elite academic analyst. Analyze the provided text which represents the experiments, evaluations, results, and conclusion of a research paper.\n"
            "Summarize the evaluation setup, datasets, quantitative results, and the final takeaways/conclusion of the paper.\n"
            "You must return ONLY a JSON object that strictly adheres to the following format without any markdown code block wrapper or extra text:\n"
            "{\n"
            '  "title": "실험 결과 및 결론",\n'
            '  "content": "A detailed summary in Korean (150-250 words) explaining the experimental findings, benchmarks, and conclusion."\n'
            "}"
        )

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Analyze the following text portion and return JSON:\n\n{text}"}
        ],
        "options": {"temperature": 0.2},
        "format": "json",
        "stream": False
    }

    try:
        response = requests.post(OLLAMA_API_URL, json=payload, timeout=180)
        if response.status_code != 200:
            print(f"[Ollama] HTTP Error: {response.status_code}")
            return None
        content = response.json().get("message", {}).get("content", "")
        return json.loads(content)
    except Exception as e:
        print(f"[Ollama] Exception summarizing {section_type}: {e}")
        return None

def generate_korean_title(original_title: str, text_snippet: str, model: str) -> str:
    """
    논문의 원문 제목을 바탕으로 읽기 쉽고 매끄러운 학술적 한글 제목을 만듭니다.
    """
    system_prompt = (
        "You are an academic translator. Translate the given English research paper title into a natural and academic Korean title.\n"
        "Return ONLY a JSON object in this exact format:\n"
        "{\n"
        '  "korean_title": "번역된 한국어 논문 제목"\n'
        "}"
    )
    
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"English Title: {original_title}\nPaper snippet: {text_snippet[:1500]}"}
        ],
        "options": {"temperature": 0.1},
        "format": "json",
        "stream": False
    }
    
    try:
        response = requests.post(OLLAMA_API_URL, json=payload, timeout=60)
        if response.status_code == 200:
            res_json = json.loads(response.json().get("message", {}).get("content", ""))
            return res_json.get("korean_title", original_title)
    except Exception:
        pass
    return original_title

def generate_sdxl_image_prompt(sections: List[Dict[str, Any]], model: str) -> str:
    """
    모든 요약된 파트들을 종합하여 SDXL이 논문 핵심을 나타내는 최적의 10단어 이내 키워드 위주의 프롬프트를 그리도록 요청합니다.
    """
    combined = "\n".join([f"[{s.get('title')}]\n{s.get('content')}" for s in sections])
    
    system_prompt = (
        "You are an elite designer creating prompt keywords for SDXL.\n"
        "Create a short, comma-separated English keyword list representing the core technical/scientific concept visually.\n"
        "Rules:\n"
        "1. Limit to max 10 words. Only use keywords separated by commas.\n"
        "2. Do NOT write full sentences, descriptions, or explanations.\n"
        "3. Emphasize diagrams, charts, flowcharts, technical schematics, or clean vector designs.\n"
        "4. Return ONLY a JSON object in this format:\n"
        "{\n"
        '  "image_prompt": "keyword1, keyword2, keyword3, technical diagram, clean background"\n'
        "}"
    )
    
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Create SDXL prompt keywords for this paper summary:\n\n{combined}"}
        ],
        "options": {"temperature": 0.2},
        "format": "json",
        "stream": False
    }
    
    try:
        response = requests.post(OLLAMA_API_URL, json=payload, timeout=60)
        if response.status_code == 200:
            res_json = json.loads(response.json().get("message", {}).get("content", ""))
            return res_json.get("image_prompt", "scientific flowchart, technical diagram")
    except Exception:
        pass
    return "scientific flowchart, technical diagram"

def process_single_pdf(pdf_path: str, model: str, force: bool = False) -> bool:
    """
    단일 PDF 파일에서 이미지를 추출하고, 텍스트를 페이지별로 나누어 3개 파트로 청크 요약을 진행한 후
    수식과 함께 상세한 JSON 파일로 저장합니다.
    """
    base_name, _ = os.path.splitext(pdf_path)
    summary_path = f"{base_name}_summary.json"
    
    if os.path.exists(summary_path) and not force:
        print(f"[Summarizer] Skip (Already summarized): {os.path.basename(summary_path)}")
        return True
        
    if not os.path.exists(pdf_path):
        print(f"[Summarizer] Error: PDF file not found at {pdf_path}")
        return False

    print(f"\n[Summarizer] Processing text and image extraction from: {os.path.basename(pdf_path)}")
    
    # 1. PDF 내부 이미지(그래프) 추출 및 저장
    # PDF 경로와 동일한 폴더에 '[논문명]_images' 라는 폴더를 만들어 저장합니다.
    images_output_dir = base_name + "_images"
    extract_images_from_pdf(pdf_path, images_output_dir)

    # 2. PDF 페이지별 텍스트 추출 및 파트 분할
    try:
        reader = PdfReader(pdf_path)
        pages_text = []
        for p in reader.pages:
            t = p.extract_text()
            if t:
                pages_text.append(t)
    except Exception as e:
        print(f"[Summarizer] Failed to read PDF text: {e}")
        return False
        
    if not pages_text:
        print(f"[Summarizer] Error: Extracted text is empty for {pdf_path}")
        return False

    total_pages = len(pages_text)
    print(f"[Summarizer] Read {total_pages} pages from PDF.")

    # 3등분으로 페이지 나누기
    intro_chunk = ""
    method_chunk = ""
    conclusion_chunk = ""

    if total_pages <= 2:
        # 페이지 수가 너무 작을 경우, 전체를 하나로 취급하되 Methodology와 Conclusion을 적절히 나눔
        intro_chunk = pages_text[0]
        method_chunk = pages_text[0]
        conclusion_chunk = pages_text[-1]
    else:
        part_size = max(1, total_pages // 3)
        intro_chunk = "\n".join(pages_text[:part_size])
        method_chunk = "\n".join(pages_text[part_size : part_size * 2])
        conclusion_chunk = "\n".join(pages_text[part_size * 2 :])

    # 3. 각 파트별 순차 요약 진행
    print("[Summarizer] 요약 진행 - 1단계: 서론 및 연구 배경...")
    intro_summary = request_section_summary(intro_chunk, "intro", model)
    
    print("[Summarizer] 요약 진행 - 2단계: 핵심 방법론 및 수식 추출...")
    method_summary = request_section_summary(method_chunk, "methodology", model)
    
    print("[Summarizer] 요약 진행 - 3단계: 실험 결과 및 결론...")
    conclusion_summary = request_section_summary(conclusion_chunk, "experiments_conclusion", model)

    # 파트별 요약 보정 (실패 시 빈 템플릿 처리)
    if not intro_summary:
        intro_summary = {"title": "서론 및 연구 배경", "content": "서론 요약 생성 실패"}
    if not method_summary:
        method_summary = {"title": "제안 방법론 및 핵심 이론", "content": "방법론 요약 생성 실패", "equations": []}
    if not conclusion_summary:
        conclusion_summary = {"title": "실험 결과 및 결론", "content": "실험 결과 요약 생성 실패"}

    sections = [
        {"title": intro_summary.get("title", "서론 및 연구 배경"), "content": intro_summary.get("content", "")},
        {"title": method_summary.get("title", "제안 방법론 및 핵심 이론"), "content": method_summary.get("content", "")},
        {"title": conclusion_summary.get("title", "실험 결과 및 결론"), "content": conclusion_summary.get("content", "")}
    ]
    
    equations = method_summary.get("equations", [])
    if not isinstance(equations, list):
        equations = []

    # 4. 논문 한글 제목 및 SDXL 이미지 프롬프트 생성
    original_title = os.path.basename(base_name)
    print("[Summarizer] 요약 진행 - 4단계: 한글 제목 번역 및 이미지 프롬프트 생성...")
    korean_title = generate_korean_title(original_title, intro_chunk, model)
    image_prompt = generate_sdxl_image_prompt(sections, model)

    # 5. 최종 데이터 구조 취합 및 JSON 저장
    final_data = {
        "original_title": original_title,
        "korean_title": korean_title,
        "sections": sections,
        "equations": equations,
        "image_prompt": image_prompt
    }

    try:
        with open(summary_path, "w", encoding="utf-8") as f:
            json.dump(final_data, f, indent=4, ensure_ascii=False)
        print(f"[Summarizer] Success! High-fidelity summary saved to: {summary_path}")
        return True
    except Exception as e:
        print(f"[Summarizer] Failed to save summary JSON: {e}")
        return False

def run_batch_summarization(model: str, base_dir: str, force: bool = False):
    """
    collected_papers.json에 저장된 논문 중 pdf_path가 유효한 것들을 일괄 요약합니다.
    """
    history_file = os.path.join(base_dir, "collected_papers.json")
    if not os.path.exists(history_file):
        print("[Summarizer] Error: No collected_papers.json found.")
        return

    with open(history_file, "r", encoding="utf-8") as f:
        papers = json.load(f)

    valid_papers = [p for p in papers if p.get("pdf_path") is not None]
    if not valid_papers:
        print("[Summarizer] No downloaded PDF papers found in history.")
        return

    print(f"[Summarizer] Found {len(valid_papers)} PDF papers in history. Starting batch processing...")
    
    success_count = 0
    for paper in tqdm(valid_papers, desc="Summarizing papers"):
        pdf_relative_path = paper.get("pdf_path")
        pdf_absolute_path = os.path.join(base_dir, pdf_relative_path)
        
        if not os.path.exists(pdf_absolute_path):
            print(f"\n[Summarizer] Warn: PDF file not found at: {pdf_absolute_path}")
            continue
            
        success = process_single_pdf(pdf_absolute_path, model, force=force)
        if success:
            success_count += 1
            
    print(f"\n[Summarizer] Batch process finished. Successfully summarized {success_count}/{len(valid_papers)} papers.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Local LLM을 이용한 논문 청크 기반 다단계 요약 및 수식 추출")
    parser.add_argument("--pdf", type=str, help="요약할 단일 PDF 파일 경로 (생략 시 수집 목록 일괄 요약)")
    parser.add_argument("--model", type=str, default="qwen3.5:9b", help="사용할 로컬 Ollama 모델 이름")
    parser.add_argument("--force", action="store_true", help="이미 요약된 JSON이 존재하더라도 강제로 재요약")
    
    args = parser.parse_args()
    base_directory = os.path.dirname(os.path.abspath(__file__))
    
    if args.pdf:
        pdf_abs_path = os.path.abspath(args.pdf)
        process_single_pdf(pdf_abs_path, args.model, force=args.force)
    else:
        run_batch_summarization(args.model, base_directory, force=args.force)
