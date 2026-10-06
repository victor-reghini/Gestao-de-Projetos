import React, { useState, useEffect } from 'react';
import { RealtimeSyncService } from '@/services/realtimeSyncService';
import { CloudSqlService } from '@/services/cloudSqlService';
import { SyncValidationStatus } from '@/types';
import { SyncModal } from './SyncModal';

interface SyncStatusIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ 
  className = '',
  showLabel = false
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cloudSqlConnected, setCloudSqlConnected] = useState<boolean | null>(null);
  const [rtdbStatus, setRtdbStatus] = useState<SyncValidationStatus>(() => 
    RealtimeSyncService.getCurrentStatus()
  );

  const checkCloudSql = async () => {
    try {
      const status = await CloudSqlService.getStatus();
      setCloudSqlConnected(status.connected);
    } catch {
      setCloudSqlConnected(false);
    }
  };

  useEffect(() => {
    checkCloudSql();

    // Re-check periodically and on window focus/online
    const interval = setInterval(checkCloudSql, 45000);
    const handleOnline = () => checkCloudSql();
    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleOnline);

    const unsubscribe = RealtimeSyncService.subscribeSyncStatus((status) => {
      setRtdbStatus(status);
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleOnline);
      unsubscribe();
    };
  }, []);

  // Compute status color
  // 🟢 Green: Cloud SQL connected & RTDB synced & no pending local changes
  // 🟡 Orange: Syncing in progress, slow connection, or pending local changes
  // 🔴 Red: Cloud SQL disconnected, browser offline, or auth error
  let statusType: 'green' | 'orange' | 'red' = 'green';
  let tooltip = 'Banco de Dados Sincronizado (Google Cloud SQL & Realtime DB)';

  if (rtdbStatus.state === 'offline' || cloudSqlConnected === false) {
    statusType = 'red';
    tooltip = cloudSqlConnected === false 
      ? 'Cloud SQL Desconectado - Clique para sincronizar'
      : 'Modo Offline - Dados salvos no navegador';
  } else if (
    rtdbStatus.state === 'syncing' || 
    rtdbStatus.state === 'slow_connection' || 
    rtdbStatus.pendingChangesCount > 0 ||
    cloudSqlConnected === null
  ) {
    statusType = 'orange';
    tooltip = rtdbStatus.pendingChangesCount > 0 
      ? `${rtdbStatus.pendingChangesCount} alteração(ões) pendente(s) - Clique para sincronizar`
      : 'Sincronizando com o banco de dados...';
  }

  useEffect(() => {
    RealtimeSyncService.updateFavicon(statusType);
  }, [statusType]);

  const colorStyles = {
    green: {
      dot: 'bg-emerald-400',
      glow: 'shadow-[0_0_8px_rgba(52,211,153,0.7)]',
      border: 'border-emerald-500/40 hover:border-emerald-400',
      bg: 'hover:bg-emerald-500/10',
      text: 'text-emerald-400'
    },
    orange: {
      dot: 'bg-amber-400 animate-pulse',
      glow: 'shadow-[0_0_8px_rgba(251,191,36,0.7)]',
      border: 'border-amber-500/40 hover:border-amber-400',
      bg: 'hover:bg-amber-500/10',
      text: 'text-amber-400'
    },
    red: {
      dot: 'bg-rose-500',
      glow: 'shadow-[0_0_8px_rgba(244,63,94,0.7)]',
      border: 'border-rose-500/40 hover:border-rose-400',
      bg: 'hover:bg-rose-500/10',
      text: 'text-rose-400'
    }
  }[statusType];

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        title={tooltip}
        aria-label={tooltip}
        className={`relative inline-flex items-center justify-center p-1.5 rounded-full border transition-all duration-200 cursor-pointer ${colorStyles.border} ${colorStyles.bg} ${className}`}
      >
        <span className={`w-2.5 h-2.5 rounded-full ${colorStyles.dot} ${colorStyles.glow}`} />
        {showLabel && (
          <span className={`ml-2 text-xs font-medium ${colorStyles.text}`}>
            {statusType === 'green' ? 'Conectado' : statusType === 'orange' ? 'Sincronizando' : 'Offline'}
          </span>
        )}
      </button>

      {isModalOpen && (
        <SyncModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSyncSuccess={() => {
            checkCloudSql();
          }}
        />
      )}
    </>
  );
};
