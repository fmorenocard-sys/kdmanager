import { useTranslation } from 'react-i18next';
import React, { useRef, useState } from 'react';
import { useData } from '../context/DataContext';
import { Upload, RefreshCw, FileSpreadsheet, CheckCircle, AlertCircle } from './ui/icons';
import { useRole, ROLES } from '../context/RoleContext';

const DataRefreshControl = () => {
    const { refreshData, triggerSync, loading, lastUpdated, error } = useData();
    const { t } = useTranslation();
    const { role } = useRole();
    const fileInputRef = useRef(null);
    const [uploadStatus, setUploadStatus] = useState('idle');

    const isAuthorized = [ROLES.KING].includes(role);

    const handleFile = async (file) => {
        if (!file || !isAuthorized) return;
        setUploadStatus('uploading');
        const success = await refreshData(file);
        setUploadStatus(success ? 'success' : 'error');
        setTimeout(() => setUploadStatus('idle'), 3000);
    };

    const onDrop = (e) => {
        e.preventDefault();
        if (isAuthorized && e.dataTransfer.files?.[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const statusIcon = uploadStatus === 'success'
        ? <CheckCircle size={18} className="text-green-400" />
        : uploadStatus === 'error'
            ? <AlertCircle size={18} className="text-red-400" />
            : <FileSpreadsheet size={18} className="text-slate-400" />;

    // Bandeau compact charte v2 (maquette Dashboard Home B — « dm identique à Bank »)
    return (
        <div
            className="v2-glass px-4 py-3 mb-6"
            onDragOver={(e) => isAuthorized && e.preventDefault()}
            onDrop={onDrop}
        >
            <div className="flex items-center gap-3.5 flex-wrap">
                <div className="w-10 h-10 rounded-[10px] bg-[var(--border-flat)] flex items-center justify-center flex-none">
                    {statusIcon}
                </div>
                <div className="min-w-0">
                    <p className="text-[13px] font-bold text-[var(--text-primary)] leading-tight">{t('datarefresh.title')}</p>
                    <p className="text-[11px] text-[var(--text-meta)] leading-tight truncate">
                        {loading
                            ? t('common.loading')
                            : lastUpdated
                                ? `${t('datarefresh.last_sync')}: ${lastUpdated.toLocaleTimeString()}`
                                : t('datarefresh.no_data')}
                    </p>
                </div>
                <div className="flex-1" />
                {loading && <RefreshCw size={14} className="animate-spin text-slate-500 flex-none" />}

                {/* Action buttons — only for authorized roles */}
                {isAuthorized && (
                    <div className="flex gap-2 w-full sm:w-auto">
                        {role === ROLES.KING && (
                            <button
                                onClick={async () => {
                                    setUploadStatus('uploading');
                                    const success = await triggerSync();
                                    setUploadStatus(success ? 'success' : 'error');
                                    setTimeout(() => setUploadStatus('idle'), 3000);
                                }}
                                disabled={loading}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 min-h-[44px] text-[13px] font-bold rounded-xl btn-grad-primary text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                                {loading ? t('datarefresh.syncing') : t('datarefresh.refresh')}
                            </button>
                        )}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 min-h-[44px] text-[13px] font-bold rounded-xl border border-[var(--border-flat)] bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-flat)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Upload size={16} />
                            {loading ? t('datarefresh.uploading') : t('datarefresh.upload_xlsx')}
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".xlsx,.csv"
                            onChange={(e) => handleFile(e.target.files[0])}
                        />
                    </div>
                )}
            </div>

            {error && (
                <div className="pt-2 text-xs text-red-400 flex items-center gap-1.5">
                    <AlertCircle size={12} />
                    {error}
                </div>
            )}
        </div>
    );
};

export default DataRefreshControl;
