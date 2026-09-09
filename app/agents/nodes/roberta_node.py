import json
import os
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
model = CLASSIFIER_MODEL


def _classify_ticket(text: str) -> tuple[str, float]:
    result = get_hf_client().zero_shot_classification(
        text,
        candidate_labels=encoder_classes,
        model=CLASSIFIER_MODEL,
    )
    best = max(zip(result.labels, result.scores), key=lambda item: item[1])
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

    transformed_label, confidence = _classify_ticket(full_ticket_text)

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
