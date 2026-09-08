import os
from dotenv import load_dotenv
from agentmail import AgentMail
from paths import PROJECT_ROOT
from agents.graph import get_graph
from fastapi import status, HTTPException

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
    thread_id: str,
    final_response_text: str | None = None,
):
    mail_client = _get_client()
    config = {"configurable": {"thread_id": thread_id}}
   
    ticket_state = await get_graph().aget_state(config)
    state = ticket_state.values
    
    if not state:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f"No state found for thread_id {thread_id}")
    recipient = state.get("email")
    
    
    # The approval route passes the reviewed response explicitly. This avoids
    # ever reverting to the AI draft after a human has edited it.
    email_body = final_response_text or state.get("final_response_text")
    if not email_body:
        ai_draft = state.get("ai_draft")
        email_body = ai_draft.full_response_text if ai_draft else ""

    # get ticket's subject
    ticket_subject = state.get("subject", "Your Ticket Request")
    email_subject = f"Resolved: {ticket_subject}"


    message = mail_client.inboxes.messages.send(
        inbox_id=INBOX_ID,
        to=recipient,
        subject=email_subject,
        text=email_body,
    )

    return {
        "email_sent": True,
        "message_id": getattr(message, "id", None),
        "status": "RESOLVED",
        "resolved_by": "AI AGENT"
    }
