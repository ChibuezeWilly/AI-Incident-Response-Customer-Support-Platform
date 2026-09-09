import os

from fastapi import HTTPException, status
from huggingface_hub import InferenceClient
from langchain_core.output_parsers import PydanticOutputParser
from sqlalchemy.orm import Session

from agents.graph import get_graph
from agents.state import GraphState
from database.postgres import models
from database.postgres.database import get_db
from model.schemas.schema import SemanticDiff


client = InferenceClient(provider="featherless-ai", api_key=os.getenv("HF_TOKEN"))

parser = PydanticOutputParser(pydantic_object=SemanticDiff)


def build_semantic_diff_prompt(state: GraphState) -> str:
    draft_a = (
        state.ai_draft.full_response_text
        if hasattr(state.ai_draft, "full_response_text")
        else str(state.ai_draft)
    )

    return f"""
You are an expert semantic-diff auditor working within an Incident Response System.

Your task is to strictly compare "Draft A" (the original version)
with "Final Text B" (the human-modified version) and determine
whether the human made a factual/semantic change or only changed
the presentation of the text.

### Core Objective

Determine whether the human modification changed the underlying
meaning, technical facts, operational instructions, or incident information.

### Evaluation Rules

1. Compare Draft A and Final Text B carefully at the semantic level.
2. Identify every meaningful difference before making the final decision.
3. Distinguish changes in meaning from changes in wording.
4. Treat changes to factual information, values, conclusions, instructions,
   actions, system behavior, incident details, or operational meaning
   as FACTUAL.
5. Treat equivalent wording, grammar corrections, rephrasing,
   improved clarity, politeness, sentence restructuring, and formatting
   as TONE_ONLY.
6. Preserve the relevant old and new information exactly as it appears
   in Draft A and Final Text B.
7. Do not invent information.

### Output Requirements

{parser.get_format_instructions()}

### Execution Input

Draft A:

{draft_a}

Final Text B:

{state.final_response_text}
""".strip()


async def node_semantic_diff(thread_id: str) -> dict:
    config = {
        "configurable": {
            "thread_id": thread_id,
        }
    }

    ticket_state = await get_graph().aget_state(config)
    state = ticket_state.values

    if not state:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No state found for thread_id {thread_id}",
        )

    if state.get("human_decision") != "EDIT_AND_SEND":
        return {"semantic_diff": None}

    graph_state = GraphState(**state)

    completion = client.chat.completions.create(
        model="meta-llama/Llama-3.1-8B-Instruct",
        messages=[
            {
                "role": "system",
                "content": build_semantic_diff_prompt(graph_state),
            },
            {
                "role": "user",
                "content": (
                    "Analyze the semantic differences between "
                    "Draft A and Final Text B."
                ),
            },
        ],
    )

    response_text = completion.choices[0].message.content

    try:
        semantic_diff = parser.parse(response_text)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse semantic diff: {e}",
        )

    db: Session = next(get_db())

    try:
        data = models.TicketDiffs(
            **semantic_diff.model_dump(),
            ticket_id=state.get("id"),
            agent_id=state.get("user_id"),
        )

        db.add(data)
        db.commit()
        db.refresh(data)

        return {
            "semantic_diff": semantic_diff,
        }

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "An unexpected database error occurred "
                "while creating semantic difference"
            ),
        )

    finally:
        db.close()
