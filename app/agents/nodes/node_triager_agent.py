import json
import os
import re

from huggingface_hub import InferenceClient

from model.schemas.schema import LlamaOutput
from agents.state import GraphState

client = InferenceClient(provider="novita", api_key=os.getenv("HF_TOKEN"))

def extract_json_object(response_text: str) -> str:
    """
    Extract a JSON object from the model response.

    Handles:
    - Pure JSON
    - ```json ... ```
    - Explanations before JSON
    - Explanations after JSON
    """

    response_text = response_text.strip().lstrip("\ufeff")

    response_text = re.sub(
        r"```json\s*",
        "",
        response_text,
        flags=re.IGNORECASE,
    )

    response_text = re.sub(
        r"```",
        "",
        response_text,
    )

    response_text = response_text.strip()

    # First try the entire response.
    try:
        json.loads(response_text)
        return response_text
    except json.JSONDecodeError:
        pass

    # Find the first JSON object.
    start = response_text.find("{")

    if start == -1:
        raise ValueError(
            "Llama did not return a JSON object.\n\n"
            f"Raw response:\n{response_text}"
        )

    # Find the matching closing brace instead of simply
    # using rfind("}") so nested objects are handled safely.
    depth = 0
    in_string = False
    escaped = False

    for index in range(start, len(response_text)):
        char = response_text[index]

        if char == '"' and not escaped:
            in_string = not in_string

        if not in_string:
            if char == "{":
                depth += 1
            elif char == "}":
                depth -= 1

                if depth == 0:
                    json_text = response_text[start:index + 1]

                    try:
                        json.loads(json_text)
                        return json_text
                    except json.JSONDecodeError as e:
                        raise ValueError(
                            "Llama returned malformed JSON.\n\n"
                            f"Raw response:\n{response_text}\n\n"
                            f"Extracted JSON:\n{json_text}"
                        ) from e

        escaped = (
            char == "\\"
            and not escaped
            and in_string
        )

        if char != "\\":
            escaped = False

    raise ValueError(
        "Llama returned text containing an incomplete JSON object.\n\n"
        f"Raw response:\n{response_text}"
    )


def parse_triage_output(response_text: str) -> LlamaOutput:
    """Parse and validate the model response without a second parser layer."""
    if not isinstance(response_text, str) or not response_text.strip():
        raise ValueError("Llama returned an empty response.")

    json_text = extract_json_object(response_text)
    payload = json.loads(json_text)

    if not isinstance(payload, dict):
        raise ValueError("Llama output must be a JSON object.")

    return LlamaOutput.model_validate(payload)


def build_triage_context(state: GraphState) -> str:
    base_context = (
        "You are an expert Incident Triage and Retrieval Assistant.\n"
        f"Customer Account Tier: {state.account_tier}\n"
        f"DistilBERT Classification: {state.department} "
        f"(Confidence: {(state.confidence or 0):.2%})\n"
        f"Ticket Text: {state.unified_ticket}\n"
        f"Live Production Telemetry: {state.telemetry_data}\n\n"
    )

    feedback_query = (
        state.eval_result.feedback_for_rewriter
        if state.eval_result
        else None
    )

    output_format = """
=== OUTPUT REQUIREMENTS ===

Your response MUST contain ONE JSON object.

The JSON object MUST have these four fields:

{
  "search_query": "string",
  "priority": "string",
  "tags": ["string"],
  "extracted_keywords": ["string"]
}

IMPORTANT:

- Return the JSON object directly.
- Do NOT explain your answer.
- Do NOT describe your reasoning.
- Do NOT write a numbered list.
- Do NOT write sentences before the JSON.
- Do NOT write sentences after the JSON.
- Do NOT return markdown.
- Do NOT use ```json.
- Do NOT return a JSON schema.
- Do NOT use a "properties" field.
- Do NOT add additional fields.

Your entire response must be the JSON object.

CORRECT:

{
  "search_query": "Billing Double Charge Credit Card INV-98241 Refund",
  "priority": "High",
  "tags": ["Billing", "Double Charge", "Refund", "Credit Card"],
  "extracted_keywords": ["Billing", "Double Charge", "Credit Card", "INV-98241", "Refund"]
}
""".strip()

    if feedback_query:

        if state.retrieved_docs:
            formatted_docs = "\n".join(
                (
                    f"- Document ID: {doc.document_id}\n"
                    f"  Relevance Score: {doc.document_score:.4f}\n"
                    f"  Content snippet: {doc.document_content}\n"
                )
                for doc in state.retrieved_docs
            )
        else:
            formatted_docs = (
                "(No documents retrieved in previous step)"
            )

        feedback_history = "\n".join(
            f"- Attempt feedback: {feedback}"
            for feedback in state.rag_query_feedback_list
        )

        return (
            base_context
            + """
=== MODE: QUERY REWRITE & REFINE ===

The previous retrieval attempt was insufficient to resolve the ticket.

Previous Search Query:
"""
            + f"{state.search_query}\n\n"
            + f"Evaluator Confidence Score: "
            f"{state.eval_result.confidence_score}\n"
            + f"Hallucination Detected: "
            f"{state.eval_result.has_hallucinations}\n"
            + f"Latest Evaluator Feedback:\n{feedback_query}\n\n"
            + "Historical Feedback Trail:\n"
            + f"{feedback_history}\n\n"
            + "Retrieved Documents:\n"
            + f"{formatted_docs}\n\n"
            + """
=== REWRITE INSTRUCTIONS ===

1. Analyze why the previous query failed based on
   evaluator feedback and retrieved documents.

2. Generate an improved search_query targeting:
   - exact error codes
   - technical terms
   - product names
   - APIs
   - services
   - subsystem names
   - important business terms

3. Update priority based on the refined context.

4. Generate concise and specific tags.

5. Extract important technical and business keywords.

6. Preserve useful information from the previous query
   when appropriate.

7. Do not invent technical details.

8. Your final response MUST be the JSON object only.
"""
            + "\n\n"
            + output_format
        )

    return (
        base_context
        + """
=== MODE: INITIAL TRIAGE & QUERY GENERATION ===

Priority Assignment Rules:

- Enterprise Accounts: Critical or High.
- Team Accounts: High, Medium, or Low.
- Solo / Standard Accounts: High, Medium, or Low.
- Non-Enterprise accounts CANNOT be Critical.
- Select the highest justified priority based on urgency
  and system impact.

RAG Search Query Generation Rules:

- Extract error codes.
- Extract product names.
- Extract system modules.
- Extract stack traces.
- Extract protocols.
- Extract technical entities.
- Convert colloquial user phrasing into standard
  IT troubleshooting terminology.
- Generate a high-density search query.
- Preserve important technical terms from the ticket.

Tagging Rules:

- Generate concise and specific tags.
- Prefer technical tags over generic tags.
- Avoid unnecessary tags.

Keyword Rules:

- Extract important technical and business keywords.
- Include error codes and system components.
- Do not invent unrelated keywords.

Your final response MUST be the JSON object only.
"""
        + "\n\n"
        + output_format
    )


async def node_triager(state: GraphState) -> dict:
    """
    Generates an initial search query or rewrites the
    previous query based on evaluator feedback.
    """

    is_rewrite = bool(
        state.eval_result
        and state.eval_result.feedback_for_rewriter
    )

    prompt_instruction = (
        "Refine the previous search query using evaluator "
        "feedback and retrieved document details."
        if is_rewrite
        else (
            "Perform initial ticket triage. "
            "Extract keywords, assign priority, generate tags, "
            "and create the RAG search query."
        )
    )

    model = (
        "meta-llama/Llama-3.3-70B-Instruct"
        if state.retries == 1
        else "meta-llama/Llama-3.1-8B-Instruct"
    )

    system_prompt = build_triage_context(state)

    completion = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": prompt_instruction,
            },
        ],
        max_tokens=1500,
    )

    response_text = completion.choices[0].message.content or ""

    try:
        llama_output = parse_triage_output(response_text)

    except Exception as e:

        raise ValueError(
            f"Llama output failed validation: {e}\n"
            f"Raw response: {response_text!r}"
        ) from e

    return {
        "search_query": llama_output.search_query,
        "priority": llama_output.priority,
        "tags": llama_output.tags,
        "extracted_keywords": llama_output.extracted_keywords,
        "status": "Processing",
    }
