import os

from agentmail import AgentMail
from dotenv import load_dotenv

load_dotenv(
    dotenv_path="../.env",
    override=True,
)

api_key = os.getenv(
    "AGENTMAIL_API_KEY"
)

client = AgentMail(
    api_key=api_key,
)

INBOX_ID = os.getenv(
    "AGENTMAIL_INBOX_ID"
)

if not INBOX_ID:
    inbox = client.inboxes.create()
    INBOX_ID = inbox.inbox_id


async def send_resolved_email(
    recipient: str,
    subject: str,
    email_body: str,
):
    message = client.inboxes.messages.send(
        inbox_id=INBOX_ID,
        to=recipient,
        subject=subject,
        text=email_body,
    )

    return {
        "email_sent": True,
        "message_id": getattr(
            message,
            "id",
            None,
        ),
    }