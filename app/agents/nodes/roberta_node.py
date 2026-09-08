from pathlib import Path
from typing import Any

from model.schemas.schema import DistilbertOutput
from services.telemetry import telemetry_client
from agents.state import GraphState

MODEL_DIR = (Path(__file__).resolve().parents[2] / "model" / "ml").resolve()

if not MODEL_DIR.exists():
    raise FileNotFoundError(f"Model directory does not exist: {MODEL_DIR}")

required_files = [
    "config.json",
    "tokenizer.json",
    "tokenizer_config.json",
]

for filename in required_files:
    file_path = MODEL_DIR / filename

    if not file_path.exists():
        raise FileNotFoundError(f"Required model file is missing: {file_path}")


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

model = None
ticket_router = None
label_to_id: dict[str, int] = {}


def _load_classifier():
    """Load the local classifier only when a ticket needs it."""
    global model, ticket_router, label_to_id

    if ticket_router is not None:
        return ticket_router

    from transformers import AutoModelForSequenceClassification, AutoTokenizer, pipeline

    model_weights = [
        MODEL_DIR / "model.safetensors",
        MODEL_DIR / "pytorch_model.bin",
    ]
    if not any(path.exists() for path in model_weights):
        raise FileNotFoundError(f"No model weights found inside: {MODEL_DIR}")

    tokenizer = AutoTokenizer.from_pretrained(
        str(MODEL_DIR),
        local_files_only=True,
    )
    model = AutoModelForSequenceClassification.from_pretrained(
        str(MODEL_DIR),
        local_files_only=True,
    )

    if model.config.num_labels != len(encoder_classes):
        raise ValueError(
            f"Model expects {model.config.num_labels} labels, "
            f"but encoder contains {len(encoder_classes)} labels."
        )

    label_to_id = {
        str(label): int(index)
        for label, index in model.config.label2id.items()
    }
    ticket_router = pipeline(
        task="text-classification",
        model=model,
        tokenizer=tokenizer,
        max_length=512,
        truncation=True,
    )
    return ticket_router


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

    prediction: dict[str, Any] = _load_classifier()(full_ticket_text)[0]

    predicted_label = str(prediction["label"])
    confidence = float(prediction["score"])

    predicted_id = label_to_id.get(predicted_label)
    if predicted_id is None and predicted_label.startswith("LABEL_"):
        try:
            predicted_id = int(predicted_label.removeprefix("LABEL_"))
        except ValueError:
            predicted_id = None

    if predicted_id is None or not 0 <= predicted_id < len(encoder_classes):
        raise ValueError(f"Model predicted unknown class ID: {predicted_id}")

    transformed_label = encoder_classes[predicted_id]

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
