from __future__ import annotations

from typing import Any
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ...database.postgres import models


def build_initial_graph_state(
    *,
    ticket_id: int,
    user_id: int,
    email: str,
    subject: str,
    body: str,
    account_tier: str,
    image_data_urls: list[str],
) -> dict[str, Any]:
    """Build the LangGraph input used by both live tickets and recovery jobs."""
    return {
        "id": ticket_id,
        "user_id": user_id,
        "email": email,
        "subject": subject,
        "has_image": bool(image_data_urls),
        "images": image_data_urls,
        "image": image_data_urls[0] if image_data_urls else None,
        "body": body,
        "account_tier": account_tier,
        "status": "QUEUED",
        "latency": 0.0,
        "retries": 0,
        "retrieved_docs": [],
    }


def _extract_uploaded_images(ticket: Any) -> list[str]:
    """Recover uploaded image data URLs from persisted ticket data."""
    telemetry_data = ticket.telemetry_data or {}
    uploaded_images = telemetry_data.get("uploaded_images") if isinstance(
        telemetry_data, dict
    ) else None

    if isinstance(uploaded_images, list):
        return [image for image in uploaded_images if isinstance(image, str)]

    if ticket.image_url:
        return [ticket.image_url]

    return []


def build_recovery_graph_state(ticket: Any) -> dict[str, Any]:
    """Rebuild the LangGraph input from the persisted ticket row."""
    owner = ticket.owner
    if owner is None:
        raise ValueError(f"Ticket #{ticket.id} is missing its owner record.")

    image_data_urls = _extract_uploaded_images(ticket)

    return build_initial_graph_state(
        ticket_id=ticket.id,
        user_id=owner.id,
        email=owner.email,
        subject=ticket.subject,
        body=ticket.body,
        account_tier=ticket.account_tier,
        image_data_urls=image_data_urls,
    )
