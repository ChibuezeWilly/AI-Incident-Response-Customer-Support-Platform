from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Any

class MetricsResponse(BaseModel):
    total_tickets: int = Field(
        ..., 
        description="The grand total count of structural tickets processed across the historical system timeline."
    )
    avg_confidence: float = Field(
        ..., 
        description="The rolling arithmetic average confidence score (0.0 to 1.0) returned by the classifier model."
    )
    avg_response_time_ms: float = Field(
        ..., 
        description="The tracking latency marker identifying the average execution speed of the RAG pipeline in milliseconds."
    )
    model_version: str = Field(
        ..., 
        description="The semantic version identifier tag of the active operational routing model."
    )
    routing_distribution: dict[str, int] = Field(
        ..., 
        description="A key-value map logging the frequency of traffic distributed to individual graph channels or departments."
    )


class HealthResponse(BaseModel):
    status: str = Field(
        ..., 
        description="The global heart-beat operational state of the web application service (e.g., 'healthy', 'degraded')."
    )
    model_loaded: bool = Field(
        ..., 
        description="Flag confirming if the main LLM pipeline or localized classification engine is completely loaded in memory."
    )
    vectorizer_loaded: bool = Field(
        ..., 
        description="Flag confirming if the system embedding or vectorization pipeline is operational."
    )
    version: str = Field(
        ..., 
        description="The core internal deployment release version string of the software backend."
    )

class DepartmentResponse(BaseModel):
    departments: list[str] = Field(
        ..., 
        description="The explicit flat array listing all valid operational organization department string categories."
    )
