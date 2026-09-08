import random
import time
from typing import Any

class MockPrometheusGrafanaService:
    """
    Simulates a Prometheus metrics store and Grafana alert manager.
    Produces realistic operational telemetry for active context enrichment.
    """
    
    def __init__(self, default_region: str = "EU-West-1"):
        self.default_region = default_region
        
        self.force_outage_mode: bool = False
        
    async def query_cluster_metrics(self, region: list[str] | None = None) -> dict[str, Any]:
        """
        Simulates a PromQL query (e.g. rate(http_requests_total[5m])) 
        checking cluster health and active alert firing state.
        """
        target_region = region or self.default_region
        timestamp_utc = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
        
        # Scenario A: Simulated Outage / Degradation
        if self.force_outage_mode or random.random() < 0.15:  
            return {
                "status": "FIRING",  # Alert State
                "provider": "Prometheus/Grafana (Mock)",
                "region": target_region,
                "timestamp": timestamp_utc,
                "metrics": {
                    "cpu_utilization": "94.2%",
                    "p99_latency_ms": random.randint(3500, 8000),
                    "packet_loss": f"{round(random.uniform(8.0, 18.0), 1)}%",
                    "error_rate_5xx": "12.4%"
                },
                "active_incident": {
                    "incident_id": "INC-8921",
                    "severity": "P1-Critical",
                    "title": f"Elevated HTTP 504 Gateway Timeouts in {target_region}",
                    "affected_subsystem": "Auth & Session Service"
                }
            }
            
        # Scenario B: Systems Nominal / Healthy
        return {
            "status": "OK",
            "provider": "Prometheus/Grafana (Mock)",
            "region": target_region,
            "timestamp": timestamp_utc,
            "metrics": {
                "cpu_utilization": f"{round(random.uniform(15.0, 45.0), 1)}%",
                "p99_latency_ms": random.randint(25, 85),
                "packet_loss": "0.0%",
                "error_rate_5xx": "0.01%"
            },
            "active_incident": None
        }


telemetry_client = MockPrometheusGrafanaService()