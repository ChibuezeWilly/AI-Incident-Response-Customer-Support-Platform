from agents.state import GraphState, RagState
from rag.retrieval import get_retriever

def perform_rag(state: GraphState) -> dict:
    # 1. Fetch query directly from state
    llama_query = state.search_query
    
    # 2. Query retriever
    results = get_retriever().retrieve(query=llama_query, final_top_n=4)
    
    documents_list = [
        RagState(
            document_id=doc["id"],
            document_score=doc["score"],
            document_content=doc["text"]
        ) 
        for doc in results
    ]
    
    return {"retrieved_docs": documents_list}
