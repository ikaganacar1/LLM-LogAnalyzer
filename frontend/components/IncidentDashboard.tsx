import React from 'react';
import { Incident } from '../types';
import { IncidentTable } from './IncidentTable';

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
  return (
    <IncidentTable
      incidents={incidents}
      onApprove={onApprove}
      onIgnore={onIgnore}
    />
  );
};