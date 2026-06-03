import React, { useState, useRef } from "react";
import { uploadFile } from "../services/api";

export default function FileUpload({ onUploadSuccess }) {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const addFiles = (newFiles) => {
    setError("");
    
    // Validate file extensions
    const validFiles = newFiles.filter(file => {
      const ext = file.name.split(".").pop().toLowerCase();
      if (!["csv", "xlsx", "xls"].includes(ext)) {
        setError("Unsupported file format. Please upload .csv, .xlsx, or .xls files only.");
        return false;
      }
      return true;
    });

    setSelectedFiles(prev => {
      const combined = [...prev];
      for (const file of validFiles) {
        if (combined.length >= 5) {
          setError("Maximum 5 files can be uploaded in a single session.");
          break;
        }
        // Avoid duplicates by name + size
        if (!combined.some(f => f.name === file.name && f.size === file.size)) {
          combined.push(file);
        }
      }
      return combined;
    });
  };

  const removeFile = (indexToRemove) => {
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleUploadSubmit = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (selectedFiles.length === 0) return;

    setError("");
    setLoading(true);

    try {
      const data = await uploadFile(selectedFiles);
      onUploadSuccess(data, selectedFiles);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to parse files. Ensure they contain a valid header row and data.");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const onButtonClick = () => {
    inputRef.current.click();
  };

  // Helper for displaying friendly file sizes
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col justify-center flex-1 my-auto">
      {/* Title Panel */}
      <div className="text-center mb-lg animate-fade-in">
        <h2 className="font-headline-md text-[32px] text-on-background font-bold tracking-tight">
          Import Your B2B Contacts
        </h2>
        <p className="font-body-md text-body-md text-secondary mt-xs max-w-md mx-auto">
          Upload up to 5 CSV or Excel files. We'll automatically recommendation-map schemas, merge records together, clean contacts, and isolate local numbers.
        </p>
      </div>

      {/* Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={selectedFiles.length === 0 ? onButtonClick : undefined}
        className={`relative border-2 border-dashed rounded-2xl p-xl flex flex-col items-center justify-center text-center transition-all duration-200 select-none ${
          dragActive 
            ? "border-primary bg-primary-container/5 scale-[0.99] shadow-inner" 
            : selectedFiles.length > 0 
              ? "border-outline-variant bg-surface-container-lowest"
              : "border-outline-variant hover:border-primary/60 bg-surface-container-lowest hover:shadow-md cursor-pointer"
        } ${loading ? "pointer-events-none opacity-80" : ""}`}
        style={{ minHeight: "300px" }}
      >
        {/* Hidden Input */}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".csv,.xlsx,.xls"
          multiple
          onChange={handleChange}
          disabled={loading}
        />

        {loading ? (
          <div className="flex flex-col items-center gap-md">
            {/* Custom Premium Loader */}
            <div className="w-14 h-14 relative flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
              <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin" />
              <span className="material-symbols-outlined text-primary text-[24px] animate-pulse">analytics</span>
            </div>
            <div>
              <p className="font-title-sm text-title-sm font-bold text-primary animate-pulse">Merging & Analyzing Lead Files...</p>
              <p className="font-body-sm text-body-sm text-secondary mt-xs">Running validation matching and building unified preview...</p>
            </div>
          </div>
        ) : selectedFiles.length > 0 ? (
          /* Selected Files List View */
          <div className="w-full flex flex-col gap-md">
            <div className="max-w-md mx-auto text-center mb-sm">
              <h3 className="font-title-sm text-on-background font-bold text-[16px]">
                Ready to Process ({selectedFiles.length} {selectedFiles.length === 1 ? "file" : "files"})
              </h3>
              <p className="font-body-sm text-secondary text-xs mt-xs">
                Review your list of files below. You can add more or click upload to clean them all together.
              </p>
            </div>

            <div className="w-full max-w-md mx-auto bg-surface-container-low/40 rounded-xl p-sm border border-outline-variant/50 max-h-48 overflow-y-auto custom-scrollbar flex flex-col gap-sm">
              {selectedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white border border-outline-variant/60 rounded-lg p-xs px-sm shadow-sm transition-all hover:shadow-md animate-scale-up">
                  <div className="flex items-center gap-sm min-w-0">
                    <span className="material-symbols-outlined text-primary text-[20px]">description</span>
                    <div className="flex flex-col text-left min-w-0">
                      <span className="font-body-md text-on-background font-bold text-[11px] truncate" title={file.name}>
                        {file.name}
                      </span>
                      <span className="text-[9px] text-secondary">
                        {formatBytes(file.size)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(idx);
                    }}
                    className="p-xs text-secondary hover:text-error rounded-lg hover:bg-red-50 transition-all flex items-center justify-center"
                    title="Remove file"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-sm mt-sm flex-wrap">
              {selectedFiles.length < 5 && (
                <button
                  type="button"
                  onClick={onButtonClick}
                  className="px-md py-1.5 rounded-xl border border-outline-variant hover:border-primary text-primary transition-all text-xs font-bold flex items-center gap-xs focus:outline-none bg-white shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Add More ({5 - selectedFiles.length} left)
                </button>
              )}
              
              <button
                type="button"
                onClick={handleUploadSubmit}
                className="px-xl py-1.5 bg-primary text-on-primary font-label-caps text-label-caps rounded-xl hover:bg-surface-tint active:scale-95 duration-150 shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-primary font-bold flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-[18px]">bolt</span>
                Upload & Process List
              </button>
            </div>
          </div>
        ) : (
          /* Empty State drop zone */
          <div className="flex flex-col items-center gap-md">
            <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center text-primary border border-primary/10">
              <span className="material-symbols-outlined text-[42px]">cloud_upload</span>
            </div>

            <div className="max-w-sm">
              <h3 className="font-title-sm text-title-sm text-on-background font-bold text-[18px]">
                Select your messy lead sheets
              </h3>
              <p className="font-body-sm text-body-sm text-secondary mt-xs leading-relaxed">
                Drag and drop your files here, or click to browse files on your computer
              </p>
            </div>

            <button
              type="button"
              className="px-xl py-sm bg-primary text-on-primary font-label-caps text-label-caps rounded-xl hover:bg-surface-tint active:scale-95 duration-150 shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-primary font-semibold"
            >
              Choose Files
            </button>
          </div>
        )}
      </div>

      {/* Error read-out */}
      {error && (
        <div className="mt-md p-md bg-error-container/20 border border-error/20 rounded-xl text-error flex items-start gap-sm animate-fade-in shrink-0">
          <span className="material-symbols-outlined text-[22px] shrink-0">error</span>
          <div className="font-body-sm text-body-sm">
            <span className="font-bold">Error:</span> {error}
          </div>
        </div>
      )}

      {/* Constraints info block */}
      <div className="mt-lg border-t border-outline-variant/30 pt-md text-center shrink-0">
        <p className="font-body-sm text-body-sm text-secondary flex items-center justify-center gap-xs">
          <span className="material-symbols-outlined text-[16px] text-secondary/60">info</span>
          Supported formats: <span className="font-bold text-on-surface">.CSV, .XLSX, .XLS</span> (Up to 5 files, 50MB each)
        </p>
      </div>
    </div>
  );
}
