import React from "react";

const OPTIONS_METADATA = [
  {
    key: "validate_emails",
    label: "Verify Business Emails",
    description: "Syntax checks, MX records lookups, and trailing space purges."
  },
  {
    key: "validate_phones",
    label: "Format & Parse Phone Numbers",
    description: "Separate country codes (+91, +1) into isolated prefix columns."
  },
  {
    key: "clean_linkedin",
    label: "Sanitize LinkedIn Profiles",
    description: "Normalize handles, strip tracker parameters, and trim slashes."
  },
  {
    key: "clean_websites",
    label: "Normalize Company Websites",
    description: "Clean domain extensions and enforce secure https:// prefixes."
  },
  {
    key: "remove_duplicates",
    label: "Intelligent B2B Deduplication",
    description: "Filter identical records by email, phone, or corporate handle."
  },
  {
    key: "remove_blank_rows",
    label: "Omit Incomplete Leads",
    description: "Remove rows missing all critical names, email, and phone info."
  },
  {
    key: "generate_invalid_file",
    label: "Isolate Invalid Anomalies",
    description: "Quarantine failed contacts into a separate audit spreadsheet."
  },
  {
    key: "generate_duplicate_file",
    label: "Archive Deduplicated Leads",
    description: "Save duplicate rows into a separate historic check file."
  }
];

export default function CleaningOptions({ options, setOptions }) {
  const handleToggle = (key) => {
    setOptions({
      ...options,
      [key]: !options[key]
    });
  };

  const activeCount = Object.keys(OPTIONS_METADATA).filter(opt => !!options[OPTIONS_METADATA[opt.key]]).length;

  return (
    <div className="w-full h-full flex flex-col bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden shadow-sm">
      {/* Dynamic low-contrast header to match Column settings */}
      <div className="bg-surface-container-low px-md py-sm border-b border-surface-variant shrink-0 flex justify-between items-center font-sans">
        <div className="flex items-center gap-sm">
          <h3 className="font-title-sm text-title-sm text-on-background font-bold">Engine Preferences</h3>
          <span className="font-label-caps text-[11px] text-secondary bg-surface-variant px-sm py-[2px] rounded-full">
            {Object.values(options).filter(Boolean).length} Active Options
          </span>
        </div>
      </div>

      {/* Scrollable list container */}
      <div className="flex-1 overflow-auto p-md custom-scrollbar flex flex-col gap-sm">
        {OPTIONS_METADATA.map((opt) => {
          const isChecked = !!options[opt.key];
          
          return (
            <label 
              key={opt.key}
              className={`flex items-start justify-between cursor-pointer p-md border rounded-xl transition-all duration-150 select-none group ${
                isChecked
                  ? "bg-surface-container-lowest border-primary/30 shadow-sm"
                  : "bg-surface-container-low/20 border-surface-variant/40 opacity-75 hover:opacity-100 hover:bg-surface-container-low/40"
              }`}
            >
              <div className="flex flex-col pr-md min-w-0">
                <span className={`font-body-md text-body-md font-bold transition-colors group-hover:text-primary ${
                  isChecked ? "text-primary" : "text-on-background"
                }`}>
                  {opt.label}
                </span>
                <span className="font-body-sm text-xs text-secondary mt-xs leading-normal">
                  {opt.description}
                </span>
              </div>
              
              {/* Sleek Toggle Switch */}
              <div className="relative inline-flex items-center mt-xs shrink-0">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggle(opt.key)}
                  className="sr-only peer"
                />
                <div 
                  className="w-10 h-5 bg-surface-variant peer-focus:outline-none rounded-full peer 
                             peer-checked:after:translate-x-full peer-checked:after:border-white 
                             after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                             after:bg-white after:border-gray-300 after:border after:rounded-full 
                             after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"
                />
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
