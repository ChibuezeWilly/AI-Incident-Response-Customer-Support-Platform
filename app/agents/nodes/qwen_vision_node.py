import os
import asyncio
import logging
from pathlib import Path
from dotenv import load_dotenv
from agents.state import GraphState

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(dotenv_path=BASE_DIR / ".env")

QWEN_INSTRUCTION = (
    "You are an incident-triage assistant and engineer. Analyze the uploaded ticket image carefully, "
    "including any visible text, screenshots, error messages, and interface elements. First, provide a faithful "
    "transcription or description of the relevant contents. Then summarize the likely issue the user is experiencing "
    "and the evidence supporting that conclusion. Distinguish clearly between what is directly visible and what is an inference. "
    "If the image is unclear or information is missing, state the limitation instead of guessing."
)

try:
    from huggingface_hub import InferenceClient as _InferenceClient
except Exception as import_error:  
    _InferenceClient = None  
    _INFERENCE_CLIENT_IMPORT_ERROR = import_error
else:
    _INFERENCE_CLIENT_IMPORT_ERROR = None


def _build_client():
    if _InferenceClient is None:
        raise RuntimeError(
            "huggingface_hub is required for Qwen vision processing."
        ) from _INFERENCE_CLIENT_IMPORT_ERROR

    return _InferenceClient(
        provider="featherless-ai",
        api_key=os.environ.get("HF_TOKEN"),
        timeout=60.0,
    )


client = None
VISION_MODEL = "Qwen/Qwen3-VL-8B-Instruct"
# 

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

        response = None
        last_error = None
        
        # Retry loop for model busy / 400 capacity errors
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = await asyncio.to_thread(
                    client.chat.completions.create,
                    model=VISION_MODEL,
                    messages=messages,
                    max_tokens=512,
                )
                if response:
                    break
            except Exception as exc:
                last_error = exc
                logger.warning(
                    f"Attempt {attempt + 1}/{max_retries} failed for Qwen vision model: {exc}. Retrying..."
                )
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt * 2)  # Exponential backoff (2s, 4s...)

        if response is None:
           
            logger.error(f"Qwen vision model request failed after retries: {last_error}")
            analyses.append(f"[Vision Analysis Unavailable: Qwen inference service busy]")
            continue

        analysis_content = response.choices[0].message.content
        
        if len(images) > 1:
            analyses.append(f"### Image {index} Analysis\n{analysis_content}")
        else:
            analyses.append(analysis_content)

    return {"image_text": "\n\n---\n\n".join(analyses)}