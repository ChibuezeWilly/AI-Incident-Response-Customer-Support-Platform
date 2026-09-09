import os
from datetime import datetime, timedelta, timezone

from huggingface_hub import InferenceClient
from langchain_core.output_parsers import PydanticOutputParser
from sqlalchemy import func
from sqlalchemy.orm import Session

from cache import cache_drift_alert
from database.postgres import models
from database.postgres.database import get_db
from model.schemas.schema import AllDrift, Drift, DriftAlert

client = InferenceClient(provider="featherless-ai", api_key=os.getenv("HF_TOKEN"))


def build_drift_prompt(
    all_drifts: AllDrift,
    parser: PydanticOutputParser,
) -> str:

    all_drifts_json = all_drifts.model_dump_json(indent=2)
    format_instructions = parser.get_format_instructions()

    return f"""
You are a Documentation Drift Detection Agent operating inside
an Incident Response System.

Your job is to analyze correction patterns detected from
recent support tickets and generate a concise documentation
drift alert.

DETECTED CORRECTIONS

The database has already identified correction patterns where
multiple distinct support agents independently made the same
factual correction.

The detected data is:

{all_drifts_json}

DRIFT DEFINITION

A documentation drift event occurs when multiple distinct
support agents independently make the same factual correction
across separate tickets.

Repeated independent corrections are a strong signal that
the information currently represented in the documentation
or knowledge base may be outdated or inaccurate.

Do not assume that the documentation is definitely wrong.

YOUR TASK

Analyze the supplied correction data.

Select the most significant correction pattern.

If multiple drift patterns exist, prioritize the correction
with the highest agent_count.

Identify:

- target_entity
- old_value
- new_value
- agent_count
- what happened
- potential documentation drift

Do not invent information that is not present in the
supplied runtime data.

ALERT MESSAGE

Generate a concise message following this style:

"Documentation Drift Alert: 3 agents manually changed
port from 8080 to 8443 in the last 24 hours.
This repeated correction may indicate documentation drift
and should be reviewed."

The message must communicate:

- Number of distinct agents
- Target entity
- Old value
- New value
- Potential documentation drift

Do not claim that the documentation is definitely incorrect.

IMPORTANT OUTPUT RULES

Return ONLY the structured Pydantic output.

Do not include:

- Markdown
- Code fences
- Explanations outside the structured output
- Additional fields
- Multiple objects
- Lists
- Conversational text

Follow these format instructions exactly:

{format_instructions}
"""

def drift_detection(
    db: Session,
) -> AllDrift:

    one_day_ago = datetime.now(timezone.utc) - timedelta(days=7)

    corrections = (
        db.query(
            models.TicketDiffs.target_entity,
            models.TicketDiffs.old_value,
            models.TicketDiffs.new_value,
            func.count(
                func.distinct(
                    models.TicketDiffs.agent_id
                )
            ).label("agent_count"),
        )
        .filter(
            models.TicketDiffs.created_at >= one_day_ago,
            models.TicketDiffs.target_entity.isnot(None),
            models.TicketDiffs.old_value.isnot(None),
            models.TicketDiffs.new_value.isnot(None),
        )
        .group_by(
            models.TicketDiffs.target_entity,
            models.TicketDiffs.old_value,
            models.TicketDiffs.new_value,
        )
        .having(
            func.count(
                func.distinct(
                    models.TicketDiffs.agent_id
                )
            ) >= 3
        )
        .all()
    )

    drift_list = [
        Drift(
            target_entity=row.target_entity,
            old_value=row.old_value,
            new_value=row.new_value,
            agent_count=row.agent_count,
        )
        for row in corrections
    ]

    return AllDrift(
        drift_detected=bool(drift_list),
        all_drifts=drift_list,
    )


async def node_drift_alert() -> DriftAlert | None:

    db: Session = next(get_db())

    try:
        all_drifts = drift_detection(db)

        if not all_drifts.drift_detected:
            return None

        parser = PydanticOutputParser(
            pydantic_object=DriftAlert
        )

        system_prompt = build_drift_prompt(
            all_drifts,
            parser,
        )

        completion = client.chat.completions.create(
            model="meta-llama/Llama-3.1-8B-Instruct",
            messages=[
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": (
                        "Analyze the detected correction patterns "
                        "and generate the documentation drift alert."
                    ),
                },
            ],
            max_tokens=1000,
        )

        response_text = completion.choices[0].message.content or ""

        drift_alert: DriftAlert = parser.parse(
            response_text
        )


        await cache_drift_alert(
            drift_alert.model_dump()
        )

        return drift_alert

    finally:
        db.close()
