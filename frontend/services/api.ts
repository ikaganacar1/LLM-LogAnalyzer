/**
 * API service for communicating with the KubeSentinel backend.
 * Uses local Ollama LLM for log analysis instead of cloud APIs.
 */

import { LogEntry, IncidentToolCall } from '../types';

// Backend API URL - configurable via environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface AnalyzeResponse {
  success: boolean;
  proposal: IncidentToolCall | null;
  error?: string;
}

interface ExecuteResponse {
  status: string;
  message: string;
  details?: Record<string, unknown>;
}

interface HealthResponse {
  status: string;
  ollama_connected: boolean;
  model: string;
}

/**
 * Check backend API and Ollama connection health.
 */
export const checkHealth = async (): Promise<HealthResponse | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Health check failed:', error);
    return null;
  }
};

/**
 * Analyze logs using the backend Ollama service.
 *
 * @param logs - Array of recent log entries to analyze
 * @returns IncidentToolCall if action is needed, null otherwise
 */
export const analyzeLogs = async (logs: LogEntry[]): Promise<IncidentToolCall | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ logs }),
    });

    if (!response.ok) {
      throw new Error(`Analysis request failed: ${response.status}`);
    }

    const data: AnalyzeResponse = await response.json();

    if (data.success && data.proposal) {
      return data.proposal;
    }

    if (data.error) {
      console.warn('Analysis warning:', data.error);
    }

    return data.proposal || null;

  } catch (error) {
    console.error('Log analysis failed:', error);
    return null;
  }
};

/**
 * Execute a remediation action via the backend.
 *
 * @param toolCall - The action to execute
 * @returns Execution result or null on failure
 */
export const executeAction = async (toolCall: IncidentToolCall): Promise<ExecuteResponse | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tool_name: toolCall.toolName,
        parameters: toolCall.args,
      }),
    });

    if (!response.ok) {
      throw new Error(`Execute request failed: ${response.status}`);
    }

    return await response.json();

  } catch (error) {
    console.error('Action execution failed:', error);
    return null;
  }
};

