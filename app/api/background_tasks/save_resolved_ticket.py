import os
import uuid
import chromadb
from dotenv import load_dotenv
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from fastapi import status, HTTPException
from agents.graph import get_graph
from paths import PROJECT_ROOT
from services.hf_inference import embed_texts

load_dotenv(PROJECT_ROOT / ".env", override=True)
chromadb_api_key = os.getenv("CHROMADB_API_KEY")
tenant_key = os.getenv("CHROMADB_TENANT")
database_key = os.getenv("CHROMADB_DATABASE")

class ChromaTicketSaver:

    def __init__(self, state: dict):
        self.state = state
        self.documents_list = []

    def chunk_document(self) -> list:
        was_edited = self.state.get("human_decision") == "EDIT_AND_SEND"

        ticket_details = (
            f"Ticket subject: {self.state.get('subject')}\n"
            f"Ticket info: {self.state.get('unified_ticket')}\n"
            f"Ticket resolution: {self.state.get('final_response_text')}\n"
        )

        ticket_metadata = {
            "data_type": "resolved_ticket",  # Distinct tag separating tickets from PDF RAG docs
            "ticket_id": str(self.state.get("id")),
            "user_id": str(self.state.get("user_id")),
            "department": str(self.state.get("department") or "general"),
            "tags": ", ".join(self.state.get("tags") or []),
            "edited": 1 if was_edited else 0,
        }

        splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
            model_name="gpt-4o", chunk_size=550, chunk_overlap=100
        )

        raw_chunks = splitter.create_documents(
            texts=[ticket_details], metadatas=[ticket_metadata]
        )

        return raw_chunks

    def embed_documents(self) -> list:
        chunked_documents = self.chunk_document()

        for chunk_number, chunk in enumerate(chunked_documents):
            record = Document(
                page_content=chunk.page_content,
                metadata={**chunk.metadata, "chunk_number": chunk_number},
            )
            self.documents_list.append(record)

        looped_strings = [document.page_content for document in chunked_documents]
        embedded_vectors = embed_texts(looped_strings)

        return [vector.tolist() for vector in embedded_vectors]

    def store_vectors(self):
        if not chromadb_api_key or not tenant_key or not database_key:
            raise RuntimeError(
                "ChromaDB environment variables are not configured."
            )

        client = chromadb.CloudClient(
            api_key=chromadb_api_key, tenant=tenant_key, database=database_key
        )

        collection = client.get_or_create_collection(name="resolved_tickets")

        embeddings = self.embed_documents()

        if self.documents_list:
            collection.add(
                embeddings=embeddings,
                documents=[content.page_content for content in self.documents_list],
                metadatas=[content.metadata for content in self.documents_list],
                ids=[str(uuid.uuid4()) for _ in self.documents_list],
            )


async def save_incoming_resolved_ticket(thread_id: str):
    config = {"configurable": {"thread_id": thread_id}}

    ticket_state = await get_graph().aget_state(config)
    state = ticket_state.values

    if not state:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No state found for thread_id {thread_id}",
        )

    saver_handler = ChromaTicketSaver(state)
    saver_handler.store_vectors()

    return state
