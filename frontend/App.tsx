import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LogTerminal } from './components/LogTerminal';
import { IncidentPanel } from './components/IncidentPanel';
import { LogEntry, SystemStatus, IncidentToolCall } from './types';
import { generateLog } from './services/logGenerator';
import { analyzeLogsStreaming } from './services/api';

const App: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<SystemStatus>(SystemStatus.HEALTHY);
  const [proposal, setProposal] = useState<IncidentToolCall | null>(null);
  const [thinking, setThinking] = useState<string>('');
  const [aiContent, setAiContent] = useState<string>('');

  const intervalRef = useRef<number | null>(null);
  const logsRef = useRef<LogEntry[]>([]);

  // Keep ref synced
  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  const handleIncidentDetected = useCallback(async () => {
     // Pause generation
     if (intervalRef.current) {
         window.clearInterval(intervalRef.current);
         intervalRef.current = null;
     }

     setStatus(SystemStatus.ANALYZING);
     setThinking('');
     setAiContent('');

     // Get recent logs for context
     const recentLogs = logsRef.current.slice(-15);

     // Call backend API with streaming
     await analyzeLogsStreaming(recentLogs, {
       onThinking: (content) => {
         setThinking(prev => prev + content);
       },
       onContent: (content) => {
         setAiContent(prev => prev + content);
       },
       onDone: (result) => {
         setProposal(result);
         setStatus(SystemStatus.INCIDENT_DETECTED);
       },
       onError: (error) => {
         console.error('Analysis error:', error);
         // Fallback
         setProposal({
           toolName: 'scale_deployment',
           args: { namespace: 'prod', deployment: 'payment-service', replicas: 5 },
           reason: 'Detected critical errors. Using fallback recommendation.'
         });
         setStatus(SystemStatus.INCIDENT_DETECTED);
       }
     });
  }, []);

  const startLogStream = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = window.setInterval(() => {
      // 5% Chance of critical error if system is healthy
      const shouldTriggerError = Math.random() < 0.05;

      const newLog = generateLog(shouldTriggerError);

      setLogs(prev => {
        const updated = [...prev, newLog];
        // Keep logs manageable
        return updated.length > 200 ? updated.slice(-200) : updated;
      });

      if (shouldTriggerError) {
        handleIncidentDetected();
      }

    }, 500); // 500ms log generation speed
  }, [handleIncidentDetected]);

  useEffect(() => {
    startLogStream();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startLogStream]);

  const handleApprove = () => {
    setStatus(SystemStatus.REMEDIATING);

    // Simulate execution time
    setTimeout(() => {
        // Add success log
        const successLog: LogEntry = {
            id: Math.random().toString(),
            timestamp: new Date().toISOString(),
            level: 'INFO' as any,
            pod: 'kube-controller',
            message: `Scaled deployment ${proposal?.args.deployment} to ${proposal?.args.replicas} replicas. Status: Healthy.`
        };

        setLogs(prev => [...prev, successLog]);
        setStatus(SystemStatus.HEALTHY);
        setProposal(null);
        setThinking('');
        setAiContent('');
        startLogStream();
    }, 3000);
  };

  const handleIgnore = () => {
    setStatus(SystemStatus.HEALTHY);
    setProposal(null);
    setThinking('');
    setAiContent('');
    startLogStream();
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-slate-950">
      {/* Left Panel: Logs */}
      <div className="w-full md:w-1/2 h-1/2 md:h-full border-b md:border-b-0 md:border-r border-slate-800">
        <LogTerminal
            logs={logs}
            isPaused={status !== SystemStatus.HEALTHY}
        />
      </div>

      {/* Right Panel: AI Ops */}
      <div className="w-full md:w-1/2 h-1/2 md:h-full">
        <IncidentPanel
            status={status}
            proposal={proposal}
            thinking={thinking}
            aiContent={aiContent}
            onApprove={handleApprove}
            onIgnore={handleIgnore}
        />
      </div>
    </div>
  );
};

export default App;
