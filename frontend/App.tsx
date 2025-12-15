import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LogTerminal } from './components/LogTerminal';
import { SystemMonitor } from './components/IncidentPanel';
import { IncidentDashboard } from './components/IncidentDashboard';
import { LogEntry, SystemStatus, IncidentToolCall, Incident, IncidentStatus, LogLevel } from './types';
import { generateLog } from './services/logGenerator';
import { analyzeLogsStreaming } from './services/api';
import { LayoutDashboard, Activity, TerminalSquare, Pause, Play } from 'lucide-react';

const App: React.FC = () => {
  // --- State ---
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>(SystemStatus.HEALTHY);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  
  // Queue Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [llmMetrics, setLlmMetrics] = useState({ tps: 0, latency: 0 });

  // Navigation State
  const [currentView, setCurrentView] = useState<'monitor' | 'dashboard'>('monitor');
  const [isTerminalPaused, setIsTerminalPaused] = useState(false);
  const [isLogGenPaused, setIsLogGenPaused] = useState(false);

  // --- Refs ---
  const intervalRef = useRef<number | null>(null);
  const logsRef = useRef<LogEntry[]>([]);

  // Keep ref synced for callbacks
  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  // --- Logic: Queue Processing ---
  useEffect(() => {
    const processQueue = async () => {
      // If already processing, do nothing.
      if (isProcessing) return;

      // Find the oldest pending incident (FIFO)
      const pendingIncident = incidents.find(i => i.status === IncidentStatus.PENDING);
      
      if (pendingIncident) {
        setIsProcessing(true);
        const startTime = Date.now();

        // Update status to analyzing
        setIncidents(prev => prev.map(i => 
          i.id === pendingIncident.id ? { ...i, status: IncidentStatus.ANALYZING } : i
        ));
        
        // Update global status for UI feedback
        setSystemStatus(prev => prev === SystemStatus.INCIDENT_DETECTED ? prev : SystemStatus.ANALYZING);

        let thinkingBuffer = '';
        let contentBuffer = '';
        let tokenCount = 0;

        // Simulate TPS calculation
        const tpsInterval = setInterval(() => {
          const elapsed = (Date.now() - startTime) / 1000;
          if (elapsed > 0) {
            setLlmMetrics(prev => ({ ...prev, tps: Math.floor(tokenCount / elapsed) + Math.floor(Math.random() * 5) }));
          }
        }, 1000);

        try {
          await analyzeLogsStreaming(pendingIncident.contextLogs, {
            onThinking: (chunk) => {
              thinkingBuffer += chunk;
              tokenCount += chunk.split(' ').length; // Rough token estimation
              setIncidents(prev => prev.map(i => 
                i.id === pendingIncident.id ? { ...i, thinking: thinkingBuffer } : i
              ));
            },
            onContent: (chunk) => {
              contentBuffer += chunk;
              tokenCount += chunk.split(' ').length;
              setIncidents(prev => prev.map(i => 
                 i.id === pendingIncident.id ? { ...i, analysis: contentBuffer } : i
              ));
            },
            onDone: (proposal) => {
              clearInterval(tpsInterval);
              setLlmMetrics({ tps: 0, latency: Date.now() - startTime });
              
              setIncidents(prev => prev.map(i => 
                i.id === pendingIncident.id ? { 
                  ...i, 
                  status: IncidentStatus.ANALYZED, 
                  proposal,
                  thinking: thinkingBuffer,
                  analysis: contentBuffer
                } : i
              ));
              
              setSystemStatus(SystemStatus.INCIDENT_DETECTED);
              setIsProcessing(false); // Trigger effect to look for next item
            },
            onError: (error) => {
              clearInterval(tpsInterval);
              setLlmMetrics({ tps: 0, latency: 0 });
              console.error('Analysis failed', error);
              
              setIncidents(prev => prev.map(i => 
                i.id === pendingIncident.id ? { 
                  ...i, 
                  status: IncidentStatus.ANALYZED,
                  proposal: {
                    toolName: 'restart_pod',
                    args: { pod: i.triggerLog.pod, namespace: 'default' },
                    reason: 'Automated fallback: Analysis failed but error persists.'
                  },
                  analysis: 'Analysis failed. Showing fallback.'
                } : i
              ));
              
              setSystemStatus(SystemStatus.INCIDENT_DETECTED);
              setIsProcessing(false); // Trigger effect to look for next item
            }
          });
        } catch (e) {
          clearInterval(tpsInterval);
          console.error("Queue processing error", e);
          setIsProcessing(false);
        }
      }
    };

    processQueue();
  }, [incidents, isProcessing]);

  // --- Logic: Log Generation ---
  const handleCriticalLog = useCallback((log: LogEntry) => {
    // Take a snapshot of recent logs including the critical one
    const contextLogs = [...logsRef.current.slice(-15), log];
    
    const newIncident: Incident = {
      id: Math.random().toString(36).substring(7),
      timestamp: log.timestamp,
      triggerLog: log,
      contextLogs: contextLogs,
      status: IncidentStatus.PENDING
    };

    setIncidents(prev => [...prev, newIncident]);
  }, []);

  const startLogStream = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    if (isLogGenPaused) return;

    intervalRef.current = window.setInterval(() => {
      // 2% Chance of critical error
      const shouldTriggerError = Math.random() < 0.02;
      const newLog = generateLog(shouldTriggerError);

      // Add to logs state
      setLogs(prev => {
        const updated = [...prev, newLog];
        return updated.length > 500 ? updated.slice(-500) : updated;
      });

      if (newLog.level === LogLevel.ERROR) {
        handleCriticalLog(newLog);
      }

    }, 800); 
  }, [handleCriticalLog, isLogGenPaused]);

  useEffect(() => {
    startLogStream();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startLogStream]);


  // --- Logic: Actions ---
  const handleApprove = (incidentId: string) => {
    setSystemStatus(SystemStatus.REMEDIATING);
    
    const incident = incidents.find(i => i.id === incidentId);
    if (!incident || !incident.proposal) return;

    // Simulate execution time
    setTimeout(() => {
        const successLog: LogEntry = {
            id: Math.random().toString(),
            timestamp: new Date().toISOString(),
            level: 'INFO' as any,
            pod: 'kube-controller',
            message: `Executed ${incident.proposal?.toolName}. Status: Healthy.`
        };

        setLogs(prev => [...prev, successLog]);
        
        // Update incident status
        setIncidents(prev => prev.map(i => 
          i.id === incidentId ? { ...i, status: IncidentStatus.RESOLVED } : i
        ));
        
        // Check if there are other analyzed incidents waiting
        const remainingAnalyzed = incidents.filter(i => 
          i.id !== incidentId && i.status === IncidentStatus.ANALYZED
        );
        
        if (remainingAnalyzed.length > 0) {
           setSystemStatus(SystemStatus.INCIDENT_DETECTED);
        } else {
           setSystemStatus(SystemStatus.HEALTHY);
        }
    }, 2000);
  };

  const handleIgnore = (incidentId: string) => {
    setIncidents(prev => prev.map(i => 
      i.id === incidentId ? { ...i, status: IncidentStatus.IGNORED } : i
    ));
    
    const remainingAnalyzed = incidents.filter(i => 
      i.id !== incidentId && i.status === IncidentStatus.ANALYZED
    );

    if (remainingAnalyzed.length === 0) {
      setSystemStatus(SystemStatus.HEALTHY);
    }
  };

  // Find active processing incident for live view
  const activeProcessingIncident = incidents.find(i => i.status === IncidentStatus.ANALYZING);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 overflow-hidden font-sans">
      
      {/* Navigation Bar */}
      <nav className="h-14 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
             <TerminalSquare className="text-white" size={20} />
           </div>
           <h1 className="text-white font-bold tracking-tight text-lg">KubeSentinel <span className="text-blue-500 text-xs uppercase tracking-wider ml-1">AI Ops</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
           {/* Log Controls */}
           <button 
             onClick={() => setIsLogGenPaused(!isLogGenPaused)}
             className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all border ${
               isLogGenPaused 
                 ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20'
                 : 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20'
             }`}
           >
             {isLogGenPaused ? <Play size={12} fill="currentColor" /> : <Pause size={12} fill="currentColor" />}
             {isLogGenPaused ? 'Resume Logs' : 'Pause Logs'}
           </button>

           <div className="h-6 w-px bg-slate-800"></div>

           <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
             <button 
               onClick={() => setCurrentView('monitor')}
               className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                 currentView === 'monitor' 
                   ? 'bg-slate-800 text-white shadow-sm' 
                   : 'text-slate-400 hover:text-slate-200'
               }`}
             >
               <Activity size={16} /> Live Monitor
             </button>
             <button 
               onClick={() => setCurrentView('dashboard')}
               className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                 currentView === 'dashboard' 
                   ? 'bg-slate-800 text-white shadow-sm' 
                   : 'text-slate-400 hover:text-slate-200'
               }`}
             >
               <LayoutDashboard size={16} /> 
               Incidents 
               {incidents.filter(i => i.status === IncidentStatus.ANALYZED).length > 0 && (
                 <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full min-w-[1.25rem] text-center">
                   {incidents.filter(i => i.status === IncidentStatus.ANALYZED).length}
                 </span>
               )}
             </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative">
        
        {/* Monitor View */}
        <div className={`absolute inset-0 flex flex-col md:flex-row transition-opacity duration-300 ${currentView === 'monitor' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          {/* Left: Terminal */}
          <div className="w-full md:w-1/2 h-1/2 md:h-full border-b md:border-b-0 md:border-r border-slate-800 flex flex-col">
            <div className="p-2 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                <span className="text-xs text-slate-500 font-mono pl-2">
                   {isLogGenPaused ? 'LOG STREAM PAUSED' : 'STREAMING...'}
                </span>
                <button 
                   onClick={() => setIsTerminalPaused(!isTerminalPaused)}
                   className={`text-xs uppercase font-mono px-2 py-1 rounded ${isTerminalPaused ? 'bg-white text-black' : 'text-slate-400 hover:text-white'}`}
                >
                  {isTerminalPaused ? 'Scroll Locked' : 'Auto-Scroll'}
                </button>
            </div>
            <div className="flex-1 overflow-hidden relative">
               <LogTerminal
                   logs={logs}
                   isPaused={isTerminalPaused}
               />
               {isLogGenPaused && (
                 <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
                    <div className="bg-slate-900 border border-slate-700 px-4 py-2 rounded-lg text-slate-400 text-sm shadow-xl flex items-center gap-2">
                      <Pause size={14} /> Generator Paused
                    </div>
                 </div>
               )}
            </div>
          </div>

          {/* Right: System Monitor */}
          <div className="w-full md:w-1/2 h-1/2 md:h-full bg-slate-950">
             <SystemMonitor
                 status={systemStatus}
                 queueLength={incidents.filter(i => i.status === IncidentStatus.PENDING).length}
                 analyzedCount={incidents.filter(i => i.status === IncidentStatus.ANALYZED).length}
                 isAnalyzing={isProcessing}
                 currentAnalysis={
                    activeProcessingIncident 
                    ? (activeProcessingIncident.thinking || activeProcessingIncident.analysis || '') 
                    : ''
                 }
                 tps={llmMetrics.tps}
                 latency={llmMetrics.latency}
             />
          </div>
        </div>

        {/* Dashboard View */}
        <div className={`absolute inset-0 bg-slate-950 transition-opacity duration-300 ${currentView === 'dashboard' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
           <IncidentDashboard 
              incidents={incidents}
              onApprove={handleApprove}
              onIgnore={handleIgnore}
           />
        </div>

      </div>
    </div>
  );
};

export default App;