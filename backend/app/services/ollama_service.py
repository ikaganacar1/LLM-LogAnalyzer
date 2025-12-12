"""
Ollama LLM service for log analysis.
"""

import json
import httpx
from typing import Optional

from app.config import get_settings
from app.models.schemas import LogEntry, IncidentToolCall, DeploymentAction


SYSTEM_PROMPT = """You are a Kubernetes Site Reliability Engineer (SRE) assistant.
Your job is to analyze Kubernetes logs and propose remediation actions.

When you identify a critical issue that requires intervention, respond ONLY with a JSON object in this exact format:
{"toolName": "scale_deployment", "args": {"namespace": "...", "deployment": "...", "replicas": N}, "reason": "Your analysis of the root cause and why the action is needed"}

Rules:
- Only respond with valid JSON, no markdown, no extra text
- The namespace should be "prod" or "default" based on context
- The deployment name should match the pod name prefix (e.g., "payment-service" from "payment-service-7d9cf")
- Replicas should be a reasonable number (3-5 typically)
- The reason should explain the root cause based on log analysis

Do not include any other text or explanation outside the JSON object."""


def format_logs_for_analysis(logs: list[LogEntry]) -> str:
    """Format log entries for LLM analysis."""
    formatted = []
    for log in logs:
        formatted.append(f"[{log.timestamp}] [{log.level}] [{log.pod}] {log.message}")
    return "\n".join(formatted)


async def check_ollama_connection() -> bool:
    """Check if Ollama is reachable."""
    settings = get_settings()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{settings.ollama_host}/api/tags")
            return response.status_code == 200
    except Exception:
        return False


async def analyze_logs_with_ollama(logs: list[LogEntry]) -> Optional[IncidentToolCall]:
    """
    Analyze logs using Ollama LLM and propose remediation action.

    Args:
        logs: List of recent log entries to analyze

    Returns:
        IncidentToolCall if action is needed, None otherwise
    """
    settings = get_settings()

    log_context = format_logs_for_analysis(logs)

    user_prompt = f"""Analyze the following recent Kubernetes log entries. A critical incident has been detected.

Recent Logs:
{log_context}

Based on the logs, identify the root cause and propose a remediation action using the scale_deployment tool.
Respond with ONLY the JSON object."""

    try:
        async with httpx.AsyncClient(timeout=settings.ollama_timeout) as client:
            response = await client.post(
                f"{settings.ollama_host}/api/chat",
                json={
                    "model": settings.ollama_model,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt}
                    ],
                    "stream": False,
                    "options": {
                        "temperature": 0.2,
                        "num_predict": 500
                    }
                }
            )

            if response.status_code != 200:
                print(f"Ollama API error: {response.status_code} - {response.text}")
                return None

            result = response.json()
            content = result.get("message", {}).get("content", "").strip()

            # Parse JSON response
            # Handle potential markdown code blocks
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()

            proposal_data = json.loads(content)

            return IncidentToolCall(
                toolName=proposal_data.get("toolName", "scale_deployment"),
                args=DeploymentAction(
                    namespace=proposal_data["args"]["namespace"],
                    deployment=proposal_data["args"]["deployment"],
                    replicas=proposal_data["args"]["replicas"]
                ),
                reason=proposal_data.get("reason", "AI analysis suggests scaling")
            )

    except json.JSONDecodeError as e:
        print(f"Failed to parse Ollama response as JSON: {e}")
        return None
    except httpx.TimeoutException:
        print("Ollama request timed out")
        return None
    except Exception as e:
        print(f"Ollama analysis failed: {e}")
        return None
