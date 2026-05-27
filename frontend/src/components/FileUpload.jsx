import React, { useState, useRef } from "react";
import { uploadFile } from "../services/api";

export default function FileUpload({ onUploadSuccess }) {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
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

  const validateAndUpload = async (file) => {
    if (!file) return;
    
    // Check file extension
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext)) {
      setError("Unsupported file format. Please upload a .csv, .xlsx, or .xls file.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setError("");
    setLoading(true);

    try {
      const data = await uploadFile(file);
      onUploadSuccess(data, file);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to parse file. Ensure it contains a valid header row and data.");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndUpload(e.target.files[0]);
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
      <div className="text-center mb-lg">
        <h2 className="font-headline-md text-[32px] text-on-background font-bold tracking-tight">
          Import Your B2B Contacts
        </h2>
        <p className="font-body-md text-body-md text-secondary mt-xs max-w-md mx-auto">
          Upload your ZoomInfo, Apollo, or custom exports. We'll automatically recommendation-map schemas, clean contacts, and isolate local numbers.
        </p>
      </div>

      {/* Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        className={`relative border-2 border-dashed rounded-2xl p-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 select-none ${
          dragActive 
            ? "border-primary bg-primary-container/5 scale-[0.99] shadow-inner" 
            : "border-outline-variant hover:border-primary/60 bg-surface-container-lowest hover:shadow-md"
        } ${loading ? "pointer-events-none opacity-80" : ""}`}
        style={{ minHeight: "300px" }}
      >
        {/* Hidden Input */}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".csv,.xlsx,.xls"
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
              <p className="font-title-sm text-title-sm font-bold text-primary">Analyzing Lead File Schemas...</p>
              <p className="font-body-sm text-body-sm text-secondary mt-xs">Running validation matching and building rows preview...</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-md">
            {/* Premium Upload Icon */}
            <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center text-primary border border-primary/10">
              <span className="material-symbols-outlined text-[42px]">cloud_upload</span>
            </div>

            <div className="max-w-sm">
              <h3 className="font-title-sm text-title-sm text-on-background font-bold text-[18px]">
                {selectedFile ? selectedFile.name : "Select your messy spreadsheet"}
              </h3>
              <p className="font-body-sm text-body-sm text-secondary mt-xs leading-relaxed">
                {selectedFile 
                  ? `${formatBytes(selectedFile.size)} — Click or drag to replace` 
                  : "Drag and drop your file here, or click to browse files on your computer"
                }
              </p>
            </div>

            <button
              type="button"
              className="px-xl py-sm bg-primary text-on-primary font-label-caps text-label-caps rounded-xl hover:bg-surface-tint active:scale-95 duration-150 shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-primary font-semibold"
            >
              Choose File
            </button>
          </div>
        )}
      </div>

      {/* Error read-out */}
      {error && (
        <div className="mt-md p-md bg-error-container/20 border border-error/20 rounded-xl text-error flex items-start gap-sm animate-fade-in shrink-0">
          <span className="material-symbols-outlined text-[22px] shrink-0">error</span>
          <div className="font-body-sm text-body-sm">
            <span className="font-bold">Parsing Error:</span> {error}
          </div>
        </div>
      )}

      {/* Constraints info block */}
      <div className="mt-lg border-t border-outline-variant/30 pt-md text-center shrink-0">
        <p className="font-body-sm text-body-sm text-secondary flex items-center justify-center gap-xs">
          <span className="material-symbols-outlined text-[16px] text-secondary/60">info</span>
          Supported formats: <span className="font-bold text-on-surface">.CSV, .XLSX, .XLS</span> (Up to 50MB)
        </p>
      </div>
    </div>
  );
}
