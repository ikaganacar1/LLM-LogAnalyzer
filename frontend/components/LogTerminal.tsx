import React, { useEffect, useRef } from 'react';
import { LogEntry, LogLevel } from '../types';

interface LogTerminalProps {
  logs: LogEntry[];
  isPaused: boolean;
}

export const LogTerminal: React.FC<LogTerminalProps> = ({ logs, isPaused }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPaused && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isPaused]);

  return (
    <div className="flex flex-col h-full bg-card border-r border-border font-mono text-xs md:text-sm shadow-inner relative overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-muted border-b border-border sticky top-0 z-10">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-destructive"></div>
          <div className="w-3 h-3 rounded-full bg-warning"></div>
          <div className="w-3 h-3 rounded-full bg-success"></div>
          <span className="ml-2 text-muted-foreground font-semibold">k8s-cluster-logs</span>
        </div>
        <div className="text-muted-foreground">
            {isPaused ? <span className="text-warning flex items-center gap-1">⏸ PAUSED</span> : <span className="text-success flex items-center gap-1">▶ LIVE</span>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-1 relative">
        {logs.length === 0 && (
          <div className="text-muted-foreground italic">Waiting for logs...</div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex gap-2 hover:bg-accent p-0.5 rounded transition-colors break-all">
            <span className="text-muted-foreground whitespace-nowrap shrink-0">[{log.timestamp.split('T')[1].slice(0, 12)}]</span>
            <span className={`font-bold whitespace-nowrap shrink-0 w-12 text-center ${
              log.level === LogLevel.INFO ? 'text-success' :
              log.level === LogLevel.WARN ? 'text-warning' :
              'text-destructive'
            }`}>
              {log.level}
            </span>
            <span className="text-info whitespace-nowrap shrink-0 hidden md:inline">[{log.pod}]</span>
            <span className={`${
              log.level === LogLevel.ERROR ? 'text-destructive' : 'text-foreground/80'
            }`}>
              {log.message}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Scanline effect overlay - subtle */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.02)_50%)] bg-[length:100%_4px] z-20 opacity-30"></div>
    </div>
  );
};