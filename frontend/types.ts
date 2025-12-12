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

export enum IncidentStatus {
  PENDING = 'PENDING',
  ANALYZING = 'ANALYZING',
  ANALYZED = 'ANALYZED',
  RESOLVED = 'RESOLVED',
  IGNORED = 'IGNORED'
}

export interface Incident {
  id: string;
  timestamp: string;
  triggerLog: LogEntry;
  contextLogs: LogEntry[];
  status: IncidentStatus;
  proposal?: IncidentToolCall;
  thinking?: string; // To store the chain of thought
  analysis?: string; // To store the final content
}

export interface DeploymentAction {
  namespace: string;
  deployment: string;
  replicas: number;
}