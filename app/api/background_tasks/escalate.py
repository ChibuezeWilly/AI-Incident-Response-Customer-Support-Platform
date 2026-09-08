from __future__ import annotations

from typing import Any

from agents.state import GraphState

import httpx

from fastapi import status, HTTPException

from database.postgres.database import get_db_ctx
from database.postgres import models
from database.postgres.config import settings

jira_api_key = settings.JIRA_API_KEY
jira_username = settings.JIRA_EMAIL
jira_base_url = settings.JIRA_BASE_URL
jira_project_key = settings.JIRA_PROJECT_KEY


async def fetch_ticket_details(
    state: GraphState,
    updated_status: str,
    failure_reason: str | None = None,
    jira_details: dict | None = None,
):
    ticket_id = getattr(state, "id", None)
    if ticket_id is None and isinstance(state, dict):
        ticket_id = state.get("id")

    if ticket_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ticket ID not found in graph state",
        )

    with get_db_ctx() as db:
        ticket = (
            db.query(models.Tickets)
            .filter(models.Tickets.id == ticket_id)
            .first()
        )

        if ticket is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ticket not found",
            )

        try:
            ticket.status = updated_status
            if updated_status == "FAILED" and failure_reason:
                ticket.ticket_check_message = failure_reason
            if jira_details:
                telemetry = dict(ticket.telemetry_data or {})
                telemetry["jira_escalation"] = jira_details
                ticket.telemetry_data = telemetry

            db.commit()
            db.refresh(ticket)

            return {
                "status": updated_status,
            }

        except Exception as exc:
            db.rollback()

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ticket status not updated: {str(exc)}",
            ) from exc

def build_jira_description(
    subject,
    body,
    unified_ticket,
    department,
    confidence,
    user_id,
    email,
    account_tier,
    extracted_keywords,
    search_query,
    retrieved_docs,
    telemetry_data,
):
    """
    Builds a Jira ADF (Atlassian Document Format) description.

    This keeps your complete AI/incident context inside Jira.
    """

    content = []

    content.append(
        {
            "type": "heading",
            "attrs": {
                "level": 2,
            },
            "content": [
                {
                    "type": "text",
                    "text": "Incident Details",
                }
            ],
        }
    )

    def add_field(label, value):
        content.append(
            {
                "type": "paragraph",
                "content": [
                    {
                        "type": "text",
                        "text": f"{label}: ",
                        "marks": [
                            {
                                "type": "strong",
                            }
                        ],
                    },
                    {
                        "type": "text",
                        "text": str(value if value is not None else "N/A"),
                    },
                ],
            }
        )

    add_field("Subject", subject)
    add_field("Ticket Body", body)
    add_field("Department", department)
    add_field("Routing Confidence", confidence)
    add_field("User ID", user_id)
    add_field("Account Email", email)
    add_field("Account Tier", account_tier)
    add_field("Search Query", search_query)


    content.append(
        {
            "type": "heading",
            "attrs": {
                "level": 3,
            },
            "content": [
                {
                    "type": "text",
                    "text": "Unified Ticket / OCR Context",
                }
            ],
        }
    )

    content.append(
        {
            "type": "paragraph",
            "content": [
                {
                    "type": "text",
                    "text": str(
                        unified_ticket
                        if unified_ticket
                        else "No unified ticket context available."
                    ),
                }
            ],
        }
    )


    content.append(
        {
            "type": "heading",
            "attrs": {
                "level": 3,
            },
            "content": [
                {
                    "type": "text",
                    "text": "Extracted Keywords",
                }
            ],
        }
    )

    if isinstance(extracted_keywords, list):
        keywords_text = ", ".join(
            str(keyword)
            for keyword in extracted_keywords
        )
    else:
        keywords_text = str(
            extracted_keywords
            if extracted_keywords
            else "None"
        )

    content.append(
        {
            "type": "paragraph",
            "content": [
                {
                    "type": "text",
                    "text": keywords_text,
                }
            ],
        }
    )


    content.append(
        {
            "type": "heading",
            "attrs": {
                "level": 3,
            },
            "content": [
                {
                    "type": "text",
                    "text": "Retrieved RAG Documents / Knowledge Base Context",
                }
            ],
        }
    )

    if retrieved_docs:

        for idx, doc in enumerate(
            retrieved_docs,
            start=1,
        ):

            if isinstance(doc, dict):

                doc_id = doc.get(
                    "document_id",
                    "",
                )

                doc_content = doc.get(
                    "document_content",
                    "",
                )

            else:

                doc_id = getattr(
                    doc,
                    "document_id",
                    "",
                )

                doc_content = getattr(
                    doc,
                    "document_content",
                    "",
                )

            content.append(
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": f"Reference [{idx}] - {doc_id}: ",
                            "marks": [
                                {
                                    "type": "strong",
                                }
                            ],
                        },
                        {
                            "type": "text",
                            "text": str(doc_content),
                        },
                    ],
                }
            )

    else:

        content.append(
            {
                "type": "paragraph",
                "content": [
                    {
                        "type": "text",
                        "text": "None found or required.",
                    }
                ],
            }
        )

    if telemetry_data:

        content.append(
            {
                "type": "heading",
                "attrs": {
                    "level": 3,
                },
                "content": [
                    {
                        "type": "text",
                        "text": "Telemetry / Logs",
                    }
                ],
            }
        )

        content.append(
            {
                "type": "codeBlock",
                "attrs": {
                    "language": "text",
                },
                "content": [
                    {
                        "type": "text",
                        "text": str(telemetry_data),
                    }
                ],
            }
        )

    return {
        "type": "doc",
        "version": 1,
        "content": content,
    }

def normalize_label(value):
    """
    Converts values into Jira-safe labels.

    Example:
        Customer Success -> customer-success
        Enterprise      -> enterprise
    """

    if value is None:
        return ""

    return (
        str(value)
        .strip()
        .lower()
        .replace(" ", "-")
        .replace("_", "-")
    )


def build_labels(tags, account_tier, department):

    labels = []

    if isinstance(tags, list):

        labels.extend(
            normalize_label(tag)
            for tag in tags
            if tag
        )

    if account_tier:
        labels.append(
            normalize_label(account_tier)
        )

    if department:
        labels.append(
            normalize_label(department)
        )

    # Remove duplicates / empty labels
    return list(
        dict.fromkeys(
            label
            for label in labels
            if label
        )
    )

async def escalate_to_l3(
    state_or_thread_id: GraphState | dict[str, Any] | str,
):
    """
    Dual-purpose worker node.

    Can be invoked inside LangGraph:
        receives GraphState

    Or via background task:
        receives thread_id

    The function retrieves the LangGraph state when a
    thread_id is supplied.
    """

    from agents.graph import get_graph

    if isinstance(state_or_thread_id, str):

        config = {
            "configurable": {
                "thread_id": state_or_thread_id,
            }
        }

        ticket_state = await get_graph().aget_state(
            config
        )

        state = ticket_state.values

        if not state:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    "No state found for thread_id "
                    f"{state_or_thread_id}"
                ),
            )

    elif isinstance(state_or_thread_id, (GraphState, dict)):

        state = state_or_thread_id

    else:

        raise ValueError(
            "Invalid payload format passed to "
            "escalate_to_l3 node."
        )

    def get_field(
        field_name: str,
        default_value: Any = "",
    ) -> Any:

        if isinstance(state, dict):

            val = state.get(
                field_name,
                default_value,
            )

        else:

            val = getattr(
                state,
                field_name,
                default_value,
            )

        return (
            default_value
            if val is None
            else val
        )

    if not jira_username:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JIRA_EMAIL is not configured.",
        )

    if not jira_api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JIRA_API_KEY is not configured.",
        )

    if not jira_base_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JIRA_BASE_URL is not configured.",
        )

    
    jira_base_url_clean = jira_base_url.rstrip("/")

    jira_url = (
        f"{jira_base_url_clean}"
        "/rest/api/3/issue"
    )
    
    subject = get_field(
        "subject",
        "No Subject",
    )

    body = get_field(
        "body",
        "",
    )

    unified_ticket = get_field(
        "unified_ticket",
        "",
    )

    department = get_field(
        "department",
        "General",
    )

    confidence = get_field(
        "confidence",
        0.0,
    )

    user_id = get_field(
        "user_id",
        "",
    )

    email = get_field(
        "email",
        "",
    )

    account_tier = get_field(
        "account_tier",
        "Standard",
    )

    extracted_keywords = get_field(
        "extracted_keywords",
        [],
    )

    search_query = get_field(
        "search_query",
        "",
    )

    retrieved_docs = get_field(
        "retrieved_docs",
        [],
    )

    telemetry_data = get_field(
        "telemetry_data",
        "",
    )

    priority = get_field(
        "priority",
        "Medium",
    )

    tags = get_field(
        "tags",
        [],
    )
    
    labels = build_labels(
        tags=tags,
        account_tier=account_tier,
        department=department,
    )

    jira_description = build_jira_description(
        subject=subject,
        body=body,
        unified_ticket=unified_ticket,
        department=department,
        confidence=confidence,
        user_id=user_id,
        email=email,
        account_tier=account_tier,
        extracted_keywords=extracted_keywords,
        search_query=search_query,
        retrieved_docs=retrieved_docs,
        telemetry_data=telemetry_data,
    )

    payload = {
        "fields": {
            "project": {
                "key": jira_project_key,
            },

            "summary": (
                f"[{str(priority).upper()}] "
                f"[{department}] "
                f"{subject}"
            ),

            "issuetype": {
                "name": "Incident",
            },

            "priority": {
                "name": priority,
            },

            "labels": labels,

            "description": jira_description,
        }
    }

    try:

        async with httpx.AsyncClient(
            timeout=30.0
        ) as client:

            response = await client.post(
                jira_url,

                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },

                auth=(
                    jira_username,
                    jira_api_key,
                ),

                json=payload,
            )

    except httpx.TimeoutException:

        await fetch_ticket_details(
            state,
            updated_status="FAILED",
            failure_reason="Jira request timed out.",
        )

        return {
            "escalation_message": (
                "Jira request timed out."
            ),
            "status": "FAILED",
        }

    except httpx.RequestError as exc:

        await fetch_ticket_details(
            state,
            updated_status="FAILED",
            failure_reason=f"Unable to connect to Jira: {str(exc)}",
        )

        return {
            "escalation_message": (
                f"Unable to connect to Jira: {str(exc)}"
            ),
            "status": "FAILED",
        }

    if response.status_code == 201:

        jira_response = response.json()

        jira_issue_id = jira_response.get(
            "id"
        )

        jira_issue_key = jira_response.get(
            "key"
        )

        jira_issue_url = (
            f"{jira_base_url_clean}"
            "/browse/"
            f"{jira_issue_key}"
        )

        await fetch_ticket_details(
            state,
            updated_status="ESCALATED",
            jira_details={
                "issueId": jira_issue_id,
                "issueKey": jira_issue_key,
                "issueUrl": jira_issue_url,
            },
        )

        return {
            "escalation_message": response.text,

            "status": "ESCALATED",

            "jira_issue_id": jira_issue_id,

            "jira_issue_key": jira_issue_key,

            "jira_issue_url": jira_issue_url,
        }

    else:

        await fetch_ticket_details(
            state,
            updated_status="FAILED",
            failure_reason=(
                f"Jira rejected the escalation (HTTP {response.status_code}): "
                f"{response.text}"
            ),
        )

        return {
            "escalation_message": response.text,

            "status": "FAILED",

            "jira_status_code": response.status_code,
        }
