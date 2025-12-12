import React, { useState } from 'react';
import { Incident, IncidentStatus } from '../types';
import { 
  CheckCircle2, XCircle, Clock, AlertTriangle, 
  Brain, Play, XOctagon, ChevronRight, Terminal,
  ChevronDown, ChevronUp, AlertOctagon
} from 'lucide-react';

interface IncidentDashboardProps {
  incidents: Incident[];
  onApprove: (id: string) => void;
  onIgnore: (id: string) => void;
}

export const IncidentDashboard: React.FC<IncidentDashboardProps> = ({ 
  incidents, 
  onApprove, 
  onIgnore 
}) => {
  // Sort incidents by newness
  const sortedIncidents = [...incidents].reverse();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (sortedIncidents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 bg-slate-950">
        <CheckCircle2 size={64} className="mb-4 text-green-500/50" />
        <h2 className="text-xl font-semibold">No Incidents Recorded</h2>
        <p>System is running smoothly.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-6">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
        <Clock className="text-blue-400" />
        Incident History
        <span className="text-sm font-normal text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
          {incidents.length} Events
        </span>
      </h2>

      <div className="space-y-3">
        {sortedIncidents.map((incident) => {
          const isExpanded = expandedId === incident.id;
          const isPending = incident.status === IncidentStatus.PENDING || incident.status === IncidentStatus.ANALYZING;
          
          return (
            <div 
              key={incident.id} 
              className={`border rounded-lg overflow-hidden transition-all duration-300 ${
                isPending
                  ? 'bg-slate-900/40 border-slate-700'
                  : incident.status === IncidentStatus.RESOLVED
                  ? 'bg-green-950/10 border-green-900/30'
                  : incident.status === IncidentStatus.IGNORED
                  ? 'bg-slate-900/30 border-slate-800 opacity-60'
                  : 'bg-slate-900 border-red-500/30'
              }`}
            >
              {/* Compact Header */}
              <div 
                onClick={() => toggleExpand(incident.id)}
                className={`p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors ${isExpanded ? 'bg-black/20 border-b border-slate-800' : ''}`}
              >
                <div className="flex items-center gap-4 flex-1 overflow-hidden">
                  <div className={`p-1.5 rounded-md shrink-0 ${
                    incident.status === IncidentStatus.RESOLVED ? 'text-green-400 bg-green-400/10' :
                    incident.status === IncidentStatus.IGNORED ? 'text-slate-400 bg-slate-400/10' :
                    isPending ? 'text-blue-400 bg-blue-400/10' :
                    'text-red-400 bg-red-400/10'
                  }`}>
                    {isPending ? <ActivityIcon className="animate-pulse" /> : <AlertTriangle size={18} />}
                  </div>
                  
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-0.5">
                       <span>{incident.timestamp.split('T')[1].split('.')[0]}</span>
                       <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                       <span className="text-blue-400">{incident.triggerLog.pod}</span>
                       <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                       <span className={`uppercase font-bold ${
                         incident.status === IncidentStatus.RESOLVED ? 'text-green-500' :
                         incident.status === IncidentStatus.ANALYZED ? 'text-red-500' :
                         'text-slate-500'
                       }`}>{incident.status}</span>
                    </div>
                    <div className="font-medium text-slate-200 truncate pr-4 text-sm md:text-base">
                      {incident.triggerLog.message}
                    </div>
                  </div>
                </div>

                <div className="text-slate-500 shrink-0 ml-2">
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="p-4 bg-black/10 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex flex-col gap-4">
                    
                    {/* Log Context */}
                    <div className="bg-black/30 rounded border border-slate-800/50 p-3">
                      <div className="text-xs text-slate-500 mb-2 flex items-center gap-2 uppercase tracking-wider font-bold">
                        <Terminal size={12} /> Recent Logs
                      </div>
                      <div className="font-mono text-xs space-y-1 text-slate-400 max-h-32 overflow-y-auto">
                        {incident.contextLogs.slice(-5).map(log => (
                          <div key={log.id} className="flex gap-2 opacity-80">
                            <span className="text-slate-600 shrink-0">{log.timestamp.split('T')[1].slice(0,8)}</span>
                            <span className={log.level === 'ERROR' ? 'text-red-400' : ''}>
                              {log.message}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* AI Analysis */}
                    {(incident.proposal || incident.thinking) ? (
                      <div className="space-y-3">
                        {incident.thinking && (
                          <div className="text-xs text-slate-500 bg-purple-900/5 border border-purple-500/10 p-3 rounded">
                            <div className="flex items-center gap-2 mb-1 text-purple-400 font-semibold">
                              <Brain size={12} /> Analysis Reasoning
                            </div>
                            <p className="opacity-70 leading-relaxed">
                              {incident.thinking.replace(/<think>|<\/think>/g, '')}
                            </p>
                          </div>
                        )}
                        
                        {incident.proposal && (
                          <div className="bg-slate-800/40 p-3 rounded border border-slate-700/50">
                            <div className="flex items-start gap-3">
                              <div className="mt-1">
                                <AlertOctagon size={16} className="text-red-400" />
                              </div>
                              <div className="flex-1">
                                <h4 className="text-sm font-semibold text-slate-200">Suggested Remediation</h4>
                                <p className="text-sm text-slate-400 mt-1 mb-2">{incident.proposal.reason}</p>
                                <div className="flex items-center gap-2 bg-slate-950 p-2 rounded border border-slate-800 font-mono text-xs text-green-400">
                                  <ChevronRight size={14} />
                                  {incident.proposal.toolName} ({JSON.stringify(incident.proposal.args)})
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      isPending && (
                        <div className="flex items-center gap-3 text-slate-500 text-sm py-2 italic bg-slate-900/50 p-3 rounded border border-slate-800 border-dashed">
                           <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                           AI is analyzing this incident...
                        </div>
                      )
                    )}

                    {/* Action Buttons */}
                    {incident.status === IncidentStatus.ANALYZED && (
                      <div className="pt-2 flex gap-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); onApprove(incident.id); }}
                          className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 px-3 rounded text-sm font-bold shadow-lg shadow-green-900/20 transition-all flex items-center justify-center gap-2"
                        >
                          <Play size={16} /> Execute Fix
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onIgnore(incident.id); }}
                          className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 px-3 rounded text-sm font-bold border border-slate-700 transition-all flex items-center justify-center gap-2"
                        >
                          <XOctagon size={16} /> Ignore
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ActivityIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);