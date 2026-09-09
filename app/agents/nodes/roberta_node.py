import json
import os
import asyncio
from typing import Any

from model.schemas.schema import DistilbertOutput
from services.telemetry import telemetry_client
from agents.state import GraphState
from services.hf_inference import get_hf_client

encoder_classes = [
    "Billing and Payments",
    "Customer Service",
    "General Inquiry",
    "Human Resources",
    "IT Support",
    "Product Support",
    "Returns and Exchanges",
    "Sales and Pre-Sales",
    "Service Outages and Maintenance",
    "Technical Support",
]

CLASSIFIER_MODEL = "facebook/bart-large-mnli"
CLASSIFIER_TIMEOUT_SECONDS = float(os.getenv("HF_CLASSIFIER_TIMEOUT_SECONDS", "30"))
CLASSIFIER_RETRIES = max(0, int(os.getenv("HF_CLASSIFIER_RETRIES", "2")))
model = CLASSIFIER_MODEL


def _classify_ticket(text: str) -> tuple[str, float]:
    result = get_hf_client().zero_shot_classification(
        text,
        candidate_labels=encoder_classes,
        model=CLASSIFIER_MODEL,
    )
    if hasattr(result, "labels") and hasattr(result, "scores"):
        labels = result.labels
        scores = result.scores
    elif isinstance(result, dict) and "labels" in result:
        labels = result["labels"]
        scores = result["scores"]
    elif isinstance(result, list):
        if result and isinstance(result[0], dict) and "labels" in result[0]:
            labels = result[0]["labels"]
            scores = result[0]["scores"]
        else:
            labels = [item["label"] for item in result]
            scores = [item["score"] for item in result]
    else:
        raise TypeError(f"Unexpected zero-shot response type: {type(result)!r}")

    best = max(zip(labels, scores), key=lambda item: item[1])
    return str(best[0]), float(best[1])


async def run_local_classifier(
    state: GraphState,
) -> DistilbertOutput:

    subject = state.subject or ""
    body = state.body or ""
    image_output = state.image_text or ""

    has_image = bool(state.has_image)

    if has_image:
        full_ticket_text = (
            f"Subject: {subject}\n" f"Body: {body}\n" f"Image Text: {image_output}"
        )

    else:
        full_ticket_text = f"Subject: {subject}\n" f"Body: {body}"

    last_error: Exception | None = None
    for attempt in range(CLASSIFIER_RETRIES + 1):
        try:
            transformed_label, confidence = await asyncio.wait_for(
                asyncio.to_thread(_classify_ticket, full_ticket_text),
                timeout=CLASSIFIER_TIMEOUT_SECONDS,
            )
            break
        except Exception as exc:
            last_error = exc
            if attempt < CLASSIFIER_RETRIES:
                await asyncio.sleep(2**attempt)
    else:
        raise RuntimeError("Hugging Face ticket classification failed.") from last_error

    telemetry_data = None

    telemetry_departments = {
        "Billing and Payments",
        "Customer Service",
        "General Inquiry",
        "Human Resources",
        "IT Support",
        "Product Support",
        "Returns and Exchanges",
        "Sales and Pre-Sales",
        "Service Outages and Maintenance",
        "Technical Support",
    }

    if transformed_label in telemetry_departments:

        telemetry_data = await telemetry_client.query_cluster_metrics(
            region="EU-West-1"
        )

    return {
        "department": transformed_label,
        "confidence": confidence,
        "unified_ticket": full_ticket_text,
        "telemetry_data": telemetry_data,
    }
