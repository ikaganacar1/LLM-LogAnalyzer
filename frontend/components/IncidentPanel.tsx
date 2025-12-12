import React from 'react';
import { IncidentToolCall, SystemStatus } from '../types';
import { Activity, ShieldCheck, ShieldAlert, Cpu, Server, Play, XOctagon, Loader2 } from 'lucide-react';

interface IncidentPanelProps {
  status: SystemStatus;
  proposal: IncidentToolCall | null;
  onApprove: () => void;
  onIgnore: () => void;
}

export const IncidentPanel: React.FC<IncidentPanelProps> = ({ status, proposal, onApprove, onIgnore }) => {
  const isHealthy = status === SystemStatus.HEALTHY;
  const isAnalyzing = status === SystemStatus.ANALYZING;
  const isDetected = status === SystemStatus.INCIDENT_DETECTED;
  const isRemediating = status === SystemStatus.REMEDIATING;

  return (
    <div className="flex flex-col h-full bg-slate-950 p-6 md:p-8 relative overflow-hidden">
        {/* Background Ambient Glow */}
        <div className={`absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[100px] opacity-20 transition-colors duration-1000 ${isHealthy ? 'bg-green-500' : 'bg-red-600'}`}></div>

        <div className="z-10 flex flex-col h-full max-w-2xl mx-auto w-full">
            
            {/* Header Status */}
            <div className="mb-10 flex items-center justify-between">
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
            <div className="flex-1 flex flex-col justify-center">
                
                {isHealthy && (
                    <div className="text-center space-y-6 animate-in fade-in duration-700">
                        <div className="relative inline-block">
                             <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full animate-pulse-soft"></div>
                             <Activity size={80} className="text-green-500 relative z-10 mx-auto" />
                        </div>
                        <h3 className="text-3xl font-light text-slate-200">Monitoring Active</h3>
                        <p className="text-slate-500 max-w-md mx-auto">
                            KubeSentinel is analyzing log streams in real-time. No anomalies detected in the last 5 minutes.
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
                     <div className="text-center space-y-6 animate-in fade-in zoom-in duration-300">
                        <Loader2 size={64} className="text-blue-500 animate-spin mx-auto" />
                        <h3 className="text-2xl font-bold text-blue-400">Analyzing Telemetry...</h3>
                        <p className="text-slate-400">Correlating log patterns with known failure modes.</p>
                     </div>
                )}

                {(isDetected || isRemediating) && proposal && (
                    <div className="w-full bg-slate-900 border border-red-500/30 rounded-lg overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-500">
                        <div className="bg-red-500/10 p-4 border-b border-red-500/20 flex items-center gap-3">
                            <ShieldAlert className="text-red-500" />
                            <span className="font-bold text-red-400">INCIDENT REPORT GENERATED</span>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            <div>
                                <h4 className="text-slate-400 text-sm uppercase tracking-wider mb-2">Root Cause Analysis</h4>
                                <p className="text-slate-200 text-lg leading-relaxed">
                                    {proposal.reason}
                                </p>
                            </div>

                            <div className="bg-slate-950 rounded border border-slate-800 p-4">
                                <h4 className="text-blue-400 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Server size={16} /> Proposed Remediation
                                </h4>
                                <div className="font-mono text-sm space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Tool:</span>
                                        <span className="text-yellow-400">{proposal.toolName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Target Namespace:</span>
                                        <span className="text-slate-300">{proposal.args.namespace || 'default'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Target Deployment:</span>
                                        <span className="text-slate-300">{proposal.args.deployment}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Action:</span>
                                        <span className="text-green-400">Scale to {proposal.args.replicas} Replicas</span>
                                    </div>
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
                                    <span className="font-bold">Executing Remediation Plan...</span>
                                </div>
                             </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-slate-600 text-xs font-mono">
                KubeSentinel v2.5.0 • Connected to cluster: production-us-east-1
            </div>
        </div>
    </div>
  );
};