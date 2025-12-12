import { LogEntry, LogLevel } from '../types';

// =============================================================================
// Pod Definitions
// =============================================================================

const PODS = {
  services: [
    'payment-service-7d9cf',
    'payment-service-8e2ab',
    'auth-service-5f8b2',
    'auth-service-3c7d1',
    'order-service-9a4bc',
    'user-service-2b6de',
    'notification-service-4f1gh',
    'inventory-service-6h3jk',
  ],
  infrastructure: [
    'frontend-proxy-2a1c9',
    'api-gateway-7b3mn',
    'ingress-nginx-controller-5pq2r',
    'load-balancer-8st4u',
  ],
  data: [
    'database-primary-0',
    'database-replica-1',
    'database-replica-2',
    'redis-cache-master-0',
    'redis-cache-worker-1',
    'elasticsearch-data-0',
    'kafka-broker-0',
    'rabbitmq-server-0',
  ],
  system: [
    'kube-scheduler-node01',
    'coredns-7f89d5c4b8-x2k9l',
    'metrics-server-6d94bc9d4c-8m2nq',
    'fluentd-4r7tp',
    'prometheus-server-0',
  ],
  nodes: [
    'node-worker-01',
    'node-worker-02',
    'node-worker-03',
    'node-master-01',
  ]
};

const ALL_PODS = [
  ...PODS.services,
  ...PODS.infrastructure,
  ...PODS.data,
  ...PODS.system
];

// =============================================================================
// Normal Log Messages
// =============================================================================

const NORMAL_MESSAGES = [
  // Health & Monitoring
  'Health check passed',
  'Liveness probe succeeded',
  'Readiness probe succeeded',
  'Metrics exported: 847 data points',
  'Heartbeat acknowledged from controller',

  // Request Processing
  'Request processed in 45ms',
  'Request processed in 128ms',
  'Request processed in 23ms',
  'GET /api/v1/users completed 200 OK',
  'POST /api/v1/orders completed 201 Created',
  'Handled 1,247 requests in last minute',

  // Cache
  'Cache hit for key: user_session_abc123',
  'Cache miss for key: product_456, fetching from DB',
  'Cache invalidated for pattern: user:*',
  'Redis connection pool: 8/10 connections active',

  // Database
  'Transaction committed successfully',
  'Query executed in 12ms: SELECT * FROM orders',
  'Connection pool: 15/20 connections in use',
  'Replication lag: 0.02s',
  'Database backup completed successfully',

  // Security
  'Authorized request from 192.168.1.105',
  'JWT token validated for user: admin@example.com',
  'TLS handshake completed',
  'Certificate valid for 89 days',

  // System
  'Garbage collection completed: freed 128MB',
  'Container started successfully',
  'Configuration reloaded',
  'Log rotation completed',
  'Scheduled job completed: cleanup_temp_files',

  // Network
  'Established connection to upstream: api-gateway:8080',
  'DNS resolution: payment-service.prod.svc.cluster.local -> 10.0.0.45',
  'Load balancer health check passed',
];

const WARNING_MESSAGES = [
  // Performance
  'High latency detected: 850ms (threshold: 500ms)',
  'Request queue growing: 45 pending requests',
  'CPU usage elevated: 78% (threshold: 70%)',
  'Memory usage at 82% of limit',
  'Slow query detected: 2.3s for SELECT * FROM large_table',

  // Resources
  'Disk usage at 75% on /var/log',
  'File descriptor usage high: 890/1024',
  'Thread pool exhaustion warning: 95% utilized',
  'Connection pool nearing capacity: 18/20',

  // Network
  'Retrying request to upstream (attempt 2/3)',
  'DNS lookup slow: 450ms for external-api.com',
  'SSL certificate expires in 14 days',
  'Rate limit threshold approaching: 900/1000 requests',

  // Data
  'Replication lag increasing: 1.5s',
  'Cache eviction rate elevated',
  'Message queue backlog: 1,247 messages pending',
  'Kafka consumer lag: 500 messages behind',

  // Application
  'Deprecated API endpoint called: /api/v1/legacy',
  'Configuration drift detected',
  'Circuit breaker half-open for payment-gateway',
  'Retry budget depleted for external-api',
];

// =============================================================================
// Critical Error Scenarios (mapped to appropriate tools)
// =============================================================================

interface CriticalScenario {
  messages: string[];
  targetPod: string;
  suggestedTool: string;
}

const CRITICAL_SCENARIOS: CriticalScenario[] = [
  // OOMKilled - suggests scale_deployment or update_resource_limits
  {
    messages: [
      'OOMKilled: Container killed due to memory limit exceeded (512Mi)',
      'Fatal: Out of memory allocating 256MB buffer',
      'Process terminated: memory cgroup out of memory',
      'OOMKilled: Exit code 137, memory limit reached',
    ],
    targetPod: 'payment-service-7d9cf',
    suggestedTool: 'scale_deployment'
  },

  // CrashLoopBackOff - suggests restart_pod or rollback_deployment
  {
    messages: [
      'CrashLoopBackOff: Back-off restarting failed container (5th attempt)',
      'Container crashed: exit code 1, restarting in 40s',
      'Error: Application failed to start - missing environment variable DB_HOST',
      'CrashLoopBackOff: Container keeps crashing after v2.1.0 deployment',
    ],
    targetPod: 'auth-service-5f8b2',
    suggestedTool: 'rollback_deployment'
  },

  // Database connectivity - suggests restart_pod
  {
    messages: [
      'ConnectionRefused: Unable to connect to database-primary-0:5432',
      'Error: FATAL: too many connections for role "app_user"',
      'Database connection timeout after 30s',
      'PostgreSQL error: connection reset by peer',
    ],
    targetPod: 'order-service-9a4bc',
    suggestedTool: 'restart_pod'
  },

  // Pod stuck - suggests delete_pod
  {
    messages: [
      'Pod stuck in Terminating state for 15 minutes',
      'Error: Unable to terminate pod - finalizer hanging',
      'Container runtime error: failed to stop container',
      'Timeout waiting for pod termination grace period',
    ],
    targetPod: 'notification-service-4f1gh',
    suggestedTool: 'delete_pod'
  },

  // Node issues - suggests drain_node or cordon_node
  {
    messages: [
      'NodeNotReady: node-worker-02 is not responding',
      'Kubelet stopped posting node status',
      'Node condition: DiskPressure - available disk space below threshold',
      'Node eviction: MemoryPressure condition detected',
    ],
    targetPod: 'kube-scheduler-node01',
    suggestedTool: 'drain_node'
  },

  // Application errors after deployment - suggests rollback_deployment
  {
    messages: [
      'Error: NullPointerException in PaymentProcessor.process()',
      'Critical: Unhandled exception in request handler after v3.0.0 release',
      'API returning 500 errors: regression detected in latest deployment',
      'Error rate spike: 45% of requests failing since last deployment',
    ],
    targetPod: 'payment-service-8e2ab',
    suggestedTool: 'rollback_deployment'
  },

  // Resource throttling - suggests update_resource_limits
  {
    messages: [
      'CPU throttling detected: container limited to 100m, needs 500m',
      'Performance degraded: CPU quota exceeded for 45s',
      'Container CPU throttled: processes in uninterruptible sleep',
      'Resource starvation: container cannot allocate more CPU',
    ],
    targetPod: 'api-gateway-7b3mn',
    suggestedTool: 'update_resource_limits'
  },

  // Security/Network issues - suggests apply_network_policy
  {
    messages: [
      'Security alert: Unusual traffic pattern detected from 10.0.5.23',
      'DDoS pattern detected: 50,000 requests/sec from single source',
      'Suspicious activity: Multiple failed auth attempts from internal pod',
      'Network anomaly: Unexpected outbound connections to external IP',
    ],
    targetPod: 'ingress-nginx-controller-5pq2r',
    suggestedTool: 'apply_network_policy'
  },

  // Service mesh / probe failures - suggests restart_pod
  {
    messages: [
      'Readiness probe failed: HTTP 503 Service Unavailable',
      'Liveness probe failed 3 consecutive times',
      'Service mesh sidecar unresponsive',
      'Envoy proxy health check failing',
    ],
    targetPod: 'user-service-2b6de',
    suggestedTool: 'restart_pod'
  },

  // Queue/Message broker issues - suggests scale_deployment
  {
    messages: [
      'RabbitMQ queue overflow: 100,000 messages pending',
      'Kafka consumer lag critical: 50,000 messages behind',
      'Message processing backlog exceeding SLA',
      'Queue depth alarm: orders-queue at 95% capacity',
    ],
    targetPod: 'notification-service-4f1gh',
    suggestedTool: 'scale_deployment'
  },

  // Cache failures - suggests restart_pod
  {
    messages: [
      'Redis connection lost: READONLY You cannot write against a read only replica',
      'Cache cluster node failure: redis-cache-worker-1 unreachable',
      'Memcached error: SERVER_ERROR out of memory storing object',
      'Cache stampede detected: 1000 concurrent cache misses',
    ],
    targetPod: 'redis-cache-worker-1',
    suggestedTool: 'restart_pod'
  },
];

// =============================================================================
// Log Generator
// =============================================================================

let currentScenario: CriticalScenario | null = null;
let scenarioMessageIndex = 0;

export const generateLog = (forceError: boolean = false): LogEntry => {
  const timestamp = new Date().toISOString();
  const id = Math.random().toString(36).substring(7);

  if (forceError) {
    // Select a random scenario if not already in one
    if (!currentScenario) {
      currentScenario = CRITICAL_SCENARIOS[Math.floor(Math.random() * CRITICAL_SCENARIOS.length)];
      scenarioMessageIndex = 0;
    }

    const message = currentScenario.messages[scenarioMessageIndex];
    scenarioMessageIndex++;

    // Reset scenario after showing all messages
    if (scenarioMessageIndex >= currentScenario.messages.length) {
      const scenario = currentScenario;
      currentScenario = null;
      scenarioMessageIndex = 0;

      return {
        id,
        timestamp,
        level: LogLevel.ERROR,
        pod: scenario.targetPod,
        message
      };
    }

    return {
      id,
      timestamp,
      level: LogLevel.ERROR,
      pod: currentScenario.targetPod,
      message
    };
  }

  // Normal log generation
  const rand = Math.random();
  const pod = ALL_PODS[Math.floor(Math.random() * ALL_PODS.length)];

  if (rand > 0.92) {
    // 8% chance of warning
    return {
      id,
      timestamp,
      level: LogLevel.WARN,
      pod,
      message: WARNING_MESSAGES[Math.floor(Math.random() * WARNING_MESSAGES.length)]
    };
  }

  // 92% normal logs
  return {
    id,
    timestamp,
    level: LogLevel.INFO,
    pod,
    message: NORMAL_MESSAGES[Math.floor(Math.random() * NORMAL_MESSAGES.length)]
  };
};

// Export for testing
export const getScenarios = () => CRITICAL_SCENARIOS;
export const getPods = () => PODS;
