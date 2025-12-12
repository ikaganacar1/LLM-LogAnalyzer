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
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 font-mono text-xs md:text-sm shadow-inner relative overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-slate-950 border-b border-slate-800 sticky top-0 z-10">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="ml-2 text-slate-400 font-semibold">k8s-cluster-logs</span>
        </div>
        <div className="text-slate-500">
            {isPaused ? <span className="text-yellow-500 flex items-center gap-1">⏸ PAUSED</span> : <span className="text-green-500 flex items-center gap-1">▶ LIVE</span>}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-1 relative">
        {logs.length === 0 && (
          <div className="text-slate-600 italic">Waiting for logs...</div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex gap-2 hover:bg-slate-800/50 p-0.5 rounded transition-colors break-all">
            <span className="text-slate-500 whitespace-nowrap shrink-0">[{log.timestamp.split('T')[1].slice(0, 12)}]</span>
            <span className={`font-bold whitespace-nowrap shrink-0 w-12 text-center ${
              log.level === LogLevel.INFO ? 'text-green-500' :
              log.level === LogLevel.WARN ? 'text-yellow-500' :
              'text-red-500'
            }`}>
              {log.level}
            </span>
            <span className="text-blue-400 whitespace-nowrap shrink-0 hidden md:inline">[{log.pod}]</span>
            <span className={`${
              log.level === LogLevel.ERROR ? 'text-red-400' : 'text-slate-300'
            }`}>
              {log.message}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Scanline effect overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-20 opacity-20"></div>
    </div>
  );
};