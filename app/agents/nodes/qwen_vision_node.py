# app/agents/nodes/qwen_vision_node.py
import os
import asyncio
from pathlib import Path
from dotenv import load_dotenv
from agents.state import GraphState
from huggingface_hub import InferenceClient

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(dotenv_path=BASE_DIR / ".env")

# System prompt for structured vision analysis
QWEN_INSTRUCTION = (
    "You are an incident-triage assistant and engineer. Analyze the uploaded ticket image carefully, "
    "including any visible text, screenshots, error messages, and interface elements. First, provide a faithful "
    "transcription or description of the relevant contents. Then summarize the likely issue the user is experiencing "
    "and the evidence supporting that conclusion. Distinguish clearly between what is directly visible and what is an inference. "
    "If the image is unclear or information is missing, state the limitation instead of guessing."
)

try:
    from huggingface_hub import InferenceClient
except Exception as import_error:  
    InferenceClient = None  
    _INFERENCE_CLIENT_IMPORT_ERROR = import_error
else:
    _INFERENCE_CLIENT_IMPORT_ERROR = None


def _build_client() -> "InferenceClient":
    if InferenceClient is None:
        raise RuntimeError(
            "huggingface_hub is required for Qwen vision processing."
        ) from _INFERENCE_CLIENT_IMPORT_ERROR

    return InferenceClient(api_key=os.environ.get("HF_TOKEN"))


client = None
VISION_MODEL_CANDIDATES = [
    os.getenv("QWEN_VISION_MODEL", "").strip(),
    "Qwen/Qwen3-VL-8B-Instruct",
    "Qwen/Qwen3-VL-8B-Instruct:featherless-ai",
    "Qwen/Qwen2.5-VL-7B-Instruct",
]
VISION_MODEL_CANDIDATES = [
    model_name
    for model_name in VISION_MODEL_CANDIDATES
    if model_name
]

async def process_ticket_image(state: GraphState) -> dict:
    global client
    if client is None:
        client = _build_client()

    has_image = getattr(state, "has_image", False)
    
    raw_images = getattr(state, "images", None) or getattr(state, "image_data_urls", None) or getattr(state, "image", None)
    
    if isinstance(raw_images, str):
        images = [raw_images]
    elif isinstance(raw_images, list):
        images = raw_images
    else:
        images = []

    if not (has_image or images):
        return {"image_text": ""}

    analyses = []

    for index, image_url in enumerate(images, start=1):
       
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": QWEN_INSTRUCTION},
                    {"type": "image_url", "image_url": {"url": image_url}},
                ],
            }
        ]

        last_error: Exception | None = None
        response = None
        for model_name in VISION_MODEL_CANDIDATES:
            try:
                response = await asyncio.to_thread(
                    client.chat.completions.create,
                    model=model_name,
                    messages=messages,
                    max_tokens=512,
                )
                break
            except Exception as exc:
                last_error = exc

        if response is None:
            raise RuntimeError(
                "Qwen vision model request failed for all configured model names."
            ) from last_error

        analysis_content = response.choices[0].message.content
        
        if len(images) > 1:
            analyses.append(f"### Image {index} Analysis\n{analysis_content}")
        else:
            analyses.append(analysis_content)

    return {"image_text": "\n\n---\n\n".join(analyses)}
