import React, { useRef, useState } from 'react';
import { useData } from '../context/DataContext';
import { Upload, RefreshCw, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';

const DataRefreshControl = () => {
    const { refreshData, loading, lastUpdated, error } = useData();
    const fileInputRef = useRef(null);
    const [dragActive, setDragActive] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, success, error

    const handleFile = async (file) => {
        if (!file) return;
        setUploadStatus('uploading');
        const success = await refreshData(file);
        setUploadStatus(success ? 'success' : 'error');
        setTimeout(() => setUploadStatus('idle'), 3000);
    };

    const onDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    return (
        <Card className="mb-6 border-dashed border-2 border-slate-700 bg-slate-900/20 hover:bg-slate-900/40 transition-colors">
            <div
                className="flex flex-col md:flex-row items-center justify-between gap-4"
                onDragEnter={() => setDragActive(true)}
                onDragLeave={() => setDragActive(false)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
            >
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${uploadStatus === 'success' ? 'bg-green-500/20 text-green-500' : 'bg-primary/10 text-primary'}`}>
                        {uploadStatus === 'success' ? <CheckCircle size={24} /> : <FileSpreadsheet size={24} />}
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-200">Data Management</h3>
                        <p className="text-sm text-slate-400">
                            {lastUpdated
                                ? `Updated: ${lastUpdated.toLocaleTimeString()}`
                                : "No data loaded"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".xlsx,.csv"
                        onChange={(e) => handleFile(e.target.files[0])}
                    />

                    <div className="hidden md:block text-xs text-slate-500 mr-2">
                        Drag & Drop Excel files here
                    </div>

                    <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading}
                    >
                        {loading ? <RefreshCw className="animate-spin mr-2" size={16} /> : <Upload className="mr-2" size={16} />}
                        {loading ? "Processing..." : "Uppload Update"}
                    </Button>
                </div>
            </div>
            {error && (
                <div className="mt-3 text-sm text-red-400 flex items-center gap-2">
                    <AlertCircle size={14} />
                    {error}
                </div>
            )}
        </Card>
    );
};

export default DataRefreshControl;
