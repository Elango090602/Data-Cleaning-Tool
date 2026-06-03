import React, { useState } from "react";

export default function OutlierInspector({ rows, columnConfigs, onPromoteLead }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successIndex, setSuccessIndex] = useState(null);
  const [actionType, setActionType] = useState(""); // "approve", "exclude", or "save"

  if (!rows || rows.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-xl bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm text-center min-h-[380px]">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-md text-green-600">
          <span className="material-symbols-outlined text-[36px]">troubleshoot</span>
        </div>
        <h4 className="font-title-sm text-[18px] font-bold text-on-background">
          No Seniority Outliers Found!
        </h4>
        <p className="text-secondary text-[13px] mt-xs max-w-sm">
          Every lead's job title aligns statistically with the target decision-maker profile of this list.
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
      const nameMatch = ["First Name", "Last Name", "Full Name", "Email", "Job Title"]
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

  const handleApproveDirect = async (originalIndex, row, targetDfIndex) => {
    setIsSubmitting(true);
    setActionType("approve");
    setSubmitError("");
    
    const indexToPass = targetDfIndex !== undefined && targetDfIndex !== null ? targetDfIndex : originalIndex;
    const result = await onPromoteLead(indexToPass, row, "outliers");
    
    if (result.success) {
      setSuccessIndex(originalIndex);
      setTimeout(() => {
        setSuccessIndex(null);
      }, 2000);
    } else {
      setSubmitError(result.error || "Failed to approve lead.");
    }
    setIsSubmitting(false);
  };

  const handleExcludeDirect = async (originalIndex, row, targetDfIndex) => {
    setIsSubmitting(true);
    setActionType("exclude");
    setSubmitError("");
    
    // Explicitly flag the row as Invalid so the backend moves it to the quarantine list
    const excludedRow = { ...row, "Data Quality Status": "Invalid" };
    
    const indexToPass = targetDfIndex !== undefined && targetDfIndex !== null ? targetDfIndex : originalIndex;
    const result = await onPromoteLead(indexToPass, excludedRow, "outliers");
    
    if (result.success) {
      setSuccessIndex(originalIndex);
      setTimeout(() => {
        setSuccessIndex(null);
      }, 2000);
    } else {
      setSubmitError(result.error || "Failed to exclude lead.");
    }
    setIsSubmitting(false);
  };

  const saveCorrection = async (originalIndex, targetDfIndex) => {
    setIsSubmitting(true);
    setActionType("save");
    setSubmitError("");
    
    const updated = { ...editFormData };
    const indexToPass = targetDfIndex !== undefined && targetDfIndex !== null ? targetDfIndex : originalIndex;
    const result = await onPromoteLead(indexToPass, updated, "outliers");
    
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
            <span className="material-symbols-outlined text-[20px] text-rose-600">
              troubleshoot
            </span>
            Outlier Discovery & Resolution
          </h3>
          <p className="text-[11px] text-secondary">
            Review leads whose job positions deviate statistically from the corporate focus of this list.
          </p>
        </div>
        
        {/* Search Input */}
        <div className="relative w-full sm:w-60">
          <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-secondary text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search outliers by name or title..."
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
            const isJustProcessed = successIndex === row.originalIndex;
            const remarks = row["Cleaning Remarks"] || "Flagged as seniority outlier";
            const absoluteIndex = row.original_df_index;
            
            return (
              <div 
                key={row.originalIndex}
                className={`border rounded-2xl p-md bg-white transition-all duration-300 ${
                  isEditing 
                    ? "border-primary shadow-md ring-1 ring-primary/20" 
                    : isJustProcessed 
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
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-[3px] text-rose-700 bg-rose-50 border border-rose-100">
                      <span className="material-symbols-outlined text-[13px] fill">troubleshoot</span>
                      Seniority Outlier
                    </span>
                    {row["Lead Grade"] && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {row["Lead Grade"]}
                      </span>
                    )}
                  </div>
                  
                  {/* Warning message */}
                  <div className="text-[12px] font-semibold flex items-center gap-1 text-rose-700">
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

                        const isInvalidField = field.cleanType === "Job Title";

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
                                  ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/10 bg-rose-500/5 font-bold"
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
                          Correct the job title or identity details, then save to approve.
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
                          {isSubmitting && actionType === "save" ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin shrink-0" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[16px]">save</span>
                              Save & Approve
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
                        const isInvalidField = field.cleanType === "Job Title";

                        return (
                          <div key={label} className="min-w-0">
                            <span className="text-[9px] text-secondary uppercase font-bold tracking-wider block mb-0.5">
                              {label}
                            </span>
                            <span className={`block truncate p-1 rounded ${
                              isInvalidField 
                                ? "bg-rose-50 text-rose-800 border border-rose-100 font-bold"
                                : "text-on-surface"
                            }`} title={val}>
                              {val || <span className="opacity-30 italic">blank</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Action buttons inside Card */}
                    <div className="flex flex-col sm:flex-row items-center justify-between border-t border-outline-variant/20 pt-sm mt-sm gap-sm">
                      <div className="flex-1 text-secondary text-[11px]">
                        {submitError && successIndex === row.originalIndex ? (
                          <span className="text-error font-semibold">{submitError}</span>
                        ) : (
                          "Decide whether to exclude this outlier from export, or approve and add it back."
                        )}
                      </div>
                      
                      <div className="flex items-center gap-sm shrink-0 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => startEditing(row, row.originalIndex)}
                          disabled={isSubmitting}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-md py-1.5 rounded-xl border border-outline-variant hover:border-primary text-secondary hover:text-primary transition-all text-xs font-bold"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                          Resolve & Correct
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleExcludeDirect(row.originalIndex, row, absoluteIndex)}
                          disabled={isSubmitting}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-md py-1.5 rounded-xl border border-outline bg-rose-50 hover:bg-rose-100/75 border-rose-200 hover:border-rose-300 text-rose-700 transition-all text-xs font-bold"
                        >
                          {isSubmitting && actionType === "exclude" ? (
                            <span className="w-3.5 h-3.5 border-2 border-rose-700/20 border-t-rose-700 rounded-full animate-spin shrink-0" />
                          ) : (
                            <span className="material-symbols-outlined text-[16px]">cancel</span>
                          )}
                          Exclude Lead
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApproveDirect(row.originalIndex, row, absoluteIndex)}
                          disabled={isSubmitting}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-md py-1.5 rounded-xl bg-green-700 hover:bg-green-800 text-white transition-all text-xs font-bold"
                        >
                          {isSubmitting && actionType === "approve" ? (
                            <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin shrink-0" />
                          ) : (
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          )}
                          Keep & Approve
                        </button>
                      </div>
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
