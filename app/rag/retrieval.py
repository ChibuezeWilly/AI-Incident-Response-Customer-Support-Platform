import numpy as np
import chromadb
from rank_bm25 import BM25Okapi
import os
from dotenv import load_dotenv
from paths import PROJECT_ROOT

load_dotenv(PROJECT_ROOT / ".env", override=True)
chromadb_api_key = os.getenv("CHROMADB_API_KEY")
tenant_key = os.getenv("CHROMADB_TENANT")
database_key = os.getenv("CHROMADB_DATABASE")


class ExistingChromaHybridRetriever:
    def __init__(
        self,
        chroma_collection,
        reranker_model_name="cross-encoder/ms-marco-MiniLM-L6-v2",
        
    ):
        """
        Connects to an existing ChromaDB collection and sets up BM25 + Reranker.
        """
        self.collection = chroma_collection

        # 1. Fetch all existing text documents from ChromaDB to build BM25
       
        chroma_data = self.collection.get(include=["documents"])

        self.doc_ids = chroma_data["ids"]
        self.doc_texts = chroma_data["documents"]

        # Build an easy lookup map for doc_id -> doc_text
        self.id_to_text = dict(zip(self.doc_ids, self.doc_texts))

        # 2. Build Sparse BM25 Index on existing texts
        tokenized_corpus = [doc.lower().split() for doc in self.doc_texts]
        self.bm25 = BM25Okapi(tokenized_corpus)

        # 3. Load Cross-Encoder Reranker
        from sentence_transformers import CrossEncoder

        self.reranker = CrossEncoder(reranker_model_name)
       

    def sparse_search(self, query: str, top_k: int = 10):
        tokenized_query = query.lower().split()
        scores = self.bm25.get_scores(tokenized_query)
        top_indices = np.argsort(scores)[::-1][:top_k]
        return [self.doc_ids[idx] for idx in top_indices if scores[idx] > 0]

    def dense_search(self, query: str, top_k: int = 10):
        # Uses your existing embeddings stored inside ChromaDB
        results = self.collection.query(query_texts=[query], n_results=top_k)
        return results["ids"][0] if results["ids"] else []

    def reciprocal_rank_fusion(
        self, dense_ranks: list[str], sparse_ranks: list[str], k: int = 60
    ):
        rrf_scores = {}
        for rank, doc_id in enumerate(dense_ranks):
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + (1.0 / (k + rank + 1))
        for rank, doc_id in enumerate(sparse_ranks):
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + (1.0 / (k + rank + 1))

        return sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)

    def retrieve(self, query: str, final_top_n: int = 3):
        #Get candidates from both searches
        dense_ids = self.dense_search(query, top_k=10)
        sparse_ids = self.sparse_search(query, top_k=10)

        # RRF Merge
        rrf_results = self.reciprocal_rank_fusion(dense_ids, sparse_ids)
        candidate_ids = [doc_id for doc_id, score in rrf_results]

        if not candidate_ids:
            return []

        #Cross-Encoder Rerank
        pairs = [[query, self.id_to_text[doc_id]] for doc_id in candidate_ids]
        rerank_scores = self.reranker.predict(pairs)

        scored_docs = [
            {"id": doc_id, "text": self.id_to_text[doc_id], "score": float(score)}
            for doc_id, score in zip(candidate_ids, rerank_scores)
        ]

        scored_docs.sort(key=lambda x: x["score"], reverse=True)
        return scored_docs[:final_top_n]

_retriever: ExistingChromaHybridRetriever | None = None


def get_retriever() -> ExistingChromaHybridRetriever:
    global _retriever

    if _retriever is not None:
        return _retriever

    if not chromadb_api_key or not tenant_key or not database_key:
        raise RuntimeError(
            "ChromaDB environment variables are not configured."
        )

    client = chromadb.CloudClient(
        api_key=chromadb_api_key,
        tenant=tenant_key,
        database=database_key,
    )
    my_collection = client.get_collection(name="ChurnDesk")
    _retriever = ExistingChromaHybridRetriever(chroma_collection=my_collection)
    return _retriever
