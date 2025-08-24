
import React from 'react';
import type { ConnectionStatus } from '../types';

interface StatusIndicatorProps {
  status: ConnectionStatus;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'connected':
        return { color: 'bg-green-500', text: 'Connected' };
      case 'connecting':
        return { color: 'bg-yellow-500 animate-pulse', text: 'Connecting...' };
      case 'error':
        return { color: 'bg-red-500', text: 'Error' };
      case 'disconnected':
      default:
        return { color: 'bg-gray-500', text: 'Disconnected' };
    }
  };

  const { color, text } = getStatusInfo();

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-3 h-3 rounded-full ${color}`}></div>
      <span className="text-sm font-medium text-gray-300">{text}</span>
    </div>
  );
};

export default StatusIndicator;
