from fastapi import Depends, HTTPException, APIRouter, status
from model.schemas.model_health import HealthResponse, MetricsResponse
from agents.nodes import roberta_node
from database.postgres.database import get_db
from sqlalchemy.orm import Session
from database.postgres import models
from services.oauth2 import get_current_admin
from sqlalchemy import func

router = APIRouter(
    prefix='/model',
    tags=["Models"]
)

@router.get("/health", response_model=HealthResponse)
def get_health():
    return {
        "status": "Healthy" if roberta_node.model is not None else "Unavailable",
        "model_loaded": roberta_node.model is not None,
        "vectorizer_loaded": roberta_node.model is not None,
        "version": "1.0.1",
    }
    
@router.get("/metrics", response_model=MetricsResponse)
def get_metrics(db: Session = Depends(get_db), current_user: models.Admin = Depends(get_current_admin)):
    
    if current_user is None or current_user.role != "Admin":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authorized to perform action")
    
    metrics = db.query(
        func.coalesce(func.count(models.Tickets.id), 0),
        func.coalesce(func.sum(models.Tickets.confidence), 0.0),
        func.coalesce(func.count(models.Tickets.latency), 0),
        func.coalesce(func.sum(models.Tickets.latency), 0.0)
    ).first()

    all_tickets_count = int(metrics[0])
    all_confidence_sum = float(metrics[1])
    count_all_latencies = int(metrics[2])
    sum_total_latencies = float(metrics[3])

    if all_tickets_count > 0:
        clean_confidence = all_confidence_sum / all_tickets_count
    else:
        clean_confidence = 0.0

    if count_all_latencies > 0:
        clean_latency = sum_total_latencies / count_all_latencies
    else:
        clean_latency = 0.0

    distribution = db.query(
        models.Tickets.department,
        func.count(models.Tickets.id)
    ).group_by(models.Tickets.department).all()

    return {
        "total_tickets": all_tickets_count,
        "avg_confidence": round(clean_confidence, 2),
        "avg_response_time_ms": round(clean_latency, 2),
        "routing_distribution": { (row[0] if row[0] is not None else "Unknown"): int(row[1]) for row in distribution },
        "model_version": "1.0.0"
    }
