import os
from dotenv import load_dotenv
from agentmail import AgentMail
from ...agents.graph import get_graph
from fastapi import status, HTTPException

load_dotenv(dotenv_path="../.env", override=True)
api_key = os.getenv("AGENTMAIL_API_KEY")

# Initialize client
client = AgentMail(api_key=api_key)

# create an INBOX ID
INBOX_ID = os.getenv("AGENTMAIL_INBOX_ID")
if not INBOX_ID:
    inbox = client.inboxes.create()
    INBOX_ID = inbox.inbox_id


async def send_resolved_email(
    thread_id: str,
    final_response_text: str | None = None,
):
    
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


    message = client.inboxes.messages.send(
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
