import React, { useState } from "react";
import Stepper from "../components/Stepper";
import FileUpload from "../components/FileUpload";
import FieldMapping from "../components/FieldMapping";
import CleaningOptions from "../components/CleaningOptions";
import CleaningSummary from "../components/CleaningSummary";
import DownloadButtons from "../components/DownloadButtons";
import DataPreview from "../components/DataPreview";
import QuarantineInspector from "../components/QuarantineInspector";
import UserProfileModal from "../components/UserProfileModal";
import { cleanData, cleanupSession, promoteLead } from "../services/api";

export default function App({ onBackToLanding, onLogout }) {
  const [step, setStep] = useState(1);
  const [sessionId, setSessionId] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [detectedColumns, setDetectedColumns] = useState([]);
  const [autoMapping, setAutoMapping] = useState({});
  const [columnConfigs, setColumnConfigs] = useState([]);
  const [originalColumnConfigs, setOriginalColumnConfigs] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  
  const [cleaningOptions, setCleaningOptions] = useState({
    validate_emails: true,
    validate_phones: true,
    clean_linkedin: true,
    clean_websites: true,
    remove_duplicates: true,
    remove_blank_rows: true,
    generate_invalid_file: true,
    generate_duplicate_file: true
  });
  
  const [cleanedPreview, setCleanedPreview] = useState([]);
  const [invalidPreview, setInvalidPreview] = useState([]);
  const [needsReviewPreview, setNeedsReviewPreview] = useState([]);
  const [duplicatesPreview, setDuplicatesPreview] = useState([]);
  const [activePreviewTab, setActivePreviewTab] = useState("valid");
  const [summary, setSummary] = useState({});
  const [downloadIds, setDownloadIds] = useState({});
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [cleaningError, setCleaningError] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem("lead_cleaner_email") || "");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Hydrate user profile defaults on app boot
  React.useEffect(() => {
    const token = localStorage.getItem("lead_cleaner_token");
    if (!token) {
      if (onLogout) onLogout();
      else onBackToLanding();
      return;
    }
    
    import("../services/api").then(({ getUserProfile }) => {
      getUserProfile()
        .then((profile) => {
          if (profile.cleaning_preferences) {
            setCleaningOptions(profile.cleaning_preferences);
          }
        })
        .catch((err) => {
          console.error("Dashboard session validation failed, redirecting to login:", err);
          if (onLogout) onLogout();
          else onBackToLanding();
        });
    });
  }, []);

  // Prevent background page scrolling when popups/modals are active
  React.useEffect(() => {
    const isModalOpen = isProfileOpen || showLogoutConfirm;
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isProfileOpen, showLogoutConfirm]);

  // Step 1 Callback: File uploaded successfully
  const handleUploadSuccess = (data, file) => {
    setSessionId(data.session_id);
    setUploadedFile(file);
    setDetectedColumns(data.detected_columns);
    setAutoMapping(data.auto_mapping);
    setPreviewRows(data.preview_rows);
    setTotalRows(data.total_rows);
    
    // Initialize custom column configurations from raw headers
    const initialConfigs = data.detected_columns.map(col => {
      let recommendedType = "";
      // Match raw column with recommended standard clean types
      const matchedField = Object.keys(data.auto_mapping).find(
        key => data.auto_mapping[key] === col
      );
      if (matchedField) {
        recommendedType = matchedField;
      }
      return {
        original_name: col,
        output_name: col, // Keeps exact original header name by default
        clean_type: recommendedType, // Matches standard rules if recommended, else "" (None)
        included: true // Default all raw columns as active/included
      };
    });
    setColumnConfigs(initialConfigs);
    setOriginalColumnConfigs(JSON.parse(JSON.stringify(initialConfigs)));
    
    setStep(2);
  };

  // Reset Step 2 schema mapping to original state
  const handleResetSchema = () => {
    setColumnConfigs(JSON.parse(JSON.stringify(originalColumnConfigs)));
  };

  // Step 2 Action: Proceed to Cleaning Options
  const handleMappingProceed = () => {
    const selectedCount = columnConfigs.filter(c => c.included).length;
    if (selectedCount === 0) return;
    setStep(3);
  };

  // Step 3 Action: Trigger backend cleaning API
  const handleStartCleaning = async () => {
    setIsProcessing(true);
    setCleaningError("");
    
    const payload = {
      session_id: sessionId,
      column_configs: columnConfigs,
      cleaning_options: cleaningOptions
    };

    try {
      const response = await cleanData(payload);
      setCleanedPreview(response.cleaned_preview);
      setInvalidPreview(response.invalid_preview || []);
      setNeedsReviewPreview(response.needs_review_preview || []);
      setDuplicatesPreview(response.duplicates_preview || []);
      setSummary(response.summary);
      setDownloadIds(response.download_ids);
      setActivePreviewTab("valid"); // Reset to Valid tab on start
      setStep(4);
    } catch (err) {
      console.error(err);
      setCleaningError(err.message || "Failed to process lead cleaning. Please check your data.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Promotes a quarantined lead or updates a cleaned lead in real-time
  const handlePromoteLead = async (rowIndex, updatedRow, source = "invalid") => {
    try {
      const payload = {
        session_id: sessionId,
        row_index: rowIndex,
        source: source,
        updated_row: updatedRow,
        column_configs: columnConfigs,
        cleaning_options: cleaningOptions
      };
      
      const response = await promoteLead(payload);
      setCleanedPreview(response.cleaned_preview);
      setInvalidPreview(response.invalid_preview || []);
      setNeedsReviewPreview(response.needs_review_preview || []);
      setDuplicatesPreview(response.duplicates_preview || []);
      setSummary(response.summary);
      setDownloadIds(response.download_ids);
      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  // Step 5 Reset Action: start fresh
  const handleReset = () => {
    if (sessionId) {
      cleanupSession(sessionId);
    }
    
    // Reset state
    setStep(1);
    setSessionId(null);
    setUploadedFile(null);
    setDetectedColumns([]);
    setAutoMapping({});
    setColumnConfigs([]);
    setOriginalColumnConfigs([]);
    setPreviewRows([]);
    setTotalRows(0);
    setCleanedPreview([]);
    setInvalidPreview([]);
    setNeedsReviewPreview([]);
    setDuplicatesPreview([]);
    setActivePreviewTab("valid");
    setSummary({});
    setDownloadIds({});
    setCleaningError("");
  };

  // Dynamic navigation validation helper
  const isStepAccessible = (targetStepId) => {
    if (targetStepId === 1) return true; // Import Data is always unlocked
    if (!sessionId) return false;        // Locked if no file is imported
    if (targetStepId === 2 || targetStepId === 3) return true; // Align and Engine Settings unlocked on upload
    
    // Quality & Export unlocked only after cleaning is processed
    if (targetStepId === 4 || targetStepId === 5) {
      return cleanedPreview && cleanedPreview.length > 0;
    }
    return false;
  };

  // Dynamic preview transformer simulating cleaning options in real-time
  const getLivePreviewRows = () => {
    if (!previewRows || previewRows.length === 0) return [];
    
    // Deep copy preview rows to avoid mutating original state
    const transformed = previewRows.map(row => ({ ...row }));
    const { validate_phones, clean_websites, clean_linkedin } = cleaningOptions;
    
    const phoneColumns = columnConfigs
      .filter(c => c.included && (c.clean_type === "Phone Number" || c.clean_type === "Mobile Number"))
      .map(c => c.original_name);
      
    const websiteColumns = columnConfigs
      .filter(c => c.included && c.clean_type === "Company Website")
      .map(c => c.original_name);
      
    const linkedinColumns = columnConfigs
      .filter(c => c.included && c.clean_type === "LinkedIn Profile URL")
      .map(c => c.original_name);
      
    return transformed.map(row => {
      const newRow = { ...row };
      
      // 1. Parse & Split Phone Numbers Country Codes
      if (validate_phones) {
        // Comprehensive list of valid ITU international country calling codes sorted by length descending
        const COUNTRY_CODES = [
          "971", "353", "852", "966", "972", "380", "506", "593", "595", "598", "994", "995", "996", "998", "375", "381",
          "91", "44", "61", "65", "33", "49", "81", "86", "31", "39", "34", "41", "46", "64", "60", "62", "63", 
          "66", "82", "84", "90", "32", "43", "45", "47", "48", "55", "52", "27", "20", "30", "36", "40", "51", "54",
          "1", "7"
        ];

        phoneColumns.forEach(col => {
          let val = String(newRow[col] || "").trim();
          if (val) {
             // Stage 1: Clean quotes, backticks, and prefix labels like "tel:", "mob:"
             val = val.replace(/^[^\w+]+|[^\w]+$/g, "");
             val = val.replace(/^(tel|phone|cell|mob|mobile|office|p|m)[:\-\s]+/i, "");
             val = val.replace(/^[^\w+]+|[^\w]+$/g, "");
             
             // Strip extension suffixes like "ext. 698", "x698", "#698" to prevent merging digits
             val = val.replace(/\s*(?:ext(?:ension)?\.?|x|#)\s*[\d\-\#\s]+$/i, "");
             
             const hasPlusIndicator = val.startsWith("+") || val.startsWith("00");
            
            // Stage 2 & 3: Purge inner punctuation/commas/spaces and extract digits
            const digits = val.replace(/\D/g, "");
            if (digits) {
              let countryCode = "";
              let localNum = digits;
              
              if (hasPlusIndicator) {
                const matchDigits = val.startsWith("00") ? digits.slice(2) : digits;
                let matchedPrefix = "";
                
                for (const prefix of COUNTRY_CODES) {
                  if (matchDigits.startsWith(prefix)) {
                    matchedPrefix = prefix;
                    break;
                  }
                }
                
                if (matchedPrefix) {
                  countryCode = `+${matchedPrefix}`;
                  localNum = matchDigits.slice(matchedPrefix.length);
                } else {
                  countryCode = "";
                  localNum = digits;
                }
              } else {
                // No plus indicator: evaluate based on standard local lengths
                if (digits.length === 10) {
                  countryCode = "";
                  localNum = digits;
                } else if (digits.length === 11 && digits.startsWith("1")) {
                  countryCode = "+1";
                  localNum = digits.slice(1);
                } else if (digits.length === 12 && digits.startsWith("91")) {
                  countryCode = "+91";
                  localNum = digits.slice(2);
                } else {
                  let matchedPrefix = "";
                  for (const prefix of COUNTRY_CODES) {
                    if (digits.startsWith(prefix) && digits.length - prefix.length >= 7) {
                      matchedPrefix = prefix;
                      break;
                    }
                  }
                  if (matchedPrefix) {
                    countryCode = `+${matchedPrefix}`;
                    localNum = digits.slice(matchedPrefix.length);
                  } else {
                    countryCode = "";
                    localNum = digits;
                  }
                }
              }
              
              newRow[`${col} Country Code`] = countryCode;
              newRow[col] = localNum;
            } else {
              newRow[`${col} Country Code`] = "";
              newRow[col] = "";
            }
          } else {
            newRow[`${col} Country Code`] = "";
          }
        });
      }
      
      // 2. Normalize Websites
      if (clean_websites) {
        websiteColumns.forEach(col => {
          let val = String(newRow[col] || "").trim();
          if (val) {
            val = val.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "");
            newRow[col] = `https://${val}`;
          }
        });
      }
      
      // 3. Sanitize LinkedIn
      if (clean_linkedin) {
        linkedinColumns.forEach(col => {
          let val = String(newRow[col] || "").trim();
          if (val) {
            val = val.split("?")[0].replace(/\/+$/, "");
            newRow[col] = val;
          }
        });
      }
      
      return newRow;
    });
  };

  const getLiveVisibleColumns = () => {
    const baseColumns = columnConfigs.filter(c => c.included);
    const result = [];
    
    baseColumns.forEach(c => {
      const isPhone = c.clean_type === "Phone Number" || c.clean_type === "Mobile Number";
      if (isPhone && cleaningOptions.validate_phones) {
        result.push(`${c.original_name} Country Code`);
      }
      result.push(c.original_name);
    });
    
    return result;
  };

  const sidebarItems = [
    { id: 1, label: "Import Data", icon: "cloud_upload" },
    { id: 2, label: "Schema Alignment", icon: "low_priority" },
    { id: 3, label: "Engine Settings", icon: "settings_suggest" },
    { id: 4, label: "Data Quality", icon: "visibility" },
    { id: 5, label: "Export Assets", icon: "download" }
  ];

  return (
    <div className="h-screen w-screen flex bg-background overflow-hidden relative">
      
      {/* Sidebar Navigation */}
      <nav className={`h-screen w-64 fixed left-0 top-0 bg-surface-container-low border-r border-outline-variant flex flex-col py-xl px-md z-40 transition-transform duration-200 md:translate-x-0 ${
        isSidebarOpen ? "translate-x-0" : "-translate-x-full md:flex"
      }`}>
        <div className="mb-xl px-sm flex justify-between items-center">
          <div 
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity select-none shrink-0"
            title="LeadSanity Home"
          >
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-md shrink-0">
              <span className="material-symbols-outlined text-on-primary text-[18px]">dataset</span>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-primary text-[20px] tracking-tight leading-none">LeadSanity</span>
              <span className="text-[10px] text-secondary font-semibold mt-1">Enterprise SaaS Suite</span>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-xs text-secondary hover:bg-surface-container rounded"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <ul className="flex flex-col gap-xs w-full mt-sm">
          {sidebarItems.map((item) => {
            const isCompleted = step > item.id;
            const isActive = step === item.id;
            const accessible = isStepAccessible(item.id);
            
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => accessible && setStep(item.id)}
                  disabled={!accessible}
                  className={`w-full flex items-center gap-md px-md py-sm rounded-xl font-label-caps text-label-caps transition-all text-left focus:outline-none ${
                    isActive 
                      ? "bg-secondary-container text-primary font-bold shadow-sm cursor-default" 
                      : accessible 
                        ? "text-primary/75 hover:bg-surface-container-high hover:text-primary cursor-pointer" 
                        : "text-on-surface-variant opacity-40 cursor-not-allowed"
                  }`}
                >
                  <span className={`material-symbols-outlined ${isActive || isCompleted ? "fill" : ""}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Sidebar Bottom: Profile + Logout */}
        <div className="mt-auto pt-md border-t border-outline-variant flex items-center justify-between px-xs py-sm shrink-0">
          
          {/* User Profile Button */}
          {userEmail && (
            <button
              onClick={() => setIsProfileOpen(true)}
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#ff6b3d] to-[#ff471a] text-white font-extrabold text-[16px] flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-md border-2 border-white/20 focus:outline-none"
              title="View Profile Settings"
            >
              {(localStorage.getItem("lead_cleaner_name") || userEmail.split("@")[0]).charAt(0).toUpperCase()}
            </button>
          )}

          {/* Logout Button */}
          {onLogout && (
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="w-10 h-10 rounded-full bg-error-container/20 hover:bg-error-container/40 text-error flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 border border-error/10 focus:outline-none"
              title="Log Out"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Hamburger FAB (visible only on small screens when sidebar is hidden) */}
      <button 
        onClick={() => setIsSidebarOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-lg hover:bg-surface-tint transition-all active:scale-90"
        style={{ display: isSidebarOpen ? 'none' : undefined }}
      >
        <span className="material-symbols-outlined text-[20px]">menu</span>
      </button>

      {/* Main Container */}
      <main className="flex-1 md:ml-64 flex flex-col h-screen overflow-hidden bg-background">

        {/* Content Canvas */}
        <div className="flex-1 overflow-auto p-gutter md:p-xl custom-scrollbar flex flex-col min-h-0">
          
          {/* Progress Stepper at top */}
          <Stepper currentStep={step} />

          {/* Core Step Pages */}
          <div className="flex-1 flex flex-col min-h-0 relative">
            
            {/* Step 1: File Import */}
            {step === 1 && (
              <FileUpload onUploadSuccess={handleUploadSuccess} />
            )}

            {/* Step 2: Field Mapping (Split Layout) */}
            {step === 2 && (
              <div className="flex-1 flex flex-col xl:flex-row gap-gutter min-h-0">
                {/* Left controls panel */}
                <div className="w-full xl:w-[38%] flex flex-col min-h-0 shrink-0">
                  <FieldMapping
                    columnConfigs={columnConfigs}
                    setColumnConfigs={setColumnConfigs}
                    onResetSchema={handleResetSchema}
                  />
                </div>
                
                {/* Right data preview panel */}
                <div className="w-full xl:w-[62%] flex flex-col min-h-0">
                  <DataPreview 
                    rows={previewRows} 
                    title="Import Preview Schema" 
                    totalRows={totalRows}
                    visibleColumns={columnConfigs.filter(c => c.included).map(c => c.original_name)}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Cleaning options checklist (Split Layout) */}
            {step === 3 && (
              <div className="flex-1 flex flex-col xl:flex-row gap-gutter min-h-0">
                {/* Left preferences panel */}
                <div className="w-full xl:w-[38%] flex flex-col min-h-0 shrink-0">
                  <CleaningOptions 
                    options={cleaningOptions} 
                    setOptions={setCleaningOptions} 
                  />
                </div>
                
                {/* Right data preview panel */}
                <div className="w-full xl:w-[62%] flex flex-col min-h-0">
                  <DataPreview 
                    rows={getLivePreviewRows()} 
                    title="Engine Simulation Preview" 
                    totalRows={totalRows}
                    visibleColumns={getLiveVisibleColumns()}
                  />
                </div>
              </div>
            )}

            {/* Step 4: Preview Cleaned data & scorecard (Split Layout) */}
            {step === 4 && (
              <div className="flex-1 flex flex-col xl:flex-row gap-gutter min-h-0">
                {/* Left scorecard panel */}
                <div className="w-full xl:w-[38%] flex flex-col min-h-0 shrink-0">
                  <CleaningSummary summary={summary} onCardClick={setActivePreviewTab} />
                </div>
                
                {/* Right cleaned data preview panel with Tab Selection */}
                <div className="w-full xl:w-[62%] flex flex-col min-h-0 gap-sm">
                  {/* Tab Selector */}
                  <div className="flex border-b border-outline-variant/60 gap-md overflow-x-auto whitespace-nowrap scrollbar-none">
                    <button
                      onClick={() => setActivePreviewTab("valid")}
                      className={`pb-sm px-xs font-label-caps text-label-caps text-xs transition-all relative font-bold flex items-center gap-[3px] shrink-0 ${
                        activePreviewTab === "valid"
                          ? "text-primary border-b-2 border-primary"
                          : "text-secondary hover:text-on-background"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                      Sanitized Leads ({summary.valid_records || 0})
                    </button>
                    <button
                      onClick={() => setActivePreviewTab("review")}
                      className={`pb-sm px-xs font-label-caps text-label-caps text-xs transition-all relative font-bold flex items-center gap-[3px] shrink-0 ${
                        activePreviewTab === "review"
                          ? "text-amber-700 border-b-2 border-amber-600"
                          : "text-secondary hover:text-on-background"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">warning</span>
                      Needs Review ({summary.needs_review || 0})
                    </button>
                    <button
                      onClick={() => setActivePreviewTab("quarantine")}
                      className={`pb-sm px-xs font-label-caps text-label-caps text-xs transition-all relative font-bold flex items-center gap-[3px] shrink-0 ${
                        activePreviewTab === "quarantine"
                          ? "text-error border-b-2 border-error"
                          : "text-secondary hover:text-on-background"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">healing</span>
                      Quarantined ({summary.invalid_records || 0})
                    </button>
                    <button
                      onClick={() => setActivePreviewTab("duplicates")}
                      className={`pb-sm px-xs font-label-caps text-label-caps text-xs transition-all relative font-bold flex items-center gap-[3px] shrink-0 ${
                        activePreviewTab === "duplicates"
                          ? "text-slate-700 border-b-2 border-slate-600"
                          : "text-secondary hover:text-on-background"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">content_copy</span>
                      Duplicates Removed ({summary.duplicates_removed || 0})
                    </button>
                  </div>

                  {/* Tab Contents */}
                  <div className="flex-1 flex flex-col min-h-0">
                    {activePreviewTab === "valid" ? (
                      <DataPreview 
                        rows={cleanedPreview} 
                        title="Sanitized Dataset Preview (Top 20 rows)" 
                        totalRows={summary.total_after_cleaning}
                      />
                    ) : activePreviewTab === "review" ? (
                      <QuarantineInspector 
                        rows={needsReviewPreview} 
                        columnConfigs={columnConfigs} 
                        onPromoteLead={handlePromoteLead} 
                        source="cleaned"
                      />
                    ) : activePreviewTab === "quarantine" ? (
                      <QuarantineInspector 
                        rows={invalidPreview} 
                        columnConfigs={columnConfigs} 
                        onPromoteLead={handlePromoteLead} 
                        source="invalid"
                      />
                    ) : (
                      <DataPreview 
                        rows={duplicatesPreview} 
                        title="Duplicate Records Removed Preview" 
                        totalRows={summary.duplicates_removed}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Download files */}
            {step === 5 && (
              <DownloadButtons 
                downloadIds={downloadIds} 
                onReset={handleReset} 
                summary={summary}
              />
            )}
          </div>

          {/* Sticky Footer Navigation Actions */}
          {step > 1 && step < 5 && (
            <div className="mt-lg pt-md border-t border-outline-variant flex justify-between items-center shrink-0">
              
              {/* Back Button */}
              <button
                onClick={() => setStep(step - 1)}
                disabled={isProcessing}
                className="px-lg py-sm rounded-xl border border-outline font-label-caps text-label-caps text-on-surface hover:bg-surface-container-low transition-all duration-150 active:scale-95 disabled:opacity-40 focus:outline-none font-semibold"
              >
                Back
              </button>

              {/* Step 2 Next Button */}
              {step === 2 && (
                <button
                  onClick={handleMappingProceed}
                  disabled={columnConfigs.filter(c => c.included).length === 0}
                  className="px-lg py-sm rounded-xl bg-primary font-label-caps text-label-caps text-on-primary hover:bg-surface-tint transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-md flex items-center gap-xs focus:outline-none focus:ring-2 focus:ring-primary font-semibold"
                >
                  Next: Pipeline Preferences
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              )}

              {/* Step 3 Clean Button */}
              {step === 3 && (
                <button
                  onClick={handleStartCleaning}
                  disabled={isProcessing}
                  className="px-lg py-sm rounded-xl bg-primary font-label-caps text-label-caps text-on-primary hover:bg-surface-tint transition-all duration-150 active:scale-95 disabled:opacity-40 shadow-md flex items-center gap-xs focus:outline-none focus:ring-2 focus:ring-primary font-semibold"
                >
                  {isProcessing ? "Powering Sanitizer..." : "Process List"}
                  <span className="material-symbols-outlined text-[18px]">
                    {isProcessing ? "hourglass_empty" : "bolt"}
                  </span>
                </button>
              )}

              {/* Step 4 Next Button */}
              {step === 4 && (
                <button
                  onClick={() => setStep(5)}
                  className="px-lg py-sm rounded-xl bg-primary font-label-caps text-label-caps text-on-primary hover:bg-surface-tint transition-all duration-150 active:scale-95 shadow-md flex items-center gap-xs focus:outline-none focus:ring-2 focus:ring-primary font-semibold"
                >
                  Proceed to Export
                  <span className="material-symbols-outlined text-[18px]">download_done</span>
                </button>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Global Processing Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-surface/90 backdrop-blur-[4px] flex flex-col items-center justify-center gap-md z-50 animate-fade-in select-none">
          <div className="w-16 h-16 relative flex items-center justify-center">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin" />
            <span className="material-symbols-outlined text-primary text-[32px] animate-pulse">bolt</span>
          </div>
          <div className="text-center max-w-md">
            <h3 className="font-headline-md text-headline-md text-primary font-bold text-[22px]">Running LeadSanity Engine</h3>
            <p className="font-body-md text-body-md text-secondary mt-sm leading-relaxed">
              Deduplicating lead lists, verifying corporate email syntaxes, applying location standards, and isolating phone country codes...
            </p>
          </div>
        </div>
      )}

      {/* Global Processing Error readout */}
      {cleaningError && (
        <div className="absolute top-20 right-gutter max-w-md bg-error-container/95 border border-error/20 rounded-2xl p-md text-error flex items-start gap-sm shadow-lg z-50 animate-slide-in shrink-0">
          <span className="material-symbols-outlined text-[24px]">error</span>
          <div className="font-body-sm text-body-sm flex-1">
            <h5 className="font-bold">Sanitization Interrupted</h5>
            <p className="mt-xs text-on-error-container">{cleaningError}</p>
            <button 
              onClick={() => setCleaningError("")}
              className="mt-sm text-xs font-semibold underline hover:opacity-80"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* User Profile Settings Panel */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onSaveSuccess={(profile) => {
          setUserEmail(localStorage.getItem("lead_cleaner_email") || "");
          if (profile.cleaning_preferences) {
            setCleaningOptions(profile.cleaning_preferences);
          }
        }}
      />

      {/* Custom Logout Confirmation Popup */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-outline-variant shadow-2xl p-6 flex flex-col items-center text-center animate-scale-up">
            <div className="w-12 h-12 rounded-full bg-error-container/30 text-error flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[28px]">logout</span>
            </div>
            <h3 className="text-lg font-extrabold text-on-surface mb-2">Confirm Logout</h3>
            <p className="text-secondary text-xs sm:text-sm mb-6 leading-relaxed">
              Are you sure you want to terminate your secure LeadSanity session? You will need to verify your email to log back in.
            </p>
            <div className="flex items-center gap-3 w-full">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 border border-outline-variant rounded-xl text-[13px] font-bold hover:bg-surface-container-low transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  if (onLogout) onLogout();
                }}
                className="flex-1 py-2.5 bg-error text-on-error rounded-xl text-[13px] font-bold hover:bg-error/90 active:scale-[0.98] transition-all shadow-md"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
