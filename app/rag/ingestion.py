from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
import uuid
import chromadb
from langchain_community.document_loaders import PyPDFLoader
import os
from dotenv import load_dotenv
from langchain_core.documents import Document
from pathlib import Path

# LOAD ENVIRONMENT VARIABLES
load_dotenv(dotenv_path="../.env", override=True)
chromadb_api_key = os.getenv("CHROMADB_API_KEY")
os.environ["CHROMADB_API_KEY"] = chromadb_api_key
tenant_key = os.getenv("CHROMADB_TENANT")
os.environ["CHROMADB_TENANT"] = tenant_key
database_key = os.getenv("CHROMADB_DATABASE")
os.environ["CHROMADB_DATABASE"] = database_key

# LOAD DOCUMENT
CURRENT_DIR = Path(__file__).resolve().parent

# Locate enterprise_knowledge.pdf inside app/rag/
document_path = CURRENT_DIR / "enterprise_knowledge.pdf"

# Check if path exists before loading
if not os.path.exists(document_path):
    raise FileNotFoundError(f"Could not find PDF at: {document_path}")

document = PyPDFLoader(document_path)
loaded_document = document.load()


# INGESTION MANAGER
class INGESTION_MANAGER:

    documents_list = []

    def __init__(self, document):
        self.document = document
        self.store_vectors()

    def chunk_document(self) -> list:
        splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
            model_name="gpt-4o",
            chunk_size=550,
            chunk_overlap=100
        )

        splitted_documents = splitter.split_documents(self.document)

        return splitted_documents

    def embed_documents(self) -> list:
        # get chunked documents
        chunked_documents = self.chunk_document()
        
        # loop through chunk list to get metadata and content
        for chunk_number, chunk in enumerate(chunked_documents):

            record = Document(
                page_content=chunk.page_content,
                metadata={**chunk.metadata, "chunk_number": chunk_number},
            )

            self.documents_list.append(record)

        # instantiate embedding model
        embedding_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

        # loop through each record in the document list to get the record and pass them into the emebdding model
        looped_strings = [document.page_content for document in chunked_documents]

        # embedded documents
        embedded_vectors = embedding_model.encode(
            looped_strings, show_progress_bar=True
        )
        return embedded_vectors

    def store_vectors(self):
        # instiate chromadb
        client = chromadb.CloudClient(
            api_key=chromadb_api_key, tenant=tenant_key, database=database_key
        )

        collection = client.get_or_create_collection(name="ChurnDesk")
        collection.add(
            embeddings=self.embed_documents(),
            documents=[content.page_content for content in self.documents_list],
            metadatas=[content.metadata for content in self.documents_list],
            ids=[str(uuid.uuid4()) for _ in self.documents_list],
        )


ingestion = INGESTION_MANAGER(document=loaded_document)
