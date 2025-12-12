"""
Pydantic schemas for API request/response models.
"""

from pydantic import BaseModel, Field
from enum import Enum
from typing import Optional


class LogLevel(str, Enum):
    """Log severity levels."""
    INFO = "INFO"
    WARN = "WARN"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class LogEntry(BaseModel):
    """A single log entry from Kubernetes."""
    id: str
    timestamp: str
    level: LogLevel
    pod: str
    message: str


class DeploymentAction(BaseModel):
    """Parameters for scaling a deployment."""
    namespace: str = Field(..., description="Kubernetes namespace")
    deployment: str = Field(..., description="Deployment name to scale")
    replicas: int = Field(..., ge=0, description="Target number of replicas")


class IncidentToolCall(BaseModel):
    """AI-proposed remediation action."""
    tool_name: str = Field(alias="toolName")
    args: DeploymentAction
    reason: str

    class Config:
        populate_by_name = True


class AnalyzeRequest(BaseModel):
    """Request body for log analysis endpoint."""
    logs: list[LogEntry] = Field(..., min_length=1, description="Recent logs to analyze")


class AnalyzeResponse(BaseModel):
    """Response from log analysis endpoint."""
    success: bool
    proposal: Optional[IncidentToolCall] = None
    error: Optional[str] = None


class ExecuteActionRequest(BaseModel):
    """Request to execute a remediation action."""
    tool_name: str
    parameters: DeploymentAction


class ExecuteActionResponse(BaseModel):
    """Response from action execution."""
    status: str
    message: str
    details: Optional[dict] = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    ollama_connected: bool
    model: str
