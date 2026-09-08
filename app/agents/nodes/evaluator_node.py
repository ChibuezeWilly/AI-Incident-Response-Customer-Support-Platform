import json
import os

from huggingface_hub import InferenceClient
from langchain_core.output_parsers import PydanticOutputParser

from ..state import EvaluationResult, GraphState


client = InferenceClient(
    api_key=os.environ["HF_TOKEN"],
)

parser = PydanticOutputParser(
    pydantic_object=EvaluationResult
)

def build_context(state: GraphState) -> str:
    retrieved_documents = []

    for doc in state.retrieved_docs:
        retrieved_documents.append(
            {
                "document_id": doc.document_id,
                "document_score": doc.document_score,
                "document_content": doc.document_content,
            }
        )

    return (
        "\n\nCONTEXT FOR EVALUATION\n"
        f"Original Ticket:\n{state.unified_ticket or ''}\n\n"
        f"Search Query:\n{state.search_query or ''}\n\n"
        f"Retrieved Documents:\n"
        f"{json.dumps(retrieved_documents, indent=2, ensure_ascii=False)}\n"
    )


def evaluate_retrieved_docs(state: GraphState) -> dict:
    format_instructions = parser.get_format_instructions()

    system_prompt = (
        "You are a strict technical evaluator for an incident response system.\n\n"

        "Analyze the customer support ticket, generated search query, "
        "and retrieved documentation.\n\n"

        "Determine:\n"
        "1. Whether the retrieved documents provide sufficient and exact "
        "information to resolve the ticket.\n"
        "2. Whether the retrieved documents contain unsupported or hallucinated claims.\n"
        "3. Whether the available documentation sufficiently grounds a future answer.\n"
        "4. Assign a confidence score from 0.0 to 1.0.\n"
        "5. If confidence_score is below 0.7, provide actionable instructions "
        "for improving the search query.\n\n"

        "IMPORTANT:\n"
        "Your response MUST follow the Pydantic output format provided below.\n"
        "Do not add explanations before or after the structured response.\n\n"

        f"{format_instructions}\n"
    )

    system_prompt += build_context(state)

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
                    "Evaluate the retrieved documents against the ticket "
                    "and return the structured evaluation."
                ),
            },
        ],
        max_tokens=1000,
    )

    response_text = completion.choices[0].message.content or ""

    if not response_text.strip():
        raise ValueError(
            "Evaluator returned an empty response."
        )

    try:
        eval_result: EvaluationResult = parser.parse(
            response_text
        )
    except Exception as exc:
        raise ValueError(
            "Evaluator output could not be parsed into EvaluationResult.\n\n"
            f"Raw response:\n{response_text}\n\n"
            f"Parser error:\n{exc}"
        ) from exc

    current_retries = (state.retries or 0) + 1

    feedback_list = list(
        state.rag_query_feedback_list or []
    )

    if eval_result.feedback_for_rewriter:
        feedback_list.append(
            eval_result.feedback_for_rewriter
        )

    return {
        "eval_result": eval_result,
        "rag_query_feedback": eval_result.feedback_for_rewriter,
        "rag_query_feedback_list": feedback_list,
        "retries": current_retries,
    }


def conditional_routing(state: GraphState) -> str:
    if state.eval_result is None:
        return "rewrite"

    confidence_score = state.eval_result.confidence_score
    attempts = state.retries or 0

    if confidence_score >= 0.7:
        return "pass"

    if attempts >= 3:
        return "escalation"

    return "rewrite"