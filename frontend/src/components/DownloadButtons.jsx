import React, { useState } from "react";
import { downloadFile } from "../services/api";

export default function DownloadButtons({ downloadIds, onReset, summary }) {
  const [format, setFormat] = useState("csv"); // default: 'csv'
  
  const handleDownload = (fileId, defaultName) => {
    if (!fileId) return;
    downloadFile(fileId, format);
  };

  const downloads = [
    {
      id: downloadIds.cleaned,
      title: "Cleaned Leads (Sales-Ready)",
      description: "Cleaned and verified contact list with split E.164 phone numbers, standardized names, and corrected website fields.",
      icon: "task_alt",
      badge: `${summary.total_after_cleaning || 0} rows`,
      colorClass: "bg-primary text-on-primary hover:bg-surface-tint shadow-md"
    },
    {
      id: downloadIds.invalid,
      title: "Anomaly Quarantine Log",
      description: "Auditable archive of records that failed domain-level email checks or critical phone formats.",
      icon: "cancel",
      badge: `${summary.invalid_records || 0} rows`,
      disabled: !downloadIds.invalid || summary.invalid_records === 0,
      colorClass: "bg-error-container/20 border border-error/20 text-error hover:bg-error-container/30"
    },
    {
      id: downloadIds.duplicates,
      title: "Deduplication Archive",
      description: "Archive of duplicate rows filtered out based on corporate email, phones, or name keys.",
      icon: "content_copy",
      badge: `${summary.duplicates_found || 0} rows`,
      disabled: !downloadIds.duplicates || summary.duplicates_found === 0,
      colorClass: "bg-secondary-container/25 border border-secondary-container/50 text-on-secondary-container hover:bg-secondary-container/40"
    },
    {
      id: downloadIds.summary,
      title: "Compliance Audit Report",
      description: "Complete analytical summary report detailing the health metrics, pipeline actions, and validation rates.",
      icon: "analytics",
      badge: "Analytics PDF/Excel",
      colorClass: "bg-surface-container-low border border-surface-variant/50 text-secondary hover:bg-surface-variant/40"
    }
  ];

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col justify-center flex-1 my-auto">
      {/* File Format Selector Header */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-md shadow-sm mb-lg flex flex-col sm:flex-row items-center justify-between gap-md shrink-0">
        <div>
          <h4 className="font-title-sm text-title-sm text-on-background font-bold text-[16px]">Configure Output Format</h4>
          <p className="font-body-sm text-body-sm text-secondary mt-xs">
            Choose the target format to download all generated data sets.
          </p>
        </div>
        
        {/* Toggle between CSV and XLSX */}
        <div className="flex border border-outline-variant rounded-xl p-xs bg-surface-container-low select-none">
          <button
            onClick={() => setFormat("csv")}
            className={`px-md py-sm font-label-caps text-label-caps rounded-lg transition-all duration-150 ${
              format === "csv" 
                ? "bg-surface-container-lowest text-primary font-bold shadow-sm" 
                : "text-secondary hover:text-on-background"
            }`}
          >
            CSV Export
          </button>
          <button
            onClick={() => setFormat("xlsx")}
            className={`px-md py-sm font-label-caps text-label-caps rounded-lg transition-all duration-150 ${
              format === "xlsx" 
                ? "bg-surface-container-lowest text-primary font-bold shadow-sm" 
                : "text-secondary hover:text-on-background"
            }`}
          >
            Excel (XLSX)
          </button>
        </div>
      </div>

      {/* Grid of Download items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg shrink-0">
        {downloads.map((dl) => {
          const isDisabled = dl.disabled || !dl.id;
          
          return (
            <div 
              key={dl.title}
              className={`bg-surface-container-lowest border border-outline-variant rounded-2xl p-md flex flex-col justify-between shadow-sm transition-all hover:shadow-md relative ${
                isDisabled ? "opacity-55" : ""
              }`}
            >
              <div>
                {/* Header card info */}
                <div className="flex items-start justify-between gap-xs mb-sm">
                  <div className="flex items-center gap-sm min-w-0">
                    <span className="material-symbols-outlined text-[24px] text-secondary shrink-0">{dl.icon}</span>
                    <h4 className="font-title-sm text-title-sm text-on-background font-bold truncate" title={dl.title}>{dl.title}</h4>
                  </div>
                  
                  {/* Row count Badge */}
                  {!isDisabled && (
                    <span className="font-label-caps text-[10px] bg-surface-variant px-sm py-[2px] rounded-full text-secondary font-bold shrink-0">
                      {dl.badge}
                    </span>
                  )}
                </div>
                
                <p className="font-body-sm text-body-sm text-secondary min-h-[48px] leading-relaxed">
                  {dl.description}
                </p>
              </div>

              {/* Action Button */}
              <button
                onClick={() => !isDisabled && handleDownload(dl.id, dl.title)}
                disabled={isDisabled}
                className={`w-full mt-md px-lg py-sm rounded-xl font-label-caps text-label-caps transition-all flex items-center justify-center gap-xs duration-150 ${
                  isDisabled
                    ? "bg-surface-container border border-surface-variant/40 text-secondary cursor-not-allowed"
                    : dl.colorClass
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                {isDisabled ? "No Records Found" : `Download ${format.toUpperCase()}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Reset flow action */}
      <div className="mt-xl pt-lg border-t border-outline-variant/30 flex justify-center shrink-0">
        <button
          onClick={onReset}
          className="px-xl py-sm rounded-xl border border-outline font-label-caps text-label-caps text-on-surface hover:bg-surface-container-low transition-all duration-150 active:scale-95 flex items-center gap-xs focus:outline-none"
        >
          <span className="material-symbols-outlined text-[18px]">restart_alt</span>
          Sanitize Another List
        </button>
      </div>
    </div>
  );
}
