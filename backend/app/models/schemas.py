"""
Pydantic schemas for API request/response models.
"""

from pydantic import BaseModel, Field
from enum import Enum
from typing import Optional, Union, Any


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


# =============================================================================
# Tool Parameter Models
# =============================================================================

class ScaleDeploymentParams(BaseModel):
    """Parameters for scaling a deployment."""
    namespace: str = Field(default="default", description="Kubernetes namespace")
    deployment: str = Field(..., description="Deployment name to scale")
    replicas: int = Field(..., ge=0, le=50, description="Target number of replicas")


class RestartPodParams(BaseModel):
    """Parameters for restarting a pod."""
    namespace: str = Field(default="default", description="Kubernetes namespace")
    pod: str = Field(..., description="Pod name to restart")
    graceful: bool = Field(default=True, description="Use graceful termination")


class RollbackDeploymentParams(BaseModel):
    """Parameters for rolling back a deployment."""
    namespace: str = Field(default="default", description="Kubernetes namespace")
    deployment: str = Field(..., description="Deployment name to rollback")
    revision: Optional[int] = Field(default=None, description="Target revision (None = previous)")


class DrainNodeParams(BaseModel):
    """Parameters for draining a node."""
    node: str = Field(..., description="Node name to drain")
    force: bool = Field(default=False, description="Force drain even with local data")
    ignore_daemonsets: bool = Field(default=True, description="Ignore DaemonSet pods")
    timeout: int = Field(default=300, description="Drain timeout in seconds")


class CordonNodeParams(BaseModel):
    """Parameters for cordoning/uncordoning a node."""
    node: str = Field(..., description="Node name")
    cordon: bool = Field(default=True, description="True to cordon, False to uncordon")


class DeletePodParams(BaseModel):
    """Parameters for force deleting a pod."""
    namespace: str = Field(default="default", description="Kubernetes namespace")
    pod: str = Field(..., description="Pod name to delete")
    force: bool = Field(default=False, description="Force delete without grace period")


class UpdateResourceLimitsParams(BaseModel):
    """Parameters for updating resource limits."""
    namespace: str = Field(default="default", description="Kubernetes namespace")
    deployment: str = Field(..., description="Deployment name")
    cpu_limit: Optional[str] = Field(default=None, description="CPU limit (e.g., '500m', '2')")
    memory_limit: Optional[str] = Field(default=None, description="Memory limit (e.g., '512Mi', '2Gi')")
    cpu_request: Optional[str] = Field(default=None, description="CPU request")
    memory_request: Optional[str] = Field(default=None, description="Memory request")


class NetworkPolicyParams(BaseModel):
    """Parameters for applying network policy."""
    namespace: str = Field(default="default", description="Kubernetes namespace")
    policy_name: str = Field(..., description="Network policy name")
    action: str = Field(..., description="Action: 'allow' or 'deny'")
    target_pod_selector: str = Field(..., description="Target pod label selector")


# =============================================================================
# Unified Tool Call Model
# =============================================================================

ToolParams = Union[
    ScaleDeploymentParams,
    RestartPodParams,
    RollbackDeploymentParams,
    DrainNodeParams,
    CordonNodeParams,
    DeletePodParams,
    UpdateResourceLimitsParams,
    NetworkPolicyParams
]


class IncidentToolCall(BaseModel):
    """AI-proposed remediation action."""
    tool_name: str = Field(alias="toolName")
    args: dict = Field(..., description="Tool-specific parameters")
    reason: str = Field(..., description="Explanation for the proposed action")

    class Config:
        populate_by_name = True


# =============================================================================
# API Request/Response Models
# =============================================================================

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
    parameters: dict


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


# =============================================================================
# Tool Registry (for documentation)
# =============================================================================

AVAILABLE_TOOLS = {
    "scale_deployment": {
        "description": "Scale a deployment to a specified number of replicas",
        "params": ScaleDeploymentParams,
        "use_cases": ["OOMKilled", "High CPU usage", "Traffic spike", "Load balancing"]
    },
    "restart_pod": {
        "description": "Restart a specific pod (delete and let controller recreate)",
        "params": RestartPodParams,
        "use_cases": ["Stuck pod", "Memory leak", "Unresponsive application", "Configuration refresh"]
    },
    "rollback_deployment": {
        "description": "Rollback a deployment to a previous revision",
        "params": RollbackDeploymentParams,
        "use_cases": ["Bad deployment", "Application errors after update", "Performance regression"]
    },
    "drain_node": {
        "description": "Safely drain all pods from a node for maintenance",
        "params": DrainNodeParams,
        "use_cases": ["Node maintenance", "Hardware issues", "OS updates", "Node replacement"]
    },
    "cordon_node": {
        "description": "Mark a node as unschedulable (or schedulable)",
        "params": CordonNodeParams,
        "use_cases": ["Prevent new pods", "Node issues", "Gradual drain"]
    },
    "delete_pod": {
        "description": "Force delete a stuck or terminating pod",
        "params": DeletePodParams,
        "use_cases": ["Stuck Terminating", "Zombie pod", "Force cleanup"]
    },
    "update_resource_limits": {
        "description": "Update CPU/Memory limits for a deployment",
        "params": UpdateResourceLimitsParams,
        "use_cases": ["OOMKilled", "CPU throttling", "Resource optimization"]
    },
    "apply_network_policy": {
        "description": "Apply or modify network policy for traffic control",
        "params": NetworkPolicyParams,
        "use_cases": ["Security incident", "DDoS mitigation", "Traffic isolation"]
    }
}
