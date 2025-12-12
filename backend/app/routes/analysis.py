"""
API routes for log analysis and action execution.
"""

import json
import asyncio
from datetime import datetime
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.models.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    ExecuteActionRequest,
    ExecuteActionResponse,
    HealthResponse,
    IncidentToolCall,
    AVAILABLE_TOOLS
)
from app.services.ollama_service import (
    analyze_logs_with_ollama,
    analyze_logs_streaming,
    check_ollama_connection
)
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


@router.get("/tools", tags=["Tools"])
async def list_tools():
    """List all available remediation tools."""
    tools = []
    for name, info in AVAILABLE_TOOLS.items():
        tools.append({
            "name": name,
            "description": info["description"],
            "use_cases": info["use_cases"],
            "parameters": info["params"].model_json_schema()
        })
    return {"tools": tools}


@router.post("/analyze", response_model=AnalyzeResponse, tags=["Analysis"])
async def analyze_logs(request: AnalyzeRequest):
    """
    Analyze logs and propose remediation action using Ollama LLM (non-streaming).
    """
    try:
        proposal = await analyze_logs_with_ollama(request.logs)

        if proposal:
            return AnalyzeResponse(success=True, proposal=proposal)
        else:
            return AnalyzeResponse(
                success=False,
                error="LLM analysis returned no proposal"
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/stream", tags=["Analysis"])
async def analyze_logs_stream(request: AnalyzeRequest):
    """
    Analyze logs with streaming response (Server-Sent Events).
    """
    async def event_generator():
        try:
            async for chunk in analyze_logs_streaming(request.logs):
                event_type = chunk.get("type", "content")
                data = json.dumps(chunk)
                yield f"event: {event_type}\ndata: {data}\n\n"
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/execute", response_model=ExecuteActionResponse, tags=["Actions"])
async def execute_action(request: ExecuteActionRequest):
    """
    Execute a remediation action (simulated).
    """
    tool_name = request.tool_name
    params = request.parameters

    if tool_name not in AVAILABLE_TOOLS:
        raise HTTPException(status_code=400, detail=f"Unknown tool: {tool_name}")

    # Simulate execution delay
    await asyncio.sleep(2.0)

    # Generate response based on tool type
    if tool_name == "scale_deployment":
        message = f"Scaled deployment '{params.get('deployment')}' to {params.get('replicas')} replicas in namespace '{params.get('namespace', 'default')}'"

    elif tool_name == "restart_pod":
        graceful = "gracefully" if params.get('graceful', True) else "forcefully"
        message = f"Restarted pod '{params.get('pod')}' {graceful} in namespace '{params.get('namespace', 'default')}'"

    elif tool_name == "rollback_deployment":
        revision = params.get('revision', 'previous')
        message = f"Rolled back deployment '{params.get('deployment')}' to revision {revision} in namespace '{params.get('namespace', 'default')}'"

    elif tool_name == "drain_node":
        message = f"Drained node '{params.get('node')}' - all pods evicted successfully"

    elif tool_name == "cordon_node":
        action = "cordoned" if params.get('cordon', True) else "uncordoned"
        message = f"Node '{params.get('node')}' has been {action}"

    elif tool_name == "delete_pod":
        force = "force " if params.get('force', False) else ""
        message = f"Pod '{params.get('pod')}' {force}deleted from namespace '{params.get('namespace', 'default')}'"

    elif tool_name == "update_resource_limits":
        limits = []
        if params.get('cpu_limit'):
            limits.append(f"CPU limit: {params['cpu_limit']}")
        if params.get('memory_limit'):
            limits.append(f"Memory limit: {params['memory_limit']}")
        message = f"Updated resource limits for '{params.get('deployment')}': {', '.join(limits) if limits else 'no changes'}"

    elif tool_name == "apply_network_policy":
        message = f"Applied network policy '{params.get('policy_name')}' ({params.get('action')}) to pods matching '{params.get('target_pod_selector')}'"

    else:
        message = f"Executed {tool_name} with parameters: {params}"

    return ExecuteActionResponse(
        status="success",
        message=message,
        details={
            "tool": tool_name,
            "parameters": params,
            "timestamp": datetime.now().isoformat()
        }
    )
