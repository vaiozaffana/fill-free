import React from 'react';

export type Status = 'idle' | 'success' | 'error';

interface StatusBadgeProps {
  status: Status;
  message: string;
}

const COLORS: Record<Status, string> = {
  success: '#2e7d32',
  error: '#c62828',
  idle: '#666',
};

export function StatusBadge({ status, message }: StatusBadgeProps): React.JSX.Element {
  return (
    <p className="status-badge" style={{ color: COLORS[status] }}>
      {message}
    </p>
  );
}
