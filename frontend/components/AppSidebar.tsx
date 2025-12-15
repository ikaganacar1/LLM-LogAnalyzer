import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from './ui/sidebar';
import { Activity, LayoutDashboard, TerminalSquare, Settings, Sparkles } from 'lucide-react';

interface AppSidebarProps {
  currentView: 'monitor' | 'dashboard' | 'settings';
  onViewChange: (view: 'monitor' | 'dashboard' | 'settings') => void;
  analyzedCount: number;
}

export function AppSidebar({ currentView, onViewChange, analyzedCount }: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
            <Sparkles className="text-primary-foreground" size={20} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sidebar-foreground font-bold tracking-tight text-base">AI Log Analyzer</h1>
            <span className="text-sidebar-foreground/60 text-[10px] uppercase tracking-wider font-semibold">POC</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={currentView === 'monitor'}
                  onClick={() => onViewChange('monitor')}
                >
                  <Activity size={16} />
                  <span>Live Monitor</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={currentView === 'dashboard'}
                  onClick={() => onViewChange('dashboard')}
                >
                  <LayoutDashboard size={16} />
                  <span>Incidents</span>
                  {analyzedCount > 0 && (
                    <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center font-bold">
                      {analyzedCount}
                    </span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={currentView === 'settings'}
                  onClick={() => onViewChange('settings')}
                >
                  <Settings size={16} />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with signature */}
      <div className="mt-auto p-4 border-t border-sidebar-border">
        <p className="text-[10px] text-sidebar-foreground/60 text-center">
          Made by <span className="font-semibold text-primary">ika</span>
        </p>
      </div>
    </Sidebar>
  );
}
