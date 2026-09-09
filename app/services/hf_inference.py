import os
from typing import Any

import numpy as np
from huggingface_hub import InferenceClient


EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
HF_REQUEST_TIMEOUT_SECONDS = float(os.getenv("HF_REQUEST_TIMEOUT_SECONDS", "30"))


def get_hf_client() -> InferenceClient:
    return InferenceClient(
        provider="hf-inference",
        api_key=os.environ["HF_TOKEN"],
        timeout=HF_REQUEST_TIMEOUT_SECONDS,
    )


def embed_texts(texts: list[str], model: str = EMBEDDING_MODEL) -> np.ndarray:
    """Create embeddings remotely and return a 2-D float array."""
    if not texts:
        return np.empty((0, 0), dtype=float)

    embeddings: Any = get_hf_client().feature_extraction(
        texts,
        model=model,
    )
    result = np.asarray(embeddings, dtype=float)
    return result[np.newaxis, :] if result.ndim == 1 else result
