import React, { useRef, useEffect } from 'react';
import { IncidentToolCall, SystemStatus } from '../types';
import {
  Activity, ShieldCheck, ShieldAlert, Cpu, Server, Play, XOctagon,
  Loader2, Brain, RotateCcw, Trash2, HardDrive, Scale, Shield, Settings, RefreshCw
} from 'lucide-react';

interface IncidentPanelProps {
  status: SystemStatus;
  proposal: IncidentToolCall | null;
  thinking?: string;
  aiContent?: string;
  onApprove: () => void;
  onIgnore: () => void;
}

// Tool display configuration
const TOOL_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  scale_deployment: { icon: <Scale size={16} />, color: 'text-blue-400', label: 'Scale Deployment' },
  restart_pod: { icon: <RefreshCw size={16} />, color: 'text-orange-400', label: 'Restart Pod' },
  rollback_deployment: { icon: <RotateCcw size={16} />, color: 'text-yellow-400', label: 'Rollback Deployment' },
  drain_node: { icon: <HardDrive size={16} />, color: 'text-red-400', label: 'Drain Node' },
  cordon_node: { icon: <Shield size={16} />, color: 'text-purple-400', label: 'Cordon Node' },
  delete_pod: { icon: <Trash2 size={16} />, color: 'text-red-500', label: 'Delete Pod' },
  update_resource_limits: { icon: <Settings size={16} />, color: 'text-cyan-400', label: 'Update Resources' },
  apply_network_policy: { icon: <Shield size={16} />, color: 'text-pink-400', label: 'Network Policy' },
};

const formatParamKey = (key: string): string => {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const formatParamValue = (key: string, value: unknown): string => {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === null || value === undefined) return 'Default';
  return String(value);
};

export const IncidentPanel: React.FC<IncidentPanelProps> = ({
  status,
  proposal,
  thinking = '',
  aiContent = '',
  onApprove,
  onIgnore
}) => {
  const isHealthy = status === SystemStatus.HEALTHY;
  const isAnalyzing = status === SystemStatus.ANALYZING;
  const isDetected = status === SystemStatus.INCIDENT_DETECTED;
  const isRemediating = status === SystemStatus.REMEDIATING;

  const thinkingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (thinkingRef.current) {
      thinkingRef.current.scrollTop = thinkingRef.current.scrollHeight;
    }
  }, [thinking]);

  const cleanThinking = thinking
    .replace(/<think>/g, '')
    .replace(/<\/think>/g, '')
    .trim();

  const toolConfig = proposal ? TOOL_CONFIG[proposal.toolName] || {
    icon: <Server size={16} />,
    color: 'text-slate-400',
    label: proposal.toolName
  } : null;

  return (
    <div className="flex flex-col h-full bg-slate-950 p-6 md:p-8 relative overflow-hidden">
        <div className={`absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[100px] opacity-20 transition-colors duration-1000 ${isHealthy ? 'bg-green-500' : 'bg-red-600'}`}></div>

        <div className="z-10 flex flex-col h-full max-w-2xl mx-auto w-full">

            {/* Header Status */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">System Status</h2>
                    <p className="text-slate-400 mt-1">AI Oversight Module</p>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${
                    isHealthy
                        ? 'bg-green-500/10 border-green-500/20 text-green-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse'
                }`}>
                    {isHealthy ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
                    <span className="font-semibold tracking-wider">
                        {isHealthy ? 'OPERATIONAL' : 'CRITICAL ALERT'}
                    </span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col justify-center overflow-hidden">

                {isHealthy && (
                    <div className="text-center space-y-6 animate-in fade-in duration-700">
                        <div className="relative inline-block">
                             <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full animate-pulse-soft"></div>
                             <Activity size={80} className="text-green-500 relative z-10 mx-auto" />
                        </div>
                        <h3 className="text-3xl font-light text-slate-200">Monitoring Active</h3>
                        <p className="text-slate-500 max-w-md mx-auto">
                            KubeSentinel is analyzing log streams in real-time. No anomalies detected.
                        </p>

                        <div className="grid grid-cols-2 gap-4 mt-8 max-w-sm mx-auto opacity-70">
                            <div className="bg-slate-900 p-4 rounded border border-slate-800 text-center">
                                <Cpu className="mx-auto mb-2 text-slate-400" size={24}/>
                                <div className="text-sm text-slate-500">CPU Usage</div>
                                <div className="text-xl font-mono text-green-400">24%</div>
                            </div>
                            <div className="bg-slate-900 p-4 rounded border border-slate-800 text-center">
                                <Server className="mx-auto mb-2 text-slate-400" size={24}/>
                                <div className="text-sm text-slate-500">Memory</div>
                                <div className="text-xl font-mono text-green-400">41%</div>
                            </div>
                        </div>
                    </div>
                )}

                {isAnalyzing && (
                     <div className="space-y-4 animate-in fade-in zoom-in duration-300 overflow-hidden flex flex-col h-full">
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-3 mb-2">
                                <Brain size={28} className="text-purple-500 animate-pulse" />
                                <h3 className="text-xl font-bold text-purple-400">AI Analyzing...</h3>
                            </div>
                            <p className="text-slate-400 text-sm">DeepSeek-R1 reasoning through the incident</p>
                        </div>

                        <div className="flex-1 bg-slate-900/80 border border-purple-500/30 rounded-lg overflow-hidden flex flex-col min-h-0">
                            <div className="bg-purple-500/10 px-4 py-2 border-b border-purple-500/20 flex items-center gap-2 shrink-0">
                                <Loader2 size={16} className="text-purple-400 animate-spin" />
                                <span className="text-purple-400 text-sm font-medium">Thinking Process</span>
                            </div>
                            <div
                                ref={thinkingRef}
                                className="flex-1 p-4 overflow-y-auto font-mono text-sm text-slate-300 leading-relaxed whitespace-pre-wrap"
                            >
                                {cleanThinking || <span className="text-slate-500 italic">Initializing analysis...</span>}
                                <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-1"></span>
                            </div>
                        </div>
                     </div>
                )}

                {(isDetected || isRemediating) && proposal && toolConfig && (
                    <div className="w-full bg-slate-900 border border-red-500/30 rounded-lg overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-500">
                        <div className="bg-red-500/10 p-4 border-b border-red-500/20 flex items-center gap-3">
                            <ShieldAlert className="text-red-500" />
                            <span className="font-bold text-red-400">INCIDENT REPORT GENERATED</span>
                        </div>

                        <div className="p-6 space-y-6 max-h-[400px] overflow-y-auto">
                            {cleanThinking && (
                                <div>
                                    <h4 className="text-purple-400 text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <Brain size={14} /> AI Reasoning
                                    </h4>
                                    <div className="bg-purple-500/5 border border-purple-500/20 rounded p-3 max-h-24 overflow-y-auto">
                                        <p className="text-slate-400 text-xs font-mono leading-relaxed whitespace-pre-wrap">
                                            {cleanThinking.length > 400 ? '...' + cleanThinking.slice(-400) : cleanThinking}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div>
                                <h4 className="text-slate-400 text-sm uppercase tracking-wider mb-2">Root Cause Analysis</h4>
                                <p className="text-slate-200 leading-relaxed">
                                    {proposal.reason}
                                </p>
                            </div>

                            <div className="bg-slate-950 rounded border border-slate-800 p-4">
                                <h4 className={`text-sm uppercase tracking-wider mb-3 flex items-center gap-2 ${toolConfig.color}`}>
                                    {toolConfig.icon} Proposed Remediation: {toolConfig.label}
                                </h4>
                                <div className="font-mono text-sm space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Tool:</span>
                                        <span className="text-yellow-400">{proposal.toolName}</span>
                                    </div>
                                    {Object.entries(proposal.args).map(([key, value]) => (
                                        <div key={key} className="flex justify-between">
                                            <span className="text-slate-500">{formatParamKey(key)}:</span>
                                            <span className={
                                                key === 'replicas' ? 'text-green-400' :
                                                key === 'force' && value ? 'text-red-400' :
                                                'text-slate-300'
                                            }>
                                                {formatParamValue(key, value)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {isDetected && (
                            <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex gap-4">
                                <button
                                    onClick={onApprove}
                                    className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 px-4 rounded font-bold shadow-lg shadow-green-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Play size={18} fill="currentColor" />
                                    APPROVE FIX
                                </button>
                                <button
                                    onClick={onIgnore}
                                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 px-4 rounded font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <XOctagon size={18} />
                                    IGNORE
                                </button>
                            </div>
                        )}

                        {isRemediating && (
                             <div className="p-6 bg-green-900/20 border-t border-green-900/50 text-center">
                                <div className="flex items-center justify-center gap-3 text-green-400">
                                    <Loader2 className="animate-spin" size={20} />
                                    <span className="font-bold">Executing {toolConfig.label}...</span>
                                </div>
                             </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="mt-4 text-center text-slate-600 text-xs font-mono">
                KubeSentinel v3.0.0 • DeepSeek-R1:14b • 8 Tools Available
            </div>
        </div>
    </div>
  );
};
