"""Test which HuggingFace models are working."""
import os, httpx
from dotenv import load_dotenv
load_dotenv()

token = os.environ.get("GPT_OSS_MODEL_API_KEY", "")
models = [
    "mistralai/Mixtral-8x22B-Instruct-v0.1",
    "mistralai/Mixtral-8x7B-Instruct-v0.1",
    "mistralai/Mistral-7B-Instruct-v0.3",
    "meta-llama/Meta-Llama-3-8B-Instruct",
    "microsoft/Phi-3-mini-4k-instruct",
    "HuggingFaceH4/zephyr-7b-beta",
    "Qwen/Qwen2.5-72B-Instruct",
    "mistralai/Mistral-Small-24B-Instruct-2501",
]

headers = {"Authorization": f"Bearer {token}"}
for m in models:
    url = f"https://api-inference.huggingface.co/models/{m}/v1/chat/completions"
    try:
        r = httpx.post(
            url,
            headers=headers,
            json={"model": m, "messages": [{"role": "user", "content": "Say hi"}], "max_tokens": 5},
            timeout=30,
        )
        status = r.status_code
        if status == 200:
            text = r.json()["choices"][0]["message"]["content"][:50]
            print(f"  {m}: {status} -> {text}")
        else:
            detail = r.text[:100]
            print(f"  {m}: {status} -> {detail}")
    except Exception as e:
        print(f"  {m}: ERROR -> {e}")
