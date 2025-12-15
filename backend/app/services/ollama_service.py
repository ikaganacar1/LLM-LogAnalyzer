"""
Ollama LLM service for log analysis with streaming support.
"""

import json
import httpx
import re
from typing import Optional, AsyncGenerator

from app.config import get_settings
from app.models.schemas import LogEntry, IncidentToolCall


SYSTEM_PROMPT = """You are a Kubernetes Site Reliability Engineer (SRE) AI assistant.
Your job is to analyze Kubernetes logs and propose the most appropriate remediation action.

## Available Tools

1. **scale_deployment** - Scale deployment replicas up or down
   Parameters: namespace, deployment, replicas
   Use when: OOMKilled, high traffic, CPU pressure, load balancing needed

2. **restart_pod** - Restart a specific pod (delete and recreate)
   Parameters: namespace, pod, graceful (bool)
   Use when: Pod stuck, memory leak, unresponsive app, needs config refresh

3. **rollback_deployment** - Rollback to previous deployment version
   Parameters: namespace, deployment, revision (optional)
   Use when: Bad deployment, app errors after update, performance regression

4. **drain_node** - Safely evict all pods from a node
   Parameters: node, force (bool), ignore_daemonsets (bool), timeout
   Use when: Node hardware issues, maintenance needed, OS updates

5. **cordon_node** - Mark node as unschedulable
   Parameters: node, cordon (bool - true to cordon, false to uncordon)
   Use when: Prevent new pods on problematic node, gradual drain

6. **delete_pod** - Force delete a stuck pod
   Parameters: namespace, pod, force (bool)
   Use when: Pod stuck in Terminating, zombie pods, cleanup needed

7. **update_resource_limits** - Update CPU/Memory limits
   Parameters: namespace, deployment, cpu_limit, memory_limit, cpu_request, memory_request
   Use when: OOMKilled frequently, CPU throttling, resource optimization

8. **apply_network_policy** - Apply network traffic rules
   Parameters: namespace, policy_name, action (allow/deny), target_pod_selector
   Use when: Security incident, DDoS, traffic isolation needed

## Response Format

Respond with a JSON object:
{
  "toolName": "<tool_name>",
  "args": { <tool-specific parameters> },
  "reason": "<detailed explanation of the issue and why this action will fix it>"
}

## Rules
- Analyze ALL logs to understand the full context
- Choose the MOST appropriate tool for the specific issue
- Extract deployment/pod names from the log entries
- Provide detailed reasoning explaining root cause and fix
- namespace defaults to "prod" unless logs indicate otherwise"""


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


def extract_json_from_response(content: str) -> Optional[dict]:
    """Extract JSON from response, handling think tags and markdown."""
    # Remove <think>...</think> tags
    content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL)
    content = content.strip()

    # Handle markdown code blocks
    if "```json" in content:
        content = content.split("```json")[1].split("```")[0].strip()
    elif "```" in content:
        parts = content.split("```")
        if len(parts) >= 2:
            content = parts[1].strip()

    # Try to find JSON object with toolName
    json_match = re.search(r'\{[^{}]*"toolName"[^}]*\}', content, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group())
        except:
            pass

    # Try to find nested JSON
    try:
        # Find outermost braces
        start = content.find('{')
        if start != -1:
            depth = 0
            for i, c in enumerate(content[start:]):
                if c == '{':
                    depth += 1
                elif c == '}':
                    depth -= 1
                    if depth == 0:
                        json_str = content[start:start+i+1]
                        return json.loads(json_str)
    except:
        pass

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return None


async def analyze_logs_streaming(logs: list[LogEntry]) -> AsyncGenerator[dict, None]:
    """
    Analyze logs using Ollama with streaming.
    Yields chunks with type: 'thinking', 'content', 'done', or 'error'
    """
    settings = get_settings()
    log_context = format_logs_for_analysis(logs)

    user_prompt = f"""Analyze these Kubernetes log entries. A critical incident has been detected.

LOGS:
{log_context}

Based on these logs:
1. Identify the root cause of the incident
2. Choose the most appropriate remediation tool
3. Provide the complete JSON response with toolName, args, and detailed reason"""

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(settings.ollama_timeout)) as client:
            async with client.stream(
                "POST",
                f"{settings.ollama_host}/api/chat",
                json={
                    "model": settings.ollama_model,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt}
                    ],
                    "stream": True,
                    "options": {
                        "temperature": 0.3,
                        "num_predict": 2000
                    }
                }
            ) as response:
                if response.status_code != 200:
                    yield {"type": "error", "content": f"Ollama error: {response.status_code}"}
                    return

                full_content = ""
                in_think = False

                async for line in response.aiter_lines():
                    if not line:
                        continue

                    try:
                        chunk = json.loads(line)
                        token = chunk.get("message", {}).get("content", "")
                        full_content += token

                        # Track thinking state
                        if "<think>" in token:
                            in_think = True
                        if "</think>" in token:
                            in_think = False
                            continue

                        if in_think or token.startswith("<think"):
                            yield {"type": "thinking", "content": token}
                        else:
                            clean_token = re.sub(r'</?think>', '', token)
                            if clean_token:
                                yield {"type": "content", "content": clean_token}

                        if chunk.get("done"):
                            proposal = extract_json_from_response(full_content)
                            if proposal:
                                yield {
                                    "type": "done",
                                    "proposal": proposal
                                }
                            else:
                                print(f"[DEBUG] Failed to parse JSON from LLM response. Full content:\n{full_content}\n")
                                yield {"type": "error", "content": f"Could not parse response as JSON. Response preview: {full_content[:500]}"}
                    except json.JSONDecodeError:
                        continue

    except httpx.TimeoutException:
        yield {"type": "error", "content": "Request timed out"}
    except Exception as e:
        yield {"type": "error", "content": str(e)}


async def analyze_logs_with_ollama(logs: list[LogEntry]) -> Optional[IncidentToolCall]:
    """
    Analyze logs using Ollama LLM (non-streaming).
    """
    settings = get_settings()
    log_context = format_logs_for_analysis(logs)

    user_prompt = f"""Analyze these Kubernetes log entries. A critical incident has been detected.

LOGS:
{log_context}

Based on these logs:
1. Identify the root cause of the incident
2. Choose the most appropriate remediation tool
3. Provide the complete JSON response with toolName, args, and detailed reason"""

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(settings.ollama_timeout)) as client:
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
                        "temperature": 0.3,
                        "num_predict": 2000
                    }
                }
            )

            if response.status_code != 200:
                print(f"Ollama API error: {response.status_code} - {response.text}")
                return None

            result = response.json()
            content = result.get("message", {}).get("content", "").strip()

            proposal_data = extract_json_from_response(content)

            if not proposal_data:
                print(f"Could not extract JSON from: {content[:300]}")
                return None

            return IncidentToolCall(
                toolName=proposal_data.get("toolName", "scale_deployment"),
                args=proposal_data.get("args", {}),
                reason=proposal_data.get("reason", "AI analysis complete")
            )

    except Exception as e:
        print(f"Ollama analysis failed: {e}")
        return None
