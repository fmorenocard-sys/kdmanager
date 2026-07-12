import React, { useRef, useState } from 'react';
import { useData } from '../context/DataContext';
import { Upload, RefreshCw, FileSpreadsheet, CheckCircle, AlertCircle } from './ui/icons';
import { useRole, ROLES } from '../context/RoleContext';

const DataRefreshControl = () => {
    const { refreshData, triggerSync, loading, lastUpdated, error } = useData();
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

    return (
        <div
            className="rounded-xl border border-[var(--border-flat)]/60 bg-slate-900/40 backdrop-blur-sm mb-6"
            onDragOver={(e) => isAuthorized && e.preventDefault()}
            onDrop={onDrop}
        >
            {/* Top row: status info */}
            <div className="flex items-center gap-3 px-4 pt-3 pb-2">
                <div className="flex-shrink-0">{statusIcon}</div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-300 leading-tight">Data Management</p>
                    <p className="text-xs text-slate-500 leading-tight truncate">
                        {loading
                            ? 'Loading…'
                            : lastUpdated
                                ? `Updated: ${lastUpdated.toLocaleTimeString()}`
                                : 'No data loaded'}
                    </p>
                </div>
                {loading && <RefreshCw size={14} className="animate-spin text-slate-500 flex-shrink-0" />}
            </div>

            {/* Action buttons — only for authorized roles */}
            {isAuthorized && (
                <div className="flex gap-2 px-4 pb-3">
                    {role === ROLES.KING && (
                        <button
                            onClick={async () => {
                                setUploadStatus('uploading');
                                const success = await triggerSync();
                                setUploadStatus(success ? 'success' : 'error');
                                setTimeout(() => setUploadStatus('idle'), 3000);
                            }}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 px-4 min-h-[44px] text-[13px] font-bold rounded-xl btn-grad-primary text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            {loading ? 'Syncing…' : 'Sync Cloud'}
                        </button>
                    )}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 px-4 min-h-[44px] text-[13px] font-bold rounded-xl border border-[var(--border-flat)] bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-flat)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Upload size={16} />
                        {loading ? 'Processing…' : 'Upload File'}
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

            {error && (
                <div className="px-4 pb-3 text-xs text-red-400 flex items-center gap-1.5">
                    <AlertCircle size={12} />
                    {error}
                </div>
            )}
        </div>
    );
};

export default DataRefreshControl;
