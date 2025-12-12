import { LogEntry, LogLevel } from '../types';

const PODS = [
  'payment-service-7d9cf',
  'auth-service-5f8b2',
  'frontend-proxy-2a1c9',
  'database-primary-0',
  'redis-cache-worker-1',
  'email-notifier-8b4d3'
];

const NORMAL_MESSAGES = [
  'Health check passed',
  'Request processed in 45ms',
  'Cache hit for key: user_session',
  'Transaction committed successfully',
  'Received heartbeat from worker',
  'Updating inventory count',
  'Authorized request from 192.168.1.105',
  'Garbage collection completed',
  'Metrics scraped successfully'
];

const CRITICAL_MESSAGES = [
  'OOMKilled: Process used more memory than limit (512Mi)',
  'CrashLoopBackOff: Back-off restarting failed container',
  'ConnectionRefused: database-primary-0:5432',
  'Readiness probe failed: 503 Service Unavailable'
];

export const generateLog = (forceError: boolean = false): LogEntry => {
  const timestamp = new Date().toISOString();
  const pod = PODS[Math.floor(Math.random() * PODS.length)];
  const id = Math.random().toString(36).substring(7);

  if (forceError) {
    const message = CRITICAL_MESSAGES[Math.floor(Math.random() * CRITICAL_MESSAGES.length)];
    // Ensure critical errors usually happen on specific sensitive pods for realism
    const criticalPod = 'payment-service-7d9cf'; 
    return {
      id,
      timestamp,
      level: LogLevel.ERROR,
      pod: criticalPod,
      message: message
    };
  }

  const isWarn = Math.random() > 0.9;
  return {
    id,
    timestamp,
    level: isWarn ? LogLevel.WARN : LogLevel.INFO,
    pod,
    message: NORMAL_MESSAGES[Math.floor(Math.random() * NORMAL_MESSAGES.length)]
  };
};