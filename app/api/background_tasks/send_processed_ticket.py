import os

from agentmail import AgentMail
from dotenv import load_dotenv
from ...paths import PROJECT_ROOT

load_dotenv(PROJECT_ROOT / ".env", override=True)

client: AgentMail | None = None
INBOX_ID: str | None = os.getenv("AGENTMAIL_INBOX_ID")


def _get_client() -> AgentMail:
    global client, INBOX_ID

    if client is None:
        api_key = os.getenv("AGENTMAIL_API_KEY")
        if not api_key:
            raise RuntimeError("AGENTMAIL_API_KEY is not configured.")
        client = AgentMail(api_key=api_key)

    if not INBOX_ID:
        inbox = client.inboxes.create()
        INBOX_ID = inbox.inbox_id

    return client


async def send_resolved_email(
    recipient: str,
    subject: str,
    email_body: str,
):
    mail_client = _get_client()
    message = mail_client.inboxes.messages.send(
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
