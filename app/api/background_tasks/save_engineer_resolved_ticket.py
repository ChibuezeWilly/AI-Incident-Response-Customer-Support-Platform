import os
import uuid
import chromadb
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

CHROMADB_API_KEY = os.getenv("CHROMADB_API_KEY")
CHROMADB_TENANT = os.getenv("CHROMADB_TENANT")
CHROMADB_DATABASE = os.getenv("CHROMADB_DATABASE")

if not CHROMADB_API_KEY:
    raise ValueError("CHROMADB_API_KEY is not set")

if not CHROMADB_TENANT:
    raise ValueError("CHROMADB_TENANT is not set")

if not CHROMADB_DATABASE:
    raise ValueError("CHROMADB_DATABASE is not set")


embedding_model = SentenceTransformer(
    "sentence-transformers/all-MiniLM-L6-v2"
)

class EmbedResolvedTicket:

    def __init__(self, ticket, solution: str):
        self.ticket = ticket
        self.solution = solution

        self.store_vectors()

    def chunk_document(self):

        ticket_details = (
            f"Ticket subject: {self.ticket.subject}\n"
            f"Ticket info: {self.ticket.unified_ticket}\n"
            f"Ticket resolution: {self.solution}\n"
        )

        ticket_metadata = {
            "ticket_id": str(self.ticket.id),
            "department": self.ticket.department,
            "tags": ", ".join(self.ticket.tags or []),
        }

        splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
            model_name="gpt-4o",
            chunk_size=600,
            chunk_overlap=100,
        )

        documents = splitter.create_documents(
            texts=[ticket_details],
            metadatas=[ticket_metadata],
        )

        return documents

    def embed_document(self):

        documents = self.chunk_document()

        texts = [
            document.page_content
            for document in documents
        ]

        embeddings = embedding_model.encode(
            texts,
            show_progress_bar=True,
        )

        return documents, embeddings

    def store_vectors(self):

        documents, embeddings = self.embed_document()

        client = chromadb.CloudClient(
            api_key=CHROMADB_API_KEY,
            tenant=CHROMADB_TENANT,
            database=CHROMADB_DATABASE,
        )

        collection = client.get_or_create_collection(
            name="resolved_ticket_history"
        )

        collection.add(
            embeddings=embeddings.tolist(),
            documents=[
                document.page_content
                for document in documents
            ],
            metadatas=[
                document.metadata
                for document in documents
            ],
            ids=[
                str(uuid.uuid4())
                for _ in documents
            ],
        )

        return collection


def save_engineer_resolved_ticket(ticket, solution: str):
    """Embed an engineer-provided ticket resolution after it is persisted."""
    EmbedResolvedTicket(ticket, solution)
