import React, { useState, useRef } from "react";

const CLEAN_RULE_TYPES = [
  { value: "", label: "No Cleaning (None)" },
  { value: "First Name", label: "First Name (Title Case)" },
  { value: "Last Name", label: "Last Name (Title Case)" },
  { value: "Full Name", label: "Full Name (Title Case)" },
  { value: "Job Title", label: "Job Title (Title Case)" },
  { value: "Company Name", label: "Company Name (Title Case)" },
  { value: "Company Website", label: "Company Website (URL Format)" },
  { value: "Email", label: "Email (Syntax & Domain Verify)" },
  { value: "Phone Number", label: "Phone Number (E.164 Normalize)" },
  { value: "Mobile Number", label: "Mobile Number (E.164 Normalize)" },
  { value: "LinkedIn Profile URL", label: "LinkedIn URL (Strip Trackers)" },
  { value: "City", label: "City (Clean Casing)" },
  { value: "State", label: "State (Clean Casing)" },
  { value: "Country", label: "Country (Normalize ISO Code)" },
  { value: "Industry", label: "Industry (Clean Casing)" },
  { value: "Employee Size", label: "Employee Size (Numeric)" },
  { value: "Revenue", label: "Revenue (Numeric)" },
  { value: "Lead Source", label: "Lead Source (Clean Casing)" },
  { value: "Date (DD-MM-YYYY)", label: "Date (DD-MM-YYYY)" },
  { value: "Date (Split Date & Time)", label: "Date (Split Date & Time)" }
];

export default function FieldMapping({ columnConfigs, setColumnConfigs, onResetSchema, scrollToColumn }) {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [isDraggable, setIsDraggable] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const scrollContainerRef = useRef(null);

  React.useEffect(() => {
    if (scrollToColumn && scrollToColumn.name) {
      setSearchQuery("");
      setTimeout(() => {
        const element = document.getElementById(`col-card-${scrollToColumn.name}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.classList.add("!bg-indigo-50/70", "!border-indigo-600", "ring-4", "ring-indigo-600/10");
          setTimeout(() => {
            element.classList.remove("!bg-indigo-50/70", "!border-indigo-600", "ring-4", "ring-indigo-600/10");
          }, 2000);
        }
      }, 100);
    }
  }, [scrollToColumn]);

  const handleToggleInclude = (originalIndex) => {
    const updated = [...columnConfigs];
    updated[originalIndex].included = !updated[originalIndex].included;
    setColumnConfigs(updated);
  };

  const handleToggleAll = (includedState) => {
    const updated = columnConfigs.map(c => ({
      ...c,
      included: includedState
    }));
    setColumnConfigs(updated);
  };

  const handleRename = (originalIndex, newName) => {
    const updated = [...columnConfigs];
    updated[originalIndex].output_name = newName;
    setColumnConfigs(updated);
  };

  const handleSelectRule = (originalIndex, ruleValue) => {
    const updated = [...columnConfigs];
    updated[originalIndex].clean_type = ruleValue;
    setColumnConfigs(updated);
  };

  const handleMoveUp = (originalIndex) => {
    if (originalIndex === 0) return;
    const updated = [...columnConfigs];
    const temp = updated[originalIndex];
    updated[originalIndex] = updated[originalIndex - 1];
    updated[originalIndex - 1] = temp;
    setColumnConfigs(updated);
  };

  const handleMoveDown = (originalIndex) => {
    if (originalIndex === columnConfigs.length - 1) return;
    const updated = [...columnConfigs];
    const temp = updated[originalIndex];
    updated[originalIndex] = updated[originalIndex + 1];
    updated[originalIndex + 1] = temp;
    setColumnConfigs(updated);
  };

  // Drag Handlers
  const handleDragStart = (e, originalIndex) => {
    setDraggedIndex(originalIndex);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setIsDraggable(false);
  };

  const handleDragEnter = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    
    // Swap position immediately
    const updated = [...columnConfigs];
    const draggedItem = updated[draggedIndex];
    
    updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, draggedItem);
    
    setDraggedIndex(targetIndex);
    setColumnConfigs(updated);
  };

  // Container Drag Over with Edge-Detection Auto-Scrolling
  const handleContainerDragOver = (e) => {
    e.preventDefault();
    const container = scrollContainerRef.current;
    if (!container || draggedIndex === null) return;

    const rect = container.getBoundingClientRect();
    const mouseY = e.clientY;

    // Detect boundaries (60px margins)
    const topThreshold = rect.top + 60;
    const bottomThreshold = rect.bottom - 60;

    if (mouseY < topThreshold) {
      const speed = Math.max(2, Math.min(10, (topThreshold - mouseY) / 3));
      container.scrollTop -= speed;
    } else if (mouseY > bottomThreshold) {
      const speed = Math.max(2, Math.min(10, (mouseY - bottomThreshold) / 3));
      container.scrollTop += speed;
    }
  };

  // Filter columns based on Search query
  const filteredConfigs = columnConfigs
    .map((config, index) => ({ config, originalIndex: index }))
    .filter(({ config }) => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      return (
        config.original_name.toLowerCase().includes(query) ||
        config.output_name.toLowerCase().includes(query) ||
        (config.clean_type || "").toLowerCase().includes(query)
      );
    });

  const isSearchActive = searchQuery.trim().length > 0;

  return (
    <div className="w-full h-full flex flex-col bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden shadow-sm relative">
      {/* Header Panel */}
      <div className="bg-surface-container-low px-md py-sm border-b border-surface-variant shrink-0 flex justify-between items-center flex-wrap gap-xs font-sans">
        <div className="flex items-center gap-sm">
          <h3 className="font-title-sm text-title-sm text-on-background font-bold">Column Settings</h3>
          <span className="font-label-caps text-[11px] text-secondary bg-surface-variant px-sm py-[2px] rounded-full">
            {columnConfigs.filter(c => c.included).length} of {columnConfigs.length} Columns
          </span>
        </div>
        <div className="flex items-center gap-sm">
          <button 
            type="button"
            onClick={() => handleToggleAll(true)}
            className="text-xs font-semibold text-primary hover:underline hover:opacity-85 focus:outline-none transition-opacity"
          >
            Select All
          </button>
          <span className="text-secondary/40 text-[10px]">|</span>
          <button 
            type="button"
            onClick={() => handleToggleAll(false)}
            className="text-xs font-semibold text-secondary hover:underline hover:opacity-85 focus:outline-none transition-opacity"
          >
            Unselect All
          </button>
          <span className="text-secondary/40 text-[10px]">|</span>
          <button 
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="text-xs font-semibold text-error hover:underline hover:opacity-85 focus:outline-none transition-opacity flex items-center gap-xs"
            title="Reset columns to original imported schemas & position"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            Reset
          </button>
        </div>
      </div>

      {/* Real-time Search Input Panel */}
      <div className="px-md py-sm border-b border-surface-variant/40 shrink-0 bg-surface-container-lowest">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-secondary/60 text-[20px] pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search original headers or custom names..."
            className="w-full bg-surface-container-low border border-outline-variant font-body-sm text-body-sm rounded-xl pl-10 pr-10 py-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-on-background font-medium shadow-inner"
          />
          {isSearchActive && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-md top-1/2 -translate-y-1/2 text-secondary hover:text-primary p-xs rounded focus:outline-none flex items-center justify-center transition-colors"
              title="Clear search query"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Mapping list scroll container */}
      <div 
        ref={scrollContainerRef}
        onDragOver={handleContainerDragOver}
        className="flex-1 overflow-auto p-md custom-scrollbar"
      >
        <div className="flex flex-col gap-md">
          {filteredConfigs.map(({ config, originalIndex }, index) => {
            // Drag and drop is locked during active searching to protect positional consistency
            const isDragging = originalIndex === draggedIndex;
            const canDrag = isDraggable && !isSearchActive;
            
            return (
              <div 
                key={config.original_name} 
                id={`col-card-${config.original_name}`}
                draggable={canDrag}
                onDragStart={(e) => handleDragStart(e, originalIndex)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={(e) => handleDragEnter(e, originalIndex)}
                className={`flex flex-col gap-sm border border-surface-variant/30 pb-md rounded-xl p-md transition-all duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] transform-gpu ${
                  config.included 
                    ? "bg-surface-container-lowest shadow-sm hover:shadow-md border-surface-variant/50" 
                    : "bg-surface-container-low/40 opacity-70 border-dashed"
                } ${isDragging ? "opacity-30 border-2 border-primary border-dashed bg-primary/5 scale-[0.98] rotate-[0.5deg]" : ""}`}
              >
                {/* Inclusion checkbox, Original label, and Sorting controls */}
                <div className="flex items-center justify-between gap-sm">
                  <div className="flex items-center gap-sm min-w-0">
                    {/* Dedicated Grab Handle (only active if searching is paused) */}
                    {!isSearchActive ? (
                      <div 
                        onMouseDown={() => setIsDraggable(true)}
                        onMouseUp={() => setIsDraggable(false)}
                        className="drag-handle cursor-grab active:cursor-grabbing p-xs rounded-lg hover:bg-surface-variant/50 text-secondary/40 hover:text-primary transition-all duration-150 shrink-0 flex items-center select-none" 
                        title="Drag to reorder column position"
                      >
                        <span className="material-symbols-outlined text-[20px]">drag_indicator</span>
                      </div>
                    ) : (
                      <div className="p-xs text-secondary/20 shrink-0 flex items-center select-none cursor-not-allowed" title="Reordering suspended during active search">
                        <span className="material-symbols-outlined text-[20px]">drag_indicator</span>
                      </div>
                    )}

                    <input
                      type="checkbox"
                      checked={config.included}
                      onChange={() => handleToggleInclude(originalIndex)}
                      className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer shrink-0"
                      title={config.included ? "Include in output export" : "Exclude from output export"}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider font-semibold">
                        Original Header
                      </span>
                      <span className="font-body-md text-body-md text-on-background font-bold truncate" title={config.original_name}>
                        {config.original_name}
                      </span>
                    </div>
                  </div>

                  {/* Reordering Controls (Only visible when not searching) */}
                  {!isSearchActive && (
                    <div className="flex items-center gap-xs shrink-0 select-none">
                      <button
                        type="button"
                        disabled={originalIndex === 0}
                        onClick={() => handleMoveUp(originalIndex)}
                        className={`p-1 rounded-lg hover:bg-surface-variant text-secondary/60 hover:text-primary transition-colors focus:outline-none ${
                          originalIndex === 0 ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
                        }`}
                        title="Move Column Up"
                      >
                        <span className="material-symbols-outlined text-[20px]">keyboard_arrow_up</span>
                      </button>
                      <button
                        type="button"
                        disabled={originalIndex === columnConfigs.length - 1}
                        onClick={() => handleMoveDown(originalIndex)}
                        className={`p-1 rounded-lg hover:bg-surface-variant text-secondary/60 hover:text-primary transition-colors focus:outline-none ${
                          originalIndex === columnConfigs.length - 1 ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
                        }`}
                        title="Move Column Down"
                      >
                        <span className="material-symbols-outlined text-[20px]">keyboard_arrow_down</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Inline form controls (Only active if included is true) */}
                {config.included && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm pl-8">
                    {/* Rename Field */}
                    <div className="flex flex-col gap-xs">
                      <label className="font-label-caps text-[10px] text-on-surface-variant font-bold">
                        Rename Column to
                      </label>
                      <input
                        type="text"
                        value={config.output_name}
                        onChange={(e) => handleRename(originalIndex, e.target.value)}
                        placeholder={config.original_name}
                        className="w-full bg-surface-container-lowest border border-outline-variant font-body-sm text-body-sm rounded-lg px-md py-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-on-background font-medium"
                      />
                    </div>

                    {/* Cleaning Rules Dropdown */}
                    <div className="flex flex-col gap-xs">
                      <label className="font-label-caps text-[10px] text-on-surface-variant font-bold">
                        Apply Cleaning Rules
                      </label>
                      <div className="relative">
                        <select
                          value={config.clean_type || ""}
                          onChange={(e) => handleSelectRule(originalIndex, e.target.value)}
                          className={`w-full appearance-none bg-surface-container-lowest border border-outline-variant font-body-sm text-body-sm rounded-lg px-md py-sm pr-10 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors cursor-pointer ${
                            !config.clean_type ? "text-secondary" : "text-primary font-bold"
                          }`}
                        >
                          {CLEAN_RULE_TYPES.map((rule) => (
                            <option key={rule.value} value={rule.value}>
                              {rule.label}
                            </option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-md top-1/2 -translate-y-1/2 text-secondary pointer-events-none text-[20px]">
                          expand_more
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Search Empty State */}
          {filteredConfigs.length === 0 && (
            <div className="p-xl text-center text-secondary font-body-sm flex flex-col items-center justify-center gap-xs select-none">
              <span className="material-symbols-outlined text-[36px] text-secondary/35">search_off</span>
              <span className="font-bold text-on-background text-[15px] mt-xs">No Matching Columns Found</span>
              <span className="text-secondary/75 max-w-[200px] leading-relaxed text-xs">
                We couldn't find any headers matching "{searchQuery}". Try a different keyword.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Custom Confirmation Modal overlay */}
      {showResetConfirm && (
        <div className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-[2px] flex items-center justify-center p-md z-50 animate-fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-lg shadow-xl max-w-[280px] text-center flex flex-col items-center gap-md animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700">
              <span className="material-symbols-outlined text-[26px]">warning</span>
            </div>
            <div>
              <h4 className="font-title-sm text-title-sm text-on-background font-bold text-[16px]">Reset Schema Settings?</h4>
              <p className="font-body-sm text-body-sm text-secondary mt-xs leading-relaxed">
                This will restore all columns to their original positions, custom names, and automatic rule recommendations.
              </p>
            </div>
            <div className="flex gap-sm w-full mt-sm">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-sm rounded-xl border border-outline font-label-caps text-label-caps text-on-surface hover:bg-surface-container-low transition-all duration-150 active:scale-95 text-xs font-semibold"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetSchema();
                  setShowResetConfirm(false);
                }}
                className="flex-1 py-sm rounded-xl bg-primary text-on-primary font-label-caps text-label-caps hover:bg-surface-tint shadow-md transition-all duration-150 active:scale-95 text-xs font-bold"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
