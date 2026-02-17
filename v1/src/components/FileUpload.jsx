import { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Link, Globe } from 'lucide-react';
import * as XLSX from 'xlsx';
import './FileUpload.css';

const FileUpload = ({ onDataLoaded }) => {
    const [importMode, setImportMode] = useState('file'); // 'file' or 'url'
    const [dragActive, setDragActive] = useState(false);
    const [fileName, setFileName] = useState("");
    const [sheetUrl, setSheetUrl] = useState(() => {
        return localStorage.getItem('rok_deadweight_sheet_url') || "";
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const parseWorkbook = (workbook) => {
        try {
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            // Headers are on row 3 (index 2), so we skip 2 rows
            const jsonData = XLSX.utils.sheet_to_json(sheet, { range: 2 });

            if (jsonData.length === 0) {
                throw new Error("No data found in the file.");
            }

            onDataLoaded(jsonData);
        } catch (err) {
            console.error(err);
            setError("Error parsing data. Please check the format.");
        }
    };

    const processFile = async (file) => {
        setError("");
        setFileName(file.name);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                parseWorkbook(workbook);
            } catch (err) {
                console.error(err);
                setError("Error parsing file.");
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const fetchGoogleSheet = async () => {
        if (!sheetUrl) return;

        setIsLoading(true);
        setError("");

        try {
            const response = await fetch(sheetUrl);
            if (!response.ok) throw new Error("Failed to fetch. Make sure the link is correct and public.");

            const csvText = await response.text();
            const workbook = XLSX.read(csvText, { type: 'string' });
            parseWorkbook(workbook);
            setFileName("Google Sheet Synced");

            // Save URL to LocalStorage
            localStorage.setItem('rok_deadweight_sheet_url', sheetUrl);
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to sync with Google Sheets.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    return (
        <div className="file-upload-container">
            <div className="upload-tabs">
                <button
                    className={`tab-btn ${importMode === 'file' ? 'active' : ''}`}
                    onClick={() => setImportMode('file')}
                >
                    <Upload size={18} /> Upload File
                </button>
                <button
                    className={`tab-btn ${importMode === 'url' ? 'active' : ''}`}
                    onClick={() => setImportMode('url')}
                >
                    <Globe size={18} /> Google Sheet
                </button>
            </div>

            {importMode === 'file' ? (
                <form
                    className={`upload-form ${dragActive ? "drag-active" : ""}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-input').click()}
                >
                    <input
                        type="file"
                        id="file-input"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleChange}
                        style={{ display: 'none' }}
                    />

                    <div className="upload-content">
                        <div className="icon-bg">
                            <Upload size={32} />
                        </div>
                        <h3>Upload Deadweight List</h3>
                        <p>Drag & drop your Excel file here or click to browse</p>
                        <span className="file-types">Supports .xlsx, .xls</span>
                    </div>
                </form>
            ) : (
                <div className="url-import-form">
                    <div className="icon-bg">
                        <Link size={32} />
                    </div>
                    <h3>Sync from Google Sheets</h3>
                    <p className="instruction-text">
                        Go to <strong>File &gt; Share &gt; Publish to web</strong> in Google Sheets.<br />
                        Select <strong>"Sheet1"</strong> and <strong>"Comma-separated values (.csv)"</strong>.
                    </p>

                    <div className="input-group">
                        <input
                            type="text"
                            placeholder="Paste the generated CSV link here..."
                            value={sheetUrl}
                            onChange={(e) => setSheetUrl(e.target.value)}
                            className="url-input"
                        />
                    </div>

                    <button
                        className="btn btn-primary sync-btn"
                        onClick={fetchGoogleSheet}
                        disabled={isLoading || !sheetUrl}
                    >
                        {isLoading ? "Syncing..." : "Sync Data"}
                    </button>
                </div>
            )}

            {error && (
                <div className="error-message fade-in">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}
        </div>
    );
};

export default FileUpload;
