import os
import torch
from diffusers import StableDiffusionXLPipeline, FluxPipeline

def test_sdxl():
    print("🚀 [SDXL] Testing SDXL dog image generation...")
    pipe = StableDiffusionXLPipeline.from_pretrained(
        "stabilityai/stable-diffusion-xl-base-1.0",
        torch_dtype=torch.float16,
        variant="fp16",
        use_safetensors=True
    )
    pipe.enable_model_cpu_offload()
    
    prompt = "A cute fluffy golden retriever puppy playing in a green park, highly detailed, 4k"
    image = pipe(prompt, num_inference_steps=20).images[0]
    
    out_path = os.path.join(os.path.dirname(__file__), "test_sdxl_dog.png")
    image.save(out_path)
    print(f"✅ [SDXL] Saved to {out_path}")
    
    # 메모리 정리
    del pipe
    torch.cuda.empty_cache()

def test_flux():
    print("\n🚀 [FLUX] Testing FLUX.1-schnell dog image generation...")
    pipe = FluxPipeline.from_pretrained(
        "black-forest-labs/FLUX.1-schnell",
        torch_dtype=torch.bfloat16
    )
    pipe.enable_model_cpu_offload()
    
    prompt = "A cute fluffy golden retriever puppy playing in a green park, highly detailed, 4k"
    # FLUX.1-schnell은 4 step 권장
    image = pipe(
        prompt,
        guidance_scale=0.0,
        num_inference_steps=4,
        max_sequence_length=256,
        generator=torch.Generator("cpu").manual_seed(0)
    ).images[0]
    
    out_path = os.path.join(os.path.dirname(__file__), "test_flux_dog.png")
    image.save(out_path)
    print(f"✅ [FLUX] Saved to {out_path}")
    
    # 메모리 정리
    del pipe
    torch.cuda.empty_cache()

if __name__ == "__main__":
    print("==================================================")
    print("🐶 SDXL vs FLUX 이미지 생성 모델 비교 테스트 🐶")
    print("==================================================")
    
    try:
        test_sdxl()
    except Exception as e:
        print(f"❌ [SDXL] Error: {e}")
        
    try:
        test_flux()
    except Exception as e:
        print(f"❌ [FLUX] Error: {e}")
