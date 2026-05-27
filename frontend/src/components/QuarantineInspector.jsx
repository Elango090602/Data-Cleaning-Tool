import React, { useState } from "react";

export default function QuarantineInspector({ rows, columnConfigs, onPromoteLead, source = "invalid" }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successIndex, setSuccessIndex] = useState(null);

  // Dynamic values based on source
  const isQuarantine = source === "invalid";
  const title = isQuarantine ? "Quarantine Inspector & Editor" : "Needs Review Inspector";
  const desc = isQuarantine
    ? "Manually review and resolve critical syntax formatting issues. Promoted leads move instantly to your GTM list."
    : "Review and fix minor warning flags (e.g. missing names, suspicious websites) to perfect your records.";
  
  const searchPlaceholder = isQuarantine ? "Search syntax errors..." : "Search warning flags...";
  const buttonText = isQuarantine ? "Promote Lead" : "Save Corrections";
  const successText = isQuarantine ? "Promoted to Sales Ready!" : "Warnings Resolved & Saved!";
  const statusLabel = isQuarantine ? "Syntax Error" : "Quality Warning";
  const cardIcon = isQuarantine ? "cancel" : "warning";
  const cardIconClass = isQuarantine
    ? "text-error bg-error-container/20"
    : "text-amber-700 bg-amber-500/15";

  if (!rows || rows.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-xl bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm text-center min-h-[380px]">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-md text-green-600">
          <span className="material-symbols-outlined text-[36px]">verified</span>
        </div>
        <h4 className="font-title-sm text-[18px] font-bold text-on-background">
          {isQuarantine ? "Quarantine Clear!" : "All Warnings Resolved!"}
        </h4>
        <p className="text-secondary text-[13px] mt-xs max-w-sm">
          {isQuarantine
            ? "No invalid or quarantined records found in this dataset. Every single contact is fully validated and ready for sales."
            : "No outstanding warning flags or needs-review records found. Your active leads are completely standardized."}
        </p>
      </div>
    );
  }

  // Get active fields/columns mapped
  const activeFields = columnConfigs
    .filter((c) => c.included)
    .map((c) => ({
      originalName: c.original_name,
      outputName: c.output_name,
      cleanType: c.clean_type,
    }));

  // Handle filtering
  const filteredRows = rows
    .map((row, index) => ({ ...row, originalIndex: index }))
    .filter((row) => {
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = ["First Name", "Last Name", "Full Name", "Email"]
        .map((f) => String(row[f] || "").toLowerCase())
        .some((val) => val.includes(searchLower));
      const remarkMatch = String(row["Cleaning Remarks"] || "")
        .toLowerCase()
        .includes(searchLower);
      return nameMatch || remarkMatch;
    });

  const startEditing = (row, index) => {
    setEditingIndex(index);
    setEditFormData({ ...row });
    setSubmitError("");
    setSuccessIndex(null);
  };

  const handleInputChange = (field, val) => {
    setEditFormData((prev) => ({
      ...prev,
      [field]: val,
    }));
  };

  const saveCorrection = async (originalIndex, targetDfIndex) => {
    setIsSubmitting(true);
    setSubmitError("");
    
    const updated = { ...editFormData };
    
    // Pass the absolute dataframe index to backend for pinpoint update accuracy
    const indexToPass = targetDfIndex !== undefined && targetDfIndex !== null ? targetDfIndex : originalIndex;
    const result = await onPromoteLead(indexToPass, updated, source);
    
    if (result.success) {
      setSuccessIndex(originalIndex);
      setEditingIndex(null);
      setTimeout(() => {
        setSuccessIndex(null);
      }, 2000);
    } else {
      setSubmitError(result.error || "Failed to validate correction. Please check your fields.");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="w-full h-full flex flex-col bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden shadow-sm min-h-[380px]">
      
      {/* Header controls panel */}
      <div className="bg-surface-container-low px-md py-sm border-b border-surface-variant flex flex-col sm:flex-row gap-sm justify-between items-center shrink-0">
        <div className="min-w-0">
          <h3 className="font-title-sm text-title-sm text-on-background font-bold flex items-center gap-xs">
            <span className={`material-symbols-outlined text-[20px] ${isQuarantine ? "text-error" : "text-amber-600"}`}>
              {isQuarantine ? "healing" : "warning"}
            </span>
            {title}
          </h3>
          <p className="text-[11px] text-secondary">
            {desc}
          </p>
        </div>
        
        {/* Search Input */}
        <div className="relative w-full sm:w-60">
          <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-secondary text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-xl pr-md py-[5px] rounded-lg border border-outline-variant bg-surface text-[12px] placeholder:text-secondary focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Main List container */}
      <div className="flex-1 overflow-auto p-md custom-scrollbar bg-surface-container-lowest/50 space-y-md">
        
        {filteredRows.length === 0 ? (
          <div className="text-center py-xl text-secondary text-[12px]">
            No records match your search criteria.
          </div>
        ) : (
          filteredRows.map((row) => {
            const isEditing = editingIndex === row.originalIndex;
            const isJustPromoted = successIndex === row.originalIndex;
            const remarks = row["Cleaning Remarks"] || "Requires review";
            const absoluteIndex = row.original_df_index;
            
            return (
              <div 
                key={row.originalIndex}
                className={`border rounded-2xl p-md bg-white transition-all duration-300 ${
                  isEditing 
                    ? "border-primary shadow-md ring-1 ring-primary/20" 
                    : isJustPromoted 
                      ? "border-green-500 bg-green-50/20 scale-[0.98] opacity-50"
                      : "border-outline-variant/60 hover:border-outline shadow-sm hover:shadow-md"
                }`}
              >
                {/* Card Title & Warning Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm border-b border-outline-variant/30 pb-sm mb-md">
                  <div className="flex items-center gap-xs">
                    <span className="text-[11px] font-bold text-secondary bg-surface-container-high px-2 py-0.5 rounded">
                      Row #{absoluteIndex !== undefined ? absoluteIndex + 1 : row.originalIndex + 1}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-[3px] ${cardIconClass}`}>
                      <span className="material-symbols-outlined text-[13px] fill">{cardIcon}</span>
                      {statusLabel}
                    </span>
                  </div>
                  
                  {/* Warning message */}
                  <div className={`text-[12px] font-semibold flex items-center gap-1 ${isQuarantine ? "text-error" : "text-amber-800"}`}>
                    <span className="material-symbols-outlined text-[16px]">info</span>
                    {remarks}
                  </div>
                </div>

                {isEditing ? (
                  /* Editing Mode Form */
                  <div className="space-y-md">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-md">
                      {activeFields.map((field) => {
                        const label = field.outputName;
                        if (["Data Quality Status", "Cleaning Remarks", "original_df_index"].includes(label)) return null;

                        // Highlight fields that are mentioned in the remarks to assist editing
                        const isInvalidField = 
                          (field.cleanType === "Email" && remarks.toLowerCase().includes("email")) ||
                          ((field.cleanType === "Phone Number" || field.cleanType === "Mobile Number") && remarks.toLowerCase().includes("phone")) ||
                          (field.cleanType === "Website" && remarks.toLowerCase().includes("website")) ||
                          (field.cleanType === "First Name" && remarks.toLowerCase().includes("first name"));

                        return (
                          <div key={label} className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-secondary uppercase tracking-wider">
                              {label}
                            </label>
                            <input
                              type="text"
                              value={editFormData[label] || ""}
                              onChange={(e) => handleInputChange(label, e.target.value)}
                              className={`px-sm py-1.5 rounded-lg border text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                                isInvalidField
                                  ? isQuarantine
                                    ? "border-error focus:border-error focus:ring-error/10 bg-error-container/5"
                                    : "border-amber-500 focus:border-amber-500 focus:ring-amber-500/10 bg-amber-500/5"
                                  : "border-outline-variant focus:border-primary"
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Action buttons inside Edit Mode */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-md pt-sm border-t border-outline-variant/30 mt-sm">
                      {submitError ? (
                        <span className="text-[11px] text-error font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px]">error</span>
                          {submitError}
                        </span>
                      ) : (
                        <span className="text-[11px] text-secondary">
                          Fix the highlighted values to qualify the record.
                        </span>
                      )}
                      
                      <div className="flex items-center gap-sm shrink-0 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => setEditingIndex(null)}
                          disabled={isSubmitting}
                          className="flex-1 sm:flex-initial px-md py-1.5 rounded-xl border border-outline font-label-caps text-label-caps text-on-surface hover:bg-surface-container-low transition-all text-xs font-bold"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveCorrection(row.originalIndex, absoluteIndex)}
                          disabled={isSubmitting}
                          className="flex-1 sm:flex-initial px-md py-1.5 rounded-xl bg-primary text-on-primary hover:bg-surface-tint font-label-caps text-label-caps transition-all text-xs font-bold flex items-center justify-center gap-1"
                        >
                          {isSubmitting ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin shrink-0" />
                              Validating...
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[16px]">bolt</span>
                              {buttonText}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Standard Mode Card Read-only Grid */
                  <div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-sm text-[12px] mb-md">
                      {activeFields.map((field) => {
                        const label = field.outputName;
                        if (["Data Quality Status", "Cleaning Remarks", "original_df_index"].includes(label)) return null;

                        const val = row[label];
                        const isInvalidField = 
                          (field.cleanType === "Email" && remarks.toLowerCase().includes("email")) ||
                          ((field.cleanType === "Phone Number" || field.cleanType === "Mobile Number") && remarks.toLowerCase().includes("phone")) ||
                          (field.cleanType === "Website" && remarks.toLowerCase().includes("website")) ||
                          (field.cleanType === "First Name" && remarks.toLowerCase().includes("first name"));

                        return (
                          <div key={label} className="min-w-0">
                            <span className="text-[9px] text-secondary uppercase font-bold tracking-wider block mb-0.5">
                              {label}
                            </span>
                            <span className={`block truncate p-1 rounded ${
                              isInvalidField 
                                ? isQuarantine
                                  ? "bg-error-container/20 text-error font-semibold"
                                  : "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 font-semibold"
                                : "text-on-surface"
                            }`} title={val}>
                              {val || <span className="opacity-30 italic">blank</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Action buttons inside Card */}
                    <div className="flex items-center justify-end border-t border-outline-variant/20 pt-xs mt-xs">
                      {isJustPromoted ? (
                        <div className="text-[12px] text-green-600 font-bold flex items-center gap-1 animate-pulse">
                          <span className="material-symbols-outlined text-[18px] fill">check_circle</span>
                          {successText}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditing(row, row.originalIndex)}
                          className={`flex items-center gap-1.5 px-md py-1.5 rounded-xl border border-outline-variant hover:border-primary transition-all text-xs font-bold ${
                            isQuarantine 
                              ? "text-primary hover:bg-primary/5" 
                              : "text-amber-700 hover:text-amber-900 hover:bg-amber-50"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                          Resolve & Correct
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

      </div>
    </div>
  );
}
