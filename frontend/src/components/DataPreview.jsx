import React, { useState } from "react";

export default function DataPreview({ rows, title = "Data Preview", totalRows = null, visibleColumns = null, onColumnClick }) {
  const [pageSize, setPageSize] = useState(20);

  if (!rows || rows.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-lg text-secondary font-body-sm">
        No preview data available.
      </div>
    );
  }

  // Get all columns based on visibleColumns ordering or row keys
  let columns = [];
  if (visibleColumns) {
    const rowKeys = Object.keys(rows[0]);
    columns = visibleColumns.filter(col => rowKeys.includes(col));
  } else {
    columns = Object.keys(rows[0]);
  }

  // Helper to determine if a cell has an error or warning for highlighting
  const getCellHighlightClass = (row, col, value) => {
    const status = row["Data Quality Status"];
    const remarks = (row["Cleaning Remarks"] || "").toLowerCase();
    const colLower = col.toLowerCase();
    
    // Cleaned table cell highlighting logic
    if (status) {
      if (status === "Invalid") {
        if (colLower.includes("email") && remarks.includes("email")) {
          return "bg-error-container/30 text-error font-semibold";
        }
        if ((colLower.includes("phone") || colLower.includes("mobile")) && remarks.includes("phone")) {
          return "bg-error-container/30 text-error font-semibold";
        }
        if (colLower.includes("linkedin") && remarks.includes("linkedin")) {
          return "bg-error-container/30 text-error font-semibold";
        }
      }
      
      if (status === "Needs Review" || status === "Invalid") {
        if (colLower.includes("website") && remarks.includes("website")) {
          return "bg-amber-100 dark:bg-on-tertiary-fixed-variant/40 text-amber-800 dark:text-inverse-primary";
        }
        if (colLower.includes("first name") && remarks.includes("first name")) {
          return "bg-amber-100 dark:bg-on-tertiary-fixed-variant/40 text-amber-800 dark:text-inverse-primary";
        }
        if (colLower.includes("last name") && remarks.includes("last name")) {
          return "bg-amber-100 dark:bg-on-tertiary-fixed-variant/40 text-amber-800 dark:text-inverse-primary";
        }
      }
    }

    // Original table (Step 2) cell highlighting logic
    // Highlights raw values that fail syntax checks
    const valStr = value !== null && value !== undefined ? String(value).trim() : "";
    if (colLower.includes("email") || colLower.includes("addr")) {
      if (valStr && (!valStr.includes("@") || !valStr.includes("."))) {
        return "bg-error-container/30 text-error font-semibold";
      }
    }
    if (colLower.includes("phone") || colLower.includes("mobile")) {
      if (valStr && valStr.length > 0) {
        const digits = valStr.replace(/\D/g, "");
        if (digits.length < 7 || digits.length > 15) {
          return "bg-error-container/30 text-error font-semibold";
        }
      }
    }

    // Default formatting
    if (col === "Cleaning Remarks") {
      if (status === "Invalid") return "text-error font-semibold";
      if (status === "Needs Review") return "text-amber-700 font-semibold";
      if (status === "Valid") return "text-green-700 font-semibold";
      if (status === "Original") return "text-green-800 font-semibold";
      if (status === "Duplicate") return "text-red-700 font-semibold";
    }

    if (col === "Data Quality Status") {
      if (value === "Valid") return "text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded-full text-xs";
      if (value === "Needs Review") return "text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-full text-xs";
      if (value === "Invalid") return "text-error font-bold bg-red-50 px-2 py-0.5 rounded-full text-xs";
      if (value === "Duplicate") return "text-red-700 font-bold bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded-full text-xs";
      if (value === "Original") return "text-green-700 font-bold bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded-full text-xs";
    }

    return "";
  };

  // If no columns are selected, render a beautiful empty-state placeholder card
  if (columns.length === 0) {
    return (
      <div className="w-full h-full flex flex-col bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden shadow-sm min-h-[380px]">
        {/* Header Panel */}
        <div className="bg-surface-container-low px-md py-sm border-b border-surface-variant flex justify-between items-center shrink-0">
          <h3 className="font-title-sm text-title-sm text-on-background font-bold">{title}</h3>
          <span className="font-label-caps text-[11px] text-secondary bg-surface-variant px-sm py-[2px] rounded-full">
            Showing 0 rows
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center p-lg text-secondary font-body-sm">
          No columns selected. Check at least one column in "Column Settings" to preview its data.
        </div>
      </div>
    );
  }

  const displayedRows = rows.slice(0, pageSize);

  return (
    <div className="w-full h-full flex flex-col bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden shadow-sm min-h-[380px]">
      {/* Header Panel */}
      <div className="bg-surface-container-low px-md py-sm border-b border-surface-variant flex justify-between items-center shrink-0 flex-wrap gap-xs">
        <h3 className="font-title-sm text-title-sm text-on-background font-bold">{title}</h3>
        <div className="flex items-center gap-md">
          {/* Row limit selector */}
          <div className="flex items-center gap-xs">
            <span className="text-[11px] font-bold text-secondary font-sans">Rows to show:</span>
            <select
              value={pageSize === rows.length ? "all" : pageSize}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "all") {
                  setPageSize(rows.length);
                } else {
                  setPageSize(Number(val));
                }
              }}
              className="bg-white border border-outline-variant rounded px-xs py-[2px] text-[11px] font-bold text-secondary focus:outline-none focus:border-primary cursor-pointer shadow-sm"
            >
              <option value={20}>20</option>
              {rows.length > 20 && <option value={50}>50</option>}
              {rows.length > 50 && <option value={100}>100</option>}
              <option value="all">All ({rows.length})</option>
            </select>
          </div>
          
          <span className="font-label-caps text-[11px] text-secondary bg-surface-variant px-sm py-[2px] rounded-full font-bold">
            Showing {displayedRows.length} of {totalRows || rows.length} rows
          </span>
        </div>
      </div>

      {/* Table grid */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead className="sticky top-0 bg-surface z-10 border-b border-surface-variant">
            <tr>
              {columns.map((col) => {
                const baseCol = col.endsWith(" Time") ? col.slice(0, -5) : col;
                return (
                  <th 
                    key={col} 
                    onClick={() => onColumnClick && onColumnClick(baseCol)}
                    className="font-label-caps text-label-caps text-on-surface-variant px-md py-sm bg-surface-container-low whitespace-nowrap border-r border-surface-variant/40 cursor-pointer hover:bg-surface-container-high hover:text-primary transition-all duration-150 select-none"
                    title={`Click to find '${baseCol}' in Column Settings`}
                  >
                    {col}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="font-table-data text-table-data text-on-background">
            {displayedRows.map((row, rIdx) => {
              const status = row["Data Quality Status"];
              const isOriginal = status === "Original";
              const isDuplicate = status === "Duplicate";
              const rowClass = isDuplicate 
                ? "bg-red-50/60 dark:bg-red-950/15 hover:bg-red-100/50 border-b border-red-100/60 text-red-950 dark:text-red-300 transition-colors" 
                : isOriginal 
                  ? "bg-green-50/50 dark:bg-green-950/10 hover:bg-green-100/45 border-b border-green-100/60 text-green-950 dark:text-green-300 transition-colors font-medium" 
                  : "border-b border-surface-variant/50 hover:bg-surface-container-low/50 transition-colors";

              return (
                <tr key={rIdx} className={rowClass}>
                  {columns.map((col) => {
                    const val = row[col];
                    const displayVal = val === null || val === undefined ? "" : String(val);
                    const highlightClass = getCellHighlightClass(row, col, val);
                    
                    return (
                      <td 
                        key={col} 
                        className={`px-md py-sm whitespace-nowrap border-r border-surface-variant/20 max-w-xs truncate ${highlightClass}`}
                        title={displayVal}
                      >
                        {displayVal}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
