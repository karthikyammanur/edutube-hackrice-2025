import React from 'react';
import { checkBackendHealth } from '../lib/utils';

export function BackendStatus(): JSX.Element {
  const [status, setStatus] = React.useState<{
    healthy: boolean;
    message: string;
    checking: boolean;
  }>({ healthy: true, message: 'Connecting...', checking: true });

  React.useEffect(() => {
    async function checkStatus() {
      try {
        const health = await checkBackendHealth();
        setStatus({
          healthy: health.healthy,
          message: health.message,
          checking: false,
        });
      } catch (error) {
        setStatus({
          healthy: false,
          message: 'Failed to connect to backend',
          checking: false,
        });
      }
    }

    checkStatus();
    
    // Check every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (status.checking || status.healthy) {
    return <></>; // Don't show while checking or when healthy
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        <span className="text-red-700 font-medium">Backend Connection Issue</span>
      </div>
      <p className="text-red-600 mt-1">{status.message}</p>
      <p className="text-red-500 text-xs mt-1">
        Make sure the API server is running on localhost:3000
      </p>
    </div>
  );
}

export function ConnectionIndicator(): JSX.Element {
  const [status, setStatus] = React.useState<{
    healthy: boolean;
    checking: boolean;
  }>({ healthy: true, checking: true });

  React.useEffect(() => {
    async function checkStatus() {
      try {
        const health = await checkBackendHealth();
        setStatus({ healthy: health.healthy, checking: false });
      } catch (error) {
        setStatus({ healthy: false, checking: false });
      }
    }

    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  if (status.checking) {
    return (
      <div className="flex items-center gap-1 text-xs text-slate-500">
        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse"></div>
        <span>Connecting...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-xs text-slate-500">
      <div className={`w-1.5 h-1.5 rounded-full ${status.healthy ? 'bg-green-500' : 'bg-red-500'}`}></div>
      <span>{status.healthy ? 'Connected' : 'Disconnected'}</span>
    </div>
  );
}