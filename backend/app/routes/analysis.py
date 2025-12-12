"""
API routes for log analysis and action execution.
"""

import asyncio
from datetime import datetime
from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    ExecuteActionRequest,
    ExecuteActionResponse,
    HealthResponse,
    IncidentToolCall,
    DeploymentAction
)
from app.services.ollama_service import analyze_logs_with_ollama, check_ollama_connection
from app.config import get_settings


router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Check API and Ollama connection health."""
    settings = get_settings()
    ollama_ok = await check_ollama_connection()

    return HealthResponse(
        status="healthy" if ollama_ok else "degraded",
        ollama_connected=ollama_ok,
        model=settings.ollama_model
    )


@router.post("/analyze", response_model=AnalyzeResponse, tags=["Analysis"])
async def analyze_logs(request: AnalyzeRequest):
    """
    Analyze logs and propose remediation action using Ollama LLM.

    This endpoint sends recent logs to the local LLM for analysis and
    returns a proposed action if intervention is needed.
    """
    try:
        proposal = await analyze_logs_with_ollama(request.logs)

        if proposal:
            return AnalyzeResponse(
                success=True,
                proposal=proposal
            )
        else:
            # Return fallback response for demo purposes
            # Extract pod name from error log if available
            error_logs = [log for log in request.logs if log.level in ["ERROR", "CRITICAL"]]
            pod_name = error_logs[0].pod if error_logs else "payment-service-7d9cf"
            deployment = pod_name.rsplit("-", 1)[0] if "-" in pod_name else pod_name

            fallback = IncidentToolCall(
                toolName="scale_deployment",
                args=DeploymentAction(
                    namespace="prod",
                    deployment=deployment,
                    replicas=5
                ),
                reason="Critical error detected. LLM analysis unavailable - using fallback recommendation to scale deployment for load distribution."
            )

            return AnalyzeResponse(
                success=True,
                proposal=fallback,
                error="LLM analysis unavailable, using fallback"
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/execute", response_model=ExecuteActionResponse, tags=["Actions"])
async def execute_action(request: ExecuteActionRequest):
    """
    Execute a remediation action (simulated).

    This endpoint simulates executing a Kubernetes action like scaling a deployment.
    In a real implementation, this would call the Kubernetes API.
    """
    if request.tool_name != "scale_deployment":
        raise HTTPException(status_code=400, detail=f"Unknown tool: {request.tool_name}")

    # Simulate execution delay
    await asyncio.sleep(2.0)

    return ExecuteActionResponse(
        status="success",
        message=f"Successfully scaled deployment '{request.parameters.deployment}' in namespace '{request.parameters.namespace}' to {request.parameters.replicas} replicas",
        details={
            "namespace": request.parameters.namespace,
            "deployment": request.parameters.deployment,
            "replicas": request.parameters.replicas,
            "timestamp": datetime.now().isoformat()
        }
    )
