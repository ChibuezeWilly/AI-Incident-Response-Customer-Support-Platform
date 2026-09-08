import os

from huggingface_hub import InferenceClient
from langchain_core.output_parsers import PydanticOutputParser
from langgraph.types import interrupt

from ..state import AIDraftResolution, GraphState
from ...api.background_tasks.save_initial_ticket import save_human_review
from ...database.postgres.database import get_db_ctx
from ...database.postgres import models

client = InferenceClient(
    api_key=os.environ["HF_TOKEN"],
)


def build_generator_prompt(
    state: GraphState,
    parser: PydanticOutputParser,
) -> str:

    if state.retrieved_docs:
        doc_text = "\n\n".join(
            (
                f"Source ID: {doc.document_id}\n"
                f"Content: {doc.document_content}"
            )
            for doc in state.retrieved_docs
        )
    else:
        doc_text = (
            "No verified knowledge base documents were retrieved."
        )

    return (
        "You are an expert IT Customer Support Engineer.\n\n"
        f"Customer Account Tier: {state.account_tier}\n"
        f"Ticket Subject: {state.subject}\n"
        f"Ticket Issue: {state.unified_ticket}\n\n"
        "Verified Knowledge Base Context:\n"
        f"{doc_text}\n\n"
        "Your task is to draft a clear, empathetic, and highly accurate "
        "customer resolution based ONLY on the verified knowledge base "
        "context provided above.\n\n"
        "Requirements:\n"
        "- Do not invent technical facts.\n"
        "- Do not introduce troubleshooting steps that are not supported "
        "by the retrieved documentation.\n"
        "- Clearly summarize the customer's issue.\n"
        "- Explain the root cause only when supported by the documentation.\n"
        "- Provide actionable resolution steps.\n"
        "- Include a professional greeting and closing.\n"
        "- Assemble the complete customer-facing response in "
        "`full_response_text`.\n\n"
        "IMPORTANT OUTPUT RULES:\n"
        "- Return ONLY the structured output.\n"
        "- Do not include Markdown explanations outside the structured output.\n"
        "- Do not include headings such as 'AI Draft' or 'Response'.\n"
        "- Follow the Pydantic output schema exactly.\n\n"
        f"{parser.get_format_instructions()}"
    )


def serialize_retrieved_docs(
    state: GraphState,
) -> list[dict]:

    return [
        {
            "document_id": doc.document_id,
            "document_score": doc.document_score,
            "document_content": doc.document_content,
        }
        for doc in (
            state.retrieved_docs or []
        )
    ]


async def node_human_review_generator(
    state: GraphState,
) -> dict:


    if state.ai_draft is None:

        parser = PydanticOutputParser(
            pydantic_object=AIDraftResolution
        )

        system_prompt = build_generator_prompt(
            state,
            parser,
        )

        completion = client.chat.completions.create(
            model="meta-llama/Llama-3.1-8B-Instruct:novita",
            messages=[
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": (
                        "Generate the customer resolution using "
                        "the required structured output."
                    ),
                },
            ],
            max_tokens=2000,
        )

        response_text = (
            completion.choices[0].message.content
            or ""
        )

        try:

            ai_draft = parser.parse(
                response_text
            )

        except Exception as exc:

            raise ValueError(
                "Llama generator output could not be parsed "
                "into AIDraftResolution."
            ) from exc

    else:

        ai_draft = state.ai_draft

        if isinstance(
            ai_draft,
            dict,
        ):

            ai_draft = (
                AIDraftResolution.model_validate(
                    ai_draft
                )
            )

    if state.eval_result:

        eval_confidence = (
            state.eval_result.confidence_score
        )

        has_hallucinations = (
            state.eval_result.has_hallucinations
        )

        grounding_source_ids = (
            state.eval_result.grounding_source_ids
            or []
        )

        eval_feedback = (
            state.eval_result.feedback_for_rewriter
        )

    else:

        eval_confidence = (
            state.confidence
            if state.confidence is not None
            else 1.0
        )

        has_hallucinations = False
        grounding_source_ids = []
        eval_feedback = None


    retrieved_docs = serialize_retrieved_docs(
        state
    )

    thread_id = (
        getattr(
            state,
            "thread_id",
            None,
        )
        or f"ticket_thread_{state.id}"
    )

    frontend_payload = {
        "question": (
            "Do you approve sending this resolution "
            "response to the customer?"
        ),

        "thread_id": thread_id,

        "ticket_info": {
            "ticket_id": state.id,
            "user_id": state.user_id,
            "email": state.email,
            "account_tier": state.account_tier,
            "priority": state.priority,
            "department": state.department,
            "subject": state.subject,
            "original_body": state.body,
            "unified_ticket": state.unified_ticket,
            "telemetry_data": state.telemetry_data,
            "confidence": state.confidence,
            "retries": state.retries,
            "search_query": state.search_query,
            "tags": state.tags or [],
            "extracted_keywords": (
                state.extracted_keywords or []
            ),
            "status": "AWAITING HUMAN REVIEW",
        },

        "rag_audit_trail": {
            "confidence_score": eval_confidence,
            "has_hallucinations": (
                has_hallucinations
            ),
            "grounding_source_ids": (
                grounding_source_ids
            ),
            "feedback_for_rewriter": (
                eval_feedback
            ),
            "retrieved_docs": retrieved_docs,
        },

        "ai_draft": (
            ai_draft.model_dump(
                mode="json"
            )
        ),

        "allowed_decisions": [
            "APPROVE",
            "EDIT_AND_SEND",
            "REJECT_AND_ESCALATE",
        ],
    }

    save_human_review(
        frontend_payload
    )


    human_response = interrupt(
        frontend_payload
    )

    if not isinstance(
        human_response,
        dict,
    ):

        raise ValueError(
            "Human review response must be a dictionary."
        )

    decision = human_response.get(
        "decision"
    )

    edited_text = human_response.get(
        "edited_text"
    )

    allowed_decisions = {
        "APPROVE",
        "EDIT_AND_SEND",
        "REJECT_AND_ESCALATE",
    }

    if decision not in allowed_decisions:

        raise ValueError(
            f"Invalid human decision: {decision}"
        )

    if (
        decision == "EDIT_AND_SEND"
        and not edited_text
    ):

        raise ValueError(
            "edited_text is required for EDIT_AND_SEND."
        )
    if decision == "EDIT_AND_SEND":

        final_response_text = (
            edited_text.strip()
        )

    else:

        final_response_text = (
            ai_draft.full_response_text
        )
    with get_db_ctx() as db:

        ticket = (
            db.query(models.Tickets)
            .filter(
                models.Tickets.id == state.id
            )
            .first()
        )

        if ticket is None:

            raise ValueError(
                f"Ticket #{state.id} not found."
            )

        ticket.human_decision = (
            decision
        )

        ticket.human_edited_text = (
            edited_text
            if decision == "EDIT_AND_SEND"
            else None
        )

        ticket.final_response_text = (
            final_response_text
        )

        ticket.status = (
            "ESCALATED"
            if decision == "REJECT_AND_ESCALATE"
            else "RESOLVED"
        )

        db.commit()

    return {
        "ai_draft": ai_draft,
        "human_decision": decision,
        "final_response_text": final_response_text,
        "status": (
            "ESCALATED"
            if decision == "REJECT_AND_ESCALATE"
            else "RESOLVED"
        ),
    }