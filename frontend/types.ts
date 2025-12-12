export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  pod: string;
  message: string;
}

export interface IncidentToolCall {
  toolName: string;
  args: Record<string, any>;
  reason: string;
}

export enum SystemStatus {
  HEALTHY = 'HEALTHY',
  ANALYZING = 'ANALYZING',
  INCIDENT_DETECTED = 'INCIDENT_DETECTED',
  REMEDIATING = 'REMEDIATING'
}

export interface DeploymentAction {
  namespace: string;
  deployment: string;
  replicas: number;
}