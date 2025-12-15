import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LogTerminal } from './components/LogTerminal';
import { SystemMonitor } from './components/IncidentPanel';
import { IncidentDashboard } from './components/IncidentDashboard';
import { Settings } from './components/Settings';
import { AppSidebar } from './components/AppSidebar';
import { SidebarProvider, SidebarInset } from './components/ui/sidebar';
import { LogEntry, SystemStatus, Incident, IncidentStatus, LogLevel } from './types';
import { generateLog } from './services/logGenerator';
import { analyzeLogsStreaming } from './services/api';
import { Pause, Play } from 'lucide-react';

const App: React.FC = () => {
  // --- State ---
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>(SystemStatus.HEALTHY);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  // Queue Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [llmMetrics, setLlmMetrics] = useState({ tps: 0, latency: 0 });

  // Navigation State
  const [currentView, setCurrentView] = useState<'monitor' | 'dashboard' | 'settings'>('monitor');
  const [isTerminalPaused, setIsTerminalPaused] = useState(false);
  const [isLogGenPaused, setIsLogGenPaused] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Settings State
  const [logContextSize, setLogContextSize] = useState(() => {
    const saved = localStorage.getItem('logContextSize');
    return saved ? parseInt(saved) : 15;
  });
  const [logGenerationInterval, setLogGenerationInterval] = useState(() => {
    const saved = localStorage.getItem('logGenerationInterval');
    return saved ? parseInt(saved) : 800;
  });
  const [currentModel, setCurrentModel] = useState(() => {
    return localStorage.getItem('selected_model') || '';
  });

  // --- Refs ---
  const intervalRef = useRef<number | null>(null);
  const logsRef = useRef<LogEntry[]>([]);

  // Keep ref synced for callbacks
  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  // Fetch current model name on mount
  useEffect(() => {
    const fetchModelName = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/health`);
        if (response.ok) {
          const data = await response.json();
          if (data.model) {
            setCurrentModel(data.model);
            localStorage.setItem('selected_model', data.model);
          }
        }
      } catch (error) {
        console.error('Failed to fetch model name:', error);
      }
    };
    fetchModelName();
  }, []);

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
    const contextLogs = [...logsRef.current.slice(-logContextSize), log];

    const newIncident: Incident = {
      id: Math.random().toString(36).substring(7),
      timestamp: log.timestamp,
      triggerLog: log,
      contextLogs: contextLogs,
      status: IncidentStatus.PENDING
    };

    setIncidents(prev => [...prev, newIncident]);
  }, [logContextSize]);

  const startLogStream = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (isLogGenPaused) return;

    intervalRef.current = window.setInterval(() => {
      // 2% Chance of critical error
      const shouldTriggerError = Math.random() < 0.1;
      const newLog = generateLog(shouldTriggerError);

      // Add to logs state
      setLogs(prev => {
        const updated = [...prev, newLog];
        return updated.length > 500 ? updated.slice(-500) : updated;
      });

      if (newLog.level === LogLevel.ERROR) {
        handleCriticalLog(newLog);
      }

    }, logGenerationInterval);
  }, [handleCriticalLog, isLogGenPaused, logGenerationInterval]);

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

  // Dark mode toggle
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  // Settings handlers
  const handleLogContextSizeChange = (size: number) => {
    setLogContextSize(size);
    localStorage.setItem('logContextSize', size.toString());
  };

  const handleLogGenerationIntervalChange = (interval: number) => {
    setLogGenerationInterval(interval);
    localStorage.setItem('logGenerationInterval', interval.toString());
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'monitor': return 'Live Monitor';
      case 'dashboard': return 'Incident Dashboard';
      case 'settings': return 'Settings';
      default: return '';
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        analyzedCount={incidents.filter(i => i.status === IncidentStatus.ANALYZED).length}
      />
      <SidebarInset>
        {/* Header Bar */}
        <header className="h-14 border-b border-border bg-card/50 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-foreground font-semibold text-base">
              {getViewTitle()}
            </h2>
          </div>

          {currentView !== 'settings' && (
            <div className="flex items-center gap-3">
              {/* Log Controls */}
              <button
                onClick={() => setIsLogGenPaused(!isLogGenPaused)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all border h-9 shadow-xs ${
                  isLogGenPaused
                    ? 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20'
                    : 'bg-success/10 text-success border-success/20 hover:bg-success/20'
                }`}
              >
                {isLogGenPaused ? <Play size={12} fill="currentColor" /> : <Pause size={12} fill="currentColor" />}
                {isLogGenPaused ? 'Resume' : 'Pause'}
              </button>
            </div>
          )}
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden relative bg-background">

          {/* Monitor View */}
          <div className={`absolute inset-0 flex flex-col md:flex-row transition-opacity duration-300 ${currentView === 'monitor' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            {/* Left: Terminal */}
            <div className="w-full md:w-1/2 h-1/2 md:h-full border-b md:border-b-0 md:border-r border-border flex flex-col">
              <div className="p-2 bg-card border-b border-border flex justify-between items-center">
                  <span className="text-xs text-muted-foreground font-mono pl-2">
                     {isLogGenPaused ? 'LOG STREAM PAUSED' : 'STREAMING...'}
                  </span>
                  <button
                     onClick={() => setIsTerminalPaused(!isTerminalPaused)}
                     className={`text-xs uppercase font-mono px-2 py-1 rounded h-9 ${isTerminalPaused ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
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
                      <div className="bg-card border border-border px-4 py-2 rounded-lg text-muted-foreground text-sm shadow-xl flex items-center gap-2">
                        <Pause size={14} /> Generator Paused
                      </div>
                   </div>
                 )}
              </div>
            </div>

            {/* Right: System Monitor */}
            <div className="w-full md:w-1/2 h-1/2 md:h-full bg-background">
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
                   modelName={currentModel}
               />
            </div>
          </div>

          {/* Dashboard View */}
          <div className={`absolute inset-0 transition-opacity duration-300 ${currentView === 'dashboard' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
             <IncidentDashboard
                incidents={incidents}
                onApprove={handleApprove}
                onIgnore={handleIgnore}
             />
          </div>

          {/* Settings View */}
          <div className={`absolute inset-0 transition-opacity duration-300 ${currentView === 'settings' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
             <Settings
                isDarkMode={isDarkMode}
                onToggleDarkMode={toggleDarkMode}
                logContextSize={logContextSize}
                onLogContextSizeChange={handleLogContextSizeChange}
                logGenerationInterval={logGenerationInterval}
                onLogGenerationIntervalChange={handleLogGenerationIntervalChange}
             />
          </div>

        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default App;