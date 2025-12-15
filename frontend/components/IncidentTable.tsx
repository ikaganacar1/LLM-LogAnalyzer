import React, { useState } from 'react';
import { Incident, IncidentStatus } from '../types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Brain,
  Play,
  XOctagon,
  ChevronDown,
  Terminal,
  AlertOctagon,
  ChevronRight,
  Loader2,
  Ban,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface IncidentTableProps {
  incidents: Incident[];
  onApprove: (id: string) => void;
  onIgnore: (id: string) => void;
}

export const IncidentTable: React.FC<IncidentTableProps> = ({
  incidents,
  onApprove,
  onIgnore,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Sort incidents by timestamp (newest first)
  const sortedIncidents = [...incidents].reverse();

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case IncidentStatus.RESOLVED:
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 size={12} />
            Fixed
          </Badge>
        );
      case IncidentStatus.ANALYZED:
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle size={12} />
            Needs Action
          </Badge>
        );
      case IncidentStatus.ANALYZING:
        return (
          <Badge variant="default" className="gap-1">
            <Loader2 size={12} className="animate-spin" />
            Analyzing
          </Badge>
        );
      case IncidentStatus.PENDING:
        return (
          <Badge variant="warning" className="gap-1">
            <Clock size={12} />
            Pending
          </Badge>
        );
      case IncidentStatus.IGNORED:
        return (
          <Badge variant="outline" className="gap-1 opacity-60">
            <Ban size={12} />
            Ignored
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (sortedIncidents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <CheckCircle2 size={64} className="mb-4 text-success/50" />
        <h2 className="text-xl font-semibold text-foreground">No Incidents Recorded</h2>
        <p>System is running smoothly.</p>
      </div>
    );
  }

  // Count statistics
  const stats = {
    needsAction: incidents.filter(i => i.status === IncidentStatus.ANALYZED).length,
    fixed: incidents.filter(i => i.status === IncidentStatus.RESOLVED).length,
    pending: incidents.filter(i => i.status === IncidentStatus.PENDING || i.status === IncidentStatus.ANALYZING).length,
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Header with Stats */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-3">Incident Dashboard</h2>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-destructive"></div>
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{stats.needsAction}</span> Needs Action
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success"></div>
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{stats.fixed}</span> Fixed
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-warning"></div>
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{stats.pending}</span> Processing
            </span>
          </div>
          <div className="ml-auto text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{incidents.length}</span> incidents
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto border rounded-lg">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10">
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead className="w-[120px]">Time</TableHead>
              <TableHead className="w-[150px]">Pod</TableHead>
              <TableHead>Issue</TableHead>
              <TableHead className="w-[220px]">Proposed Fix</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[140px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedIncidents.map((incident) => {
              const isExpanded = expandedId === incident.id;
              const isPending = incident.status === IncidentStatus.PENDING || incident.status === IncidentStatus.ANALYZING;

              return (
                <React.Fragment key={incident.id}>
                  <TableRow
                    className={cn(
                      "cursor-pointer transition-colors",
                      isExpanded && "bg-muted/30",
                      incident.status === IncidentStatus.IGNORED && "opacity-50"
                    )}
                    onClick={() => toggleExpand(incident.id)}
                  >
                    <TableCell className="text-center">
                      <ChevronDown
                        size={16}
                        className={cn(
                          "transition-transform text-muted-foreground",
                          isExpanded && "rotate-180"
                        )}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatTime(incident.timestamp)}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-info">
                      {incident.triggerLog.pod}
                    </TableCell>
                    <TableCell className="font-medium text-foreground truncate max-w-md">
                      {incident.triggerLog.message}
                    </TableCell>
                    <TableCell>
                      {incident.proposal ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-mono text-primary font-semibold">
                            {incident.proposal.toolName}
                          </span>
                          <span className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">
                            {incident.proposal.reason.substring(0, 80)}...
                          </span>
                        </div>
                      ) : isPending ? (
                        <span className="text-xs text-muted-foreground italic">Analyzing...</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(incident.status)}</TableCell>
                    <TableCell className="text-right">
                      {incident.status === IncidentStatus.ANALYZED && (
                        <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => onApprove(incident.id)}
                            className="h-8 px-3 gap-1 hover:shadow-md hover:scale-105 transition-all"
                            title="Execute this fix"
                          >
                            <Play size={14} />
                            <span className="text-xs hidden sm:inline">Fix</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onIgnore(incident.id)}
                            className="h-8 px-3 gap-1 hover:bg-destructive/10 hover:border-destructive/50 hover:scale-105 transition-all"
                            title="Ignore this incident"
                          >
                            <XOctagon size={14} />
                            <span className="text-xs hidden sm:inline">Ignore</span>
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>

                  {/* Expanded Details Row */}
                  {isExpanded && (
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableCell colSpan={6} className="p-6">
                        <div className="space-y-4">
                          {/* Recent Logs */}
                          <div className="bg-card rounded-lg border border-border p-4">
                            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2 uppercase tracking-wider font-semibold">
                              <Terminal size={12} /> Recent Context Logs
                            </div>
                            <div className="font-mono text-xs space-y-1 text-muted-foreground max-h-32 overflow-y-auto">
                              {incident.contextLogs.slice(-5).map((log) => (
                                <div key={log.id} className="flex gap-2">
                                  <span className="text-muted-foreground/60 shrink-0">
                                    {log.timestamp.split('T')[1].slice(0, 8)}
                                  </span>
                                  <span
                                    className={
                                      log.level === 'ERROR' ? 'text-destructive font-semibold' : ''
                                    }
                                  >
                                    {log.message}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* AI Thinking/Reasoning */}
                          {incident.thinking && (
                            <div className="bg-purple-500/5 border border-purple-500/20 p-4 rounded-lg">
                              <div className="flex items-center gap-2 mb-2 text-purple-400 font-semibold text-sm">
                                <Brain size={14} /> AI Reasoning (Thinking)
                              </div>
                              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                                {incident.thinking.replace(/<think>|<\/think>/g, '')}
                              </p>
                            </div>
                          )}

                          {/* AI Analysis Output */}
                          {incident.analysis && (() => {
                            // Try to parse if it's JSON
                            try {
                              const parsed = JSON.parse(incident.analysis);
                              if (parsed.toolName && parsed.args && parsed.reason) {
                                // Display as structured proposal
                                return (
                                  <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-lg">
                                    <div className="flex items-center gap-2 mb-3 text-blue-400 font-semibold text-sm">
                                      <Brain size={14} /> AI Analysis Output
                                    </div>
                                    <div className="space-y-3">
                                      <div>
                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action:</span>
                                        <div className="mt-1 px-3 py-2 bg-background/50 rounded border border-border font-mono text-sm text-primary">
                                          {parsed.toolName}
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parameters:</span>
                                        <div className="mt-1 px-3 py-2 bg-background/50 rounded border border-border space-y-1">
                                          {Object.entries(parsed.args).map(([key, value]) => (
                                            <div key={key} className="flex gap-2 text-sm">
                                              <span className="font-mono text-info">{key}:</span>
                                              <span className="font-mono text-foreground">{String(value)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reasoning:</span>
                                        <p className="mt-1 text-sm text-foreground/90 leading-relaxed">
                                          {parsed.reason}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                            } catch (e) {
                              // Not JSON or invalid structure, display as text
                            }
                            // Display as regular text
                            return (
                              <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-lg">
                                <div className="flex items-center gap-2 mb-2 text-blue-400 font-semibold text-sm">
                                  <Brain size={14} /> AI Analysis Output
                                </div>
                                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                                  {incident.analysis}
                                </p>
                              </div>
                            );
                          })()}

                          {/* Proposed Solution */}
                          {incident.proposal && (
                            <div className="bg-card border border-border p-4 rounded-lg">
                              <div className="flex items-start gap-3">
                                <div className="mt-1">
                                  <AlertOctagon size={16} className="text-destructive" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="text-sm font-semibold text-foreground mb-1">
                                    Suggested Remediation
                                  </h4>
                                  <p className="text-sm text-muted-foreground mb-3">
                                    {incident.proposal.reason}
                                  </p>
                                  <div className="flex items-center gap-2 bg-background p-3 rounded border border-border font-mono text-xs text-success">
                                    <ChevronRight size={14} />
                                    {incident.proposal.toolName} (
                                    {JSON.stringify(incident.proposal.args)})
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons in Expanded View */}
                              {incident.status === IncidentStatus.ANALYZED && (
                                <div className="mt-4 flex gap-3">
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onApprove(incident.id);
                                    }}
                                    className="flex-1"
                                    variant="default"
                                  >
                                    <Play size={16} className="mr-2" /> Execute Fix
                                  </Button>
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onIgnore(incident.id);
                                    }}
                                    className="flex-1"
                                    variant="outline"
                                  >
                                    <XOctagon size={16} className="mr-2" /> Ignore
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Processing State */}
                          {isPending && !incident.proposal && (
                            <div className="flex items-center gap-3 text-muted-foreground text-sm py-3 italic bg-muted/30 p-4 rounded-lg border border-dashed border-border">
                              <Loader2 className="w-4 h-4 animate-spin text-info" />
                              AI is analyzing this incident...
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
