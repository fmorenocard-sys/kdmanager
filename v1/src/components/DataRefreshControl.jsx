import { useState } from 'react';
import { Upload, X, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

const DataRefreshControl = ({ pageId, title, onDataLoaded, expectedFilePattern }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleFile = async (file) => {
        setError(null);
        setSuccess(false);

        if (expectedFilePattern && !file.name.match(expectedFilePattern)) {
            // Optional: warning but allow proceed
            console.warn(`File name ${file.name} does not match expected pattern ${expectedFilePattern}`);
        }

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });

            // Pass workbook to parent
            if (onDataLoaded) {
                await onDataLoaded(workbook, file.name);
            }

            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setIsOpen(false);
            }, 1500);

        } catch (err) {
            console.error(err);
            setError("Failed to parse file. Ensure it is a valid Excel/CSV file.");
        }
    };

    const onDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="btn btn-primary flex items-center gap-2"
            >
                <Upload size={18} />
                {title || "Update Data"}
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm fade-in">
                    <div className="bg-[#1a1b26] border border-white/10 rounded-xl w-full max-w-md shadow-2xl overflow-hidden relative">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 text-muted hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="p-6">
                            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                                <FileSpreadsheet className="text-blue-400" />
                                Update {title || "Page"} Data
                            </h3>
                            <p className="text-muted text-sm mb-6">
                                Upload the latest <span className="text-blue-200 font-mono">{expectedFilePattern ? String(expectedFilePattern).replace('/', '') : 'Stats'}</span> file.
                            </p>

                            <div
                                className={`
                                    border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
                                    ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-white/20 hover:bg-white/5'}
                                    ${success ? 'border-green-500 bg-green-500/10' : ''}
                                `}
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={onDrop}
                                onClick={() => document.getElementById(`file-upload-${pageId}`).click()}
                            >
                                <input
                                    type="file"
                                    id={`file-upload-${pageId}`}
                                    className="hidden"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                                />

                                {success ? (
                                    <div className="flex flex-col items-center gap-2 text-green-400 animate-in zoom-in">
                                        <CheckCircle size={48} />
                                        <span className="font-bold">Update Successful!</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-muted">
                                        <Upload size={32} />
                                        <span>Click or Drag file here</span>
                                        <span className="text-xs opacity-50">Supports .xlsx, .csv</span>
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-200 text-sm">
                                    <AlertCircle size={16} />
                                    {error}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default DataRefreshControl;
