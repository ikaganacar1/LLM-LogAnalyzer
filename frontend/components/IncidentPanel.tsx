import React, { useEffect, useState } from 'react';
import { SystemStatus } from '../types';
import { 
  Activity, ShieldCheck, AlertOctagon, Brain, 
  Cpu, Zap, Server, BarChart3, Radio
} from 'lucide-react';

interface SystemMonitorProps {
  status: SystemStatus;
  queueLength: number;
  analyzedCount: number;
  isAnalyzing: boolean;
  currentAnalysis: string;
  tps: number;
  latency: number;
  modelName?: string;
}

// Simple Sparkline Component
const TPSChart: React.FC<{ tps: number }> = ({ tps }) => {
  const [data, setData] = useState<number[]>(new Array(20).fill(0));

  useEffect(() => {
    setData(prev => {
      const next = [...prev, tps];
      return next.slice(-20);
    });
  }, [tps]);

  const max = Math.max(...data, 50);
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - (d / max) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="h-16 w-full mt-2 relative overflow-hidden">
      <svg className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="tpsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`M0,100 ${points} L100,100 Z`}
          fill="url(#tpsGradient)"
        />
        <polyline
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2"
          points={points}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
};

export const SystemMonitor: React.FC<SystemMonitorProps> = ({
  status,
  queueLength,
  analyzedCount,
  isAnalyzing,
  currentAnalysis,
  tps,
  latency,
  modelName
}) => {

  return (
    <div className="h-full flex flex-col bg-background p-6">

      {/* Header Status */}
      <div className="mb-6 flex items-center justify-between">
        <div>
           <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
             <Activity className="text-primary" /> System Monitor
           </h2>
           <p className="text-muted-foreground text-sm mt-1">
             Model: <span className="font-mono text-primary">{modelName || 'Not configured'}</span>
           </p>
        </div>
        <div className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
           status === SystemStatus.HEALTHY ? 'bg-success/10 border-success/20 text-success' :
           status === SystemStatus.INCIDENT_DETECTED ? 'bg-destructive/10 border-destructive/20 text-destructive animate-pulse' :
           'bg-info/10 border-info/20 text-info'
        }`}>
           {status === SystemStatus.HEALTHY ? <ShieldCheck size={20} /> :
            status === SystemStatus.INCIDENT_DETECTED ? <AlertOctagon size={20} /> :
            <Zap size={20} />}
           <span className="font-bold tracking-wider text-sm">{status.replace('_', ' ')}</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
         {/* Queue Card */}
         <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase mb-2">
               <Server size={14} /> Queue
            </div>
            <div className="text-2xl font-mono text-foreground">{queueLength}</div>
            <div className="text-xs text-muted-foreground mt-1">Pending</div>
         </div>

         {/* Actionable Card */}
         <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase mb-2">
               <AlertOctagon size={14} /> Actions
            </div>
            <div className={`text-2xl font-mono ${analyzedCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {analyzedCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Required</div>
         </div>

         {/* Latency Card */}
         <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase mb-2">
               <Cpu size={14} /> Latency
            </div>
            <div className="text-2xl font-mono text-foreground">
              {latency > 0 ? `${(latency/1000).toFixed(1)}s` : '--'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Last Run</div>
         </div>

          {/* Model Card */}
         <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase mb-2">
               <Brain size={14} /> Model
            </div>
            <div className="text-base font-mono text-primary truncate" title="ollama.ikaganacar.com">
               Ollama
            </div>
            <div className="text-xs text-success mt-1 flex items-center gap-1">
               <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse"></span>
               Connected
            </div>
         </div>
      </div>

      {/* Chart Section */}
      <div className="flex flex-col gap-4 mb-6 flex-1 min-h-0">

         {/* Live Neural Feed */}
         <div className="flex-1 bg-card rounded-lg border border-border p-0 overflow-hidden flex flex-col relative">
            <div className="bg-muted/50 p-2 border-b border-border flex items-center justify-between">
               <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase font-mono tracking-wider">
                  <Radio size={14} className={isAnalyzing ? "text-success animate-pulse" : "text-muted"} />
                  Neural Stream
               </div>
               {isAnalyzing && (
                  <span className="text-[10px] bg-info/20 text-info px-2 py-0.5 rounded border border-info/30">
                     PROCESSING
                  </span>
               )}
            </div>

            <div className="flex-1 p-4 font-mono text-sm overflow-y-auto relative">
               {isAnalyzing ? (
                  <div className="space-y-2">
                     <div className="text-success italic text-xs mb-2 font-semibold">
                       {'>'} AI Processing...
                     </div>
                     <div className="text-foreground whitespace-pre-wrap leading-relaxed">
                        {currentAnalysis || <span className="animate-pulse text-info">█</span>}
                     </div>
                  </div>
               ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                     <Brain size={48} className="mb-4 opacity-20" />
                     <p className="text-xs">Waiting for incidents...</p>
                  </div>
               )}
            </div>
         </div>

         {/* Token Speed Chart - Horizontal */}
         <div className="bg-card rounded-lg border border-border p-4 h-32">
            <div className="flex items-center justify-between mb-2">
               <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <BarChart3 size={16} /> Inference Speed
               </h3>
               <div className="text-2xl font-bold text-foreground">{tps} <span className="text-xs text-muted-foreground font-normal">t/s</span></div>
            </div>
            <div className="h-16">
               <TPSChart tps={tps} />
            </div>
         </div>

      </div>

    </div>
  );
};