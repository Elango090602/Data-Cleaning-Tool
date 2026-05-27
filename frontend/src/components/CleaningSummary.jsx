import React from "react";

export default function CleaningSummary({ summary, onCardClick }) {
  if (!summary) return null;

  const cards = [
    {
      label: "Total Uploaded",
      value: summary.total_uploaded,
      icon: "cloud_upload",
      bgClass: "bg-surface-container-low border-surface-variant/60",
      textClass: "text-secondary font-bold"
    },
    {
      label: "Ready for Sales",
      value: summary.total_after_cleaning,
      icon: "task_alt",
      bgClass: "bg-primary-container/10 border-primary-container/20 cursor-pointer hover:border-primary/45 hover:bg-primary-container/20",
      textClass: "text-primary font-bold",
      tab: "valid"
    },
    {
      label: "Valid Leads",
      value: summary.valid_records,
      icon: "verified",
      bgClass: "bg-green-500/10 border-green-500/20 cursor-pointer hover:border-green-500/40 hover:bg-green-500/20",
      textClass: "text-green-700 font-bold",
      tab: "valid"
    },
    {
      label: "Needs Review",
      value: summary.needs_review,
      icon: "warning",
      bgClass: "bg-amber-500/10 border-amber-500/20 cursor-pointer hover:border-amber-500/40 hover:bg-amber-500/20",
      textClass: "text-amber-800 font-bold",
      tab: "review"
    },
    {
      label: "Quarantined Leads",
      value: summary.invalid_records,
      icon: "cancel",
      bgClass: "bg-error-container/20 border-error/20 cursor-pointer hover:border-error/40 hover:bg-error-container/30",
      textClass: "text-error font-bold",
      tab: "quarantine"
    },
    {
      label: "Duplicates Removed",
      value: summary.duplicates_removed,
      icon: "content_copy",
      bgClass: "bg-secondary-container/20 border-secondary-container/40 cursor-pointer hover:border-secondary-container/80 hover:bg-secondary-container/30",
      textClass: "text-on-secondary-container font-bold",
      tab: "duplicates"
    },
    {
      label: "Invalid Emails",
      value: summary.invalid_emails,
      icon: "mail_lock",
      bgClass: "bg-surface-container-low border-surface-variant/40",
      textClass: "text-secondary font-semibold"
    },
    {
      label: "Invalid Phones",
      value: summary.invalid_phones,
      icon: "phone_disabled",
      bgClass: "bg-surface-container-low border-surface-variant/40",
      textClass: "text-secondary font-semibold"
    },
    {
      label: "Engine Latency",
      value: `${summary.processing_time_ms} ms`,
      icon: "speed",
      bgClass: "bg-surface-container-low border-surface-variant/40",
      textClass: "text-secondary font-semibold"
    }
  ];

  return (
    <div className="w-full flex flex-col gap-sm">
      <div className="shrink-0 mb-xs text-center xl:text-left">
        <h3 className="font-title-sm text-title-sm text-on-background font-bold text-[20px] tracking-tight">
          Data Sanitization Analytics
        </h3>
        <p className="font-body-sm text-body-sm text-secondary">
          Complete breakdown of list performance, contact sanitization rates, and validation logs.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-md flex-1 overflow-auto pr-xs custom-scrollbar">
        {cards.map((card) => (
          <div 
            key={card.label} 
            onClick={() => card.tab && onCardClick && onCardClick(card.tab)}
            className={`border rounded-2xl p-md flex items-center justify-between shadow-sm transition-all hover:scale-[1.01] hover:shadow-md ${card.bgClass}`}
          >
            <div className="flex flex-col gap-xs">
              <span className="font-label-caps text-[10px] uppercase tracking-wider text-secondary font-bold">
                {card.label}
              </span>
              <span className={`font-headline-md text-[24px] tracking-tight ${card.textClass}`}>
                {card.value}
              </span>
            </div>
            
            <div className="text-secondary opacity-70 shrink-0">
              <span className="material-symbols-outlined text-[28px]">{card.icon}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
