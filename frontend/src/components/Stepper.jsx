import React from "react";

const STEPS = [
  { id: 1, label: "Upload" },
  { id: 2, label: "Map Fields" },
  { id: 3, label: "Clean Options" },
  { id: 4, label: "Preview" },
  { id: 5, label: "Download" }
];

export default function Stepper({ currentStep }) {
  // Calculate percentage for progress line
  // Step 1: 0%, Step 2: 25%, Step 3: 50%, Step 4: 75%, Step 5: 100%
  const progressPercent = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="w-full max-w-3xl mx-auto mb-xl relative shrink-0">
      {/* Background connector line */}
      <div className="absolute left-0 top-4 -translate-y-1/2 w-full h-[2px] bg-surface-variant z-0" />
      
      {/* Active progress indicator line */}
      <div 
        className="absolute left-0 top-4 -translate-y-1/2 h-[2px] bg-primary transition-all duration-300 ease-out z-0"
        style={{ width: `${progressPercent}%` }}
      />
      
      {/* Stepper nodes */}
      <div className="flex items-center justify-between relative z-10 w-full">
        {STEPS.map((step) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;
          
          return (
            <div key={step.id} className="flex flex-col items-center gap-sm">
              {/* Circle indicator */}
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                  isCompleted 
                    ? "bg-primary text-on-primary" 
                    : isActive 
                      ? "bg-surface-container-lowest border-2 border-primary text-primary" 
                      : "bg-surface-container-lowest border-2 border-outline-variant text-outline"
                }`}
              >
                {isCompleted ? (
                  <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                ) : (
                  step.id
                )}
              </div>
              
              {/* Label */}
              <span 
                className={`font-label-caps text-[11px] uppercase tracking-wider ${
                  isActive || isCompleted 
                    ? "text-primary font-semibold" 
                    : "text-outline"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
