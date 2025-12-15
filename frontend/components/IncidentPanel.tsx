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
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`M0,100 ${points} L100,100 Z`}
          fill="url(#tpsGradient)"
        />
        <polyline
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          points={points}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="absolute top-0 right-0 text-xs font-mono text-blue-400">
        {tps} t/s
      </div>
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
  latency
}) => {
  
  return (
    <div className="h-full flex flex-col bg-slate-950 p-6 border-l border-slate-900">
      
      {/* Header Status */}
      <div className="mb-6 flex items-center justify-between">
        <div>
           <h2 className="text-xl font-bold text-white flex items-center gap-2">
             <Activity className="text-blue-500" /> System Monitor
           </h2>
           <p className="text-slate-500 text-sm mt-1">Real-time LLM & Infrastructure Metrics</p>
        </div>
        <div className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
           status === SystemStatus.HEALTHY ? 'bg-green-500/10 border-green-500/20 text-green-400' :
           status === SystemStatus.INCIDENT_DETECTED ? 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse' :
           'bg-blue-500/10 border-blue-500/20 text-blue-400'
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
         <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
               <Server size={14} /> Incident Queue
            </div>
            <div className="text-2xl font-mono text-white">{queueLength}</div>
            <div className="text-xs text-slate-500 mt-1">Pending Analysis</div>
         </div>

         {/* Actionable Card */}
         <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
               <AlertOctagon size={14} /> Action Required
            </div>
            <div className={`text-2xl font-mono ${analyzedCount > 0 ? 'text-red-400' : 'text-slate-600'}`}>
              {analyzedCount}
            </div>
            <div className="text-xs text-slate-500 mt-1">Waiting Approval</div>
         </div>

         {/* Latency Card */}
         <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
               <Cpu size={14} /> Last Latency
            </div>
            <div className="text-2xl font-mono text-white">
              {latency > 0 ? `${(latency/1000).toFixed(1)}s` : '--'}
            </div>
            <div className="text-xs text-slate-500 mt-1">Processing Time</div>
         </div>

          {/* Model Card */}
         <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
               <Brain size={14} /> Model
            </div>
            <div className="text-lg font-mono text-blue-400 truncate" title="ollama.ikaganacar.com">
               Custom/Ollama
            </div>
            <div className="text-xs text-green-500 mt-1 flex items-center gap-1">
               <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
               Connected
            </div>
         </div>
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 flex-1 min-h-0">
         
         {/* Token Speed Chart */}
         <div className="lg:col-span-1 bg-slate-900/30 rounded-lg border border-slate-800 p-4 flex flex-col">
            <div className="flex justify-between items-center mb-2">
               <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <BarChart3 size={16} /> Inference Speed
               </h3>
               {isAnalyzing && <span className="text-[10px] text-blue-400 animate-pulse">LIVE</span>}
            </div>
            <div className="flex-1 flex flex-col justify-end">
               <div className="text-3xl font-bold text-white mb-1">{tps} <span className="text-sm text-slate-500 font-normal">tokens/s</span></div>
               <TPSChart tps={tps} />
            </div>
         </div>

         {/* Live Neural Feed */}
         <div className="lg:col-span-2 bg-black rounded-lg border border-slate-800 p-0 overflow-hidden flex flex-col relative">
            <div className="bg-slate-900/80 p-2 border-b border-slate-800 flex items-center justify-between">
               <div className="flex items-center gap-2 text-xs text-slate-400 uppercase font-mono tracking-wider">
                  <Radio size={14} className={isAnalyzing ? "text-green-500 animate-pulse" : "text-slate-600"} />
                  Neural Stream
               </div>
               {isAnalyzing && (
                  <span className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded border border-blue-900/50">
                     PROCESSING
                  </span>
               )}
            </div>
            
            <div className="flex-1 p-4 font-mono text-sm overflow-y-auto relative">
               {isAnalyzing ? (
                  <div className="space-y-2">
                     <div className="text-slate-500 italic text-xs mb-2">
                       {'>'} Reading context logs...
                     </div>
                     <div className="text-purple-300/90 whitespace-pre-wrap leading-relaxed">
                        {currentAnalysis || <span className="animate-pulse">_</span>}
                     </div>
                  </div>
               ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700">
                     <Brain size={48} className="mb-4 opacity-20" />
                     <p>Waiting for events...</p>
                  </div>
               )}
            </div>
         </div>

      </div>

    </div>
  );
};