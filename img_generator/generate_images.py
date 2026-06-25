import os
import json
import torch
import argparse
from tqdm import tqdm
from dotenv import load_dotenv

# .env 환경 변수 로드
load_dotenv()

def load_sdxl_pipeline():
    """
    SDXL 모델을 GPU에 최적화하여 로드합니다.
    """
    print("[SDXL] Loading model 'stabilityai/stable-diffusion-xl-base-1.0'...")
    hf_token = os.getenv("HF_TOKEN")
    if not hf_token:
        print("[SDXL] Warning: HF_TOKEN is not set in .env. Gated models may fail to download.")
    
    from diffusers import AutoPipelineForText2Image
    pipe = AutoPipelineForText2Image.from_pretrained(
        "stabilityai/stable-diffusion-xl-base-1.0",
        torch_dtype=torch.float16,
        variant="fp16",
        use_safetensors=True,
        token=hf_token
    )
    # 16GB VRAM에 맞게 CPU 오프로드를 사용하여 메모리 효율을 극대화합니다.
    pipe.enable_model_cpu_offload()
    print("[SDXL] Model loaded successfully with CPU offloading.")
    return pipe

def generate_image_for_paper(pipe, summary_json_path: str, force: bool = False) -> bool:
    """
    단일 요약 JSON 파일에서 image_prompt를 읽어 이미지를 생성하고 저장합니다.
    """
    base_path, _ = os.path.splitext(summary_json_path)
    # _summary.json -> _illustration.png
    illustration_path = base_path.replace("_summary", "_illustration") + ".png"

    if os.path.exists(illustration_path) and not force:
        print(f"[SDXL] Skip (Already generated): {os.path.basename(illustration_path)}")
        return True

    if not os.path.exists(summary_json_path):
        print(f"[SDXL] Error: Summary file not found: {summary_json_path}")
        return False

    # JSON 데이터 로드
    try:
        with open(summary_json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"[SDXL] Failed to read JSON file: {e}")
        return False

    prompt = data.get("image_prompt")
    if not prompt:
        print(f"[SDXL] Warn: 'image_prompt' field is missing in: {os.path.basename(summary_json_path)}")
        return False

    print(f"\n[SDXL] Generating illustration for: {os.path.basename(summary_json_path)}")
    print(f" -> Prompt: {prompt}")

    try:
        image = pipe(
            prompt,
            guidance_scale=5.0,
            num_inference_steps=20,
            generator=torch.Generator("cpu").manual_seed(42)
        ).images[0]

        # 이미지 저장 경로의 디렉토리가 없을 경우 생성
        os.makedirs(os.path.dirname(illustration_path), exist_ok=True)
        image.save(illustration_path)
        print(f"[SDXL] Success! Illustration saved to: {illustration_path}")
        return True
    except Exception as e:
        print(f"[SDXL] Exception during generation: {e}")
        return False

def run_batch_generation(base_dir: str, force: bool = False):
    """
    collected_papers.json 내 수집된 모든 논문의 요약본을 찾아 순회하며 이미지를 생성합니다.
    """
    paper_summary_dir = os.path.join(base_dir, "paper_summary")
    history_file = os.path.join(paper_summary_dir, "collected_papers.json")
    
    if not os.path.exists(history_file):
        print("[SDXL] Error: No collected_papers.json found.")
        return

    with open(history_file, "r", encoding="utf-8") as f:
        papers = json.load(f)

    valid_tasks = []
    for paper in papers:
        pdf_path = paper.get("pdf_path")
        if not pdf_path:
            continue
            
        pdf_abs_path = os.path.join(paper_summary_dir, pdf_path)
        base_name, _ = os.path.splitext(pdf_abs_path)
        summary_path = f"{base_name}_summary.json"
        
        if os.path.exists(summary_path):
            valid_tasks.append(summary_path)

    if not valid_tasks:
        print("[SDXL] No summarized paper JSON files found to generate images for.")
        return

    print(f"[SDXL] Found {len(valid_tasks)} summarized papers. Initializing pipeline...")
    
    pipe = load_sdxl_pipeline()
    
    success_count = 0
    for summary_path in valid_tasks:
        success = generate_image_for_paper(pipe, summary_path, force=force)
        if success:
            success_count += 1
            
    print(f"\n[SDXL] Batch image generation finished. Successfully generated {success_count}/{len(valid_tasks)} images.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PPT 일러스트 자동 생성 (SDXL 모델 사용)")
    parser.add_argument("--json", type=str, help="이미지를 생성할 단일 요약 JSON 파일 경로")
    parser.add_argument("--force", action="store_true", help="이미지가 이미 존재하더라도 강제로 재생성")
    
    args = parser.parse_args()
    root_directory = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    if args.json:
        pipe = load_sdxl_pipeline()
        generate_image_for_paper(pipe, os.path.abspath(args.json), force=args.force)
    else:
        run_batch_generation(root_directory, force=args.force)
