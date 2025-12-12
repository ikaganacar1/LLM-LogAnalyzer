/**
 * API service for communicating with the KubeSentinel backend.
 * Uses local Ollama LLM for log analysis with streaming support.
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

export interface StreamCallbacks {
  onThinking?: (content: string) => void;
  onContent?: (content: string) => void;
  onDone?: (proposal: IncidentToolCall) => void;
  onError?: (error: string) => void;
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
 * Analyze logs with streaming response (shows thinking process).
 */
export const analyzeLogsStreaming = async (
  logs: LogEntry[],
  callbacks: StreamCallbacks
): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ logs }),
    });

    if (!response.ok) {
      throw new Error(`Analysis request failed: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete events
      const events = buffer.split('\n\n');
      buffer = events.pop() || ''; // Keep incomplete event in buffer

      for (const event of events) {
        if (!event.trim()) continue;

        const lines = event.split('\n');
        let eventType = 'message';
        let data = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7);
          } else if (line.startsWith('data: ')) {
            data = line.slice(6);
          }
        }

        if (!data) continue;

        try {
          const parsed = JSON.parse(data);

          switch (eventType) {
            case 'thinking':
              callbacks.onThinking?.(parsed.content || '');
              break;
            case 'content':
              callbacks.onContent?.(parsed.content || '');
              break;
            case 'done':
              if (parsed.proposal) {
                const proposal: IncidentToolCall = {
                  toolName: parsed.proposal.toolName || 'scale_deployment',
                  args: parsed.proposal.args || {},
                  reason: parsed.proposal.reason || ''
                };
                callbacks.onDone?.(proposal);
              }
              break;
            case 'error':
              callbacks.onError?.(parsed.content || 'Unknown error');
              break;
          }
        } catch (e) {
          console.error('Failed to parse SSE data:', e);
        }
      }
    }
  } catch (error) {
    console.error('Streaming analysis failed:', error);
    callbacks.onError?.(error instanceof Error ? error.message : 'Unknown error');
  }
};

/**
 * Analyze logs using the backend Ollama service (non-streaming).
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
