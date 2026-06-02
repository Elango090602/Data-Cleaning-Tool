import React, { useState, useEffect } from "react";
import { getUserProfile, updateUserProfile } from "../services/api";

export default function UserProfileModal({ isOpen, onClose, onSaveSuccess }) {
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    company_name: "",
    job_role: "",
    export_format: "csv",
    cleaning_preferences: {
      validate_emails: true,
      validate_phones: true,
      clean_linkedin: true,
      clean_websites: true,
      remove_duplicates: true,
      remove_blank_rows: true,
      generate_invalid_file: true,
      generate_duplicate_file: true
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const email = localStorage.getItem("lead_cleaner_email") || "";
  
  // Compute initials based on first and last name
  const initials = profile.first_name
    ? (profile.first_name[0] + (profile.last_name ? profile.last_name[0] : "")).toUpperCase().slice(0, 2)
    : email.slice(0, 2).toUpperCase();

  // Load profile when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setErrorMessage("");
      setSuccessMessage("");
      getUserProfile()
        .then((data) => {
          setProfile(data);
          setIsLoading(false);
        })
        .catch((err) => {
          setErrorMessage(err.message || "Failed to load profile. Please sign in again.");
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  // Prevent background scrolling when UserProfileModal or Logout confirm popup is open
  useEffect(() => {
    if (isOpen || showLogoutConfirm) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, showLogoutConfirm]);

  const handlePreferenceChange = (key) => {
    setProfile(prev => ({
      ...prev,
      cleaning_preferences: {
        ...prev.cleaning_preferences,
        [key]: !prev.cleaning_preferences[key]
      }
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await updateUserProfile(profile);
      if (res.success) {
        setSuccessMessage("Settings saved successfully!");
        
        // Persist only the First Name as the primary display name below profile badge
        localStorage.setItem("lead_cleaner_name", profile.first_name);
        
        if (onSaveSuccess) {
          onSaveSuccess(profile);
        }
        
        setTimeout(() => {
          setSuccessMessage("");
          onClose();
        }, 1200);
      }
    } catch (err) {
      setErrorMessage(err.message || "Failed to update profile settings.");
    } finally {
      setIsSaving(false);
    }
  };

  // Perform full session logout and window reload
  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-outline-variant shadow-2xl p-6 xs:p-8 flex flex-col max-h-[90vh] overflow-hidden animate-scale-up">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-secondary hover:text-on-surface transition-all duration-200"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-4 border-b border-outline-variant/30 pb-4 mb-6 shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-surface-tint flex items-center justify-center text-on-primary font-bold text-lg shadow-md shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-extrabold text-on-surface flex items-center gap-1.5 leading-tight">
              User Profile & Defaults
            </h3>
            <p className="text-secondary text-[12px] sm:text-[13px] mt-0.5 truncate font-medium">
              {email} (Verified Session)
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <span className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
            <p className="text-secondary text-sm font-semibold">Retrieving secure settings...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0 overflow-y-auto pr-1 custom-scrollbar">
            
            {/* Split Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
              
              {/* Left Column: Personal Settings */}
              <div className="space-y-4">
                <h4 className="text-[12px] font-bold text-primary uppercase tracking-wider border-b border-outline-variant/30 pb-1.5">
                  Identity Details
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-secondary uppercase tracking-wider mb-1.5">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jane"
                      value={profile.first_name}
                      onChange={(e) => setProfile(p => ({ ...p, first_name: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-outline-variant text-[13px] bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-secondary uppercase tracking-wider mb-1.5 text-ellipsis overflow-hidden whitespace-nowrap">
                      Last Name <span className="text-[9px] font-normal text-secondary/70 lowercase">(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Doe"
                      value={profile.last_name || ""}
                      onChange={(e) => setProfile(p => ({ ...p, last_name: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-outline-variant text-[13px] bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-secondary uppercase tracking-wider mb-1.5">
                    Company Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corp"
                    value={profile.company_name}
                    onChange={(e) => setProfile(p => ({ ...p, company_name: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-outline-variant text-[13px] bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-secondary uppercase tracking-wider mb-1.5">
                    Job Title / Role
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. GTM Operations Lead"
                    value={profile.job_role}
                    onChange={(e) => setProfile(p => ({ ...p, job_role: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-outline-variant text-[13px] bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-secondary uppercase tracking-wider mb-1.5">
                    Preferred Export Format
                  </label>
                  <select
                    value={profile.export_format}
                    onChange={(e) => setProfile(p => ({ ...p, export_format: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-outline-variant text-[13px] bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
                  >
                    <option value="csv">Standard CSV File (.csv)</option>
                    <option value="xlsx">Microsoft Excel Spreadsheet (.xlsx)</option>
                  </select>
                </div>
              </div>

              {/* Right Column: Default Cleaning Preferences */}
              <div className="space-y-4">
                <h4 className="text-[12px] font-bold text-primary uppercase tracking-wider border-b border-outline-variant/30 pb-1.5">
                  Default Sanitization Rules
                </h4>

                <p className="text-secondary text-[11px] leading-relaxed mb-2">
                  Pre-configure your pipeline options. When uploading a new file, these settings are activated by default.
                </p>

                <div className="space-y-2.5 bg-surface-container-low/40 rounded-2xl border border-outline-variant/50 p-4">
                  {[
                    { key: "validate_emails", label: "Verify Email Syntax & Domains", icon: "alternate_email" },
                    { key: "validate_phones", label: "Prune/Format Phone Numbers", icon: "call" },
                    { key: "clean_linkedin", label: "Sanitize LinkedIn Profile URLs", icon: "share" },
                    { key: "clean_websites", label: "Normalize Web URLs & Domains", icon: "language" },
                    { key: "remove_duplicates", label: "Remove Identical Duplicate Leads", icon: "copy_all" },
                    { key: "remove_blank_rows", label: "Skip Empty/Blank Rows", icon: "space_bar" }
                  ].map(pref => (
                    <label key={pref.key} className="flex items-center justify-between cursor-pointer py-1 group hover:-translate-x-0.5 transition-transform">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-secondary group-hover:text-primary transition-colors">{pref.icon}</span>
                        <span className="text-[12px] font-semibold text-on-surface">{pref.label}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={profile.cleaning_preferences[pref.key] ?? true}
                        onChange={() => handlePreferenceChange(pref.key)}
                        className="w-4 h-4 text-primary focus:ring-primary border-outline rounded cursor-pointer"
                      />
                    </label>
                  ))}
                </div>
              </div>

            </div>

            {/* Notifications Panel */}
            {errorMessage && (
              <div className="flex items-start gap-2 p-3 bg-error-container/20 border border-error/20 text-error rounded-xl text-[11px] sm:text-[12px] font-medium leading-normal animate-shake mb-4 shrink-0">
                <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-[11px] sm:text-[12px] font-medium leading-normal mb-4 shrink-0 animate-scale-up">
                <span className="material-symbols-outlined text-[16px] text-green-500 shrink-0">verified</span>
                {successMessage}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="border-t border-outline-variant/30 pt-4 mt-auto flex items-center justify-end gap-3 shrink-0">
              
              {/* Profile Logout Trigger Button */}
              <button
                type="button"
                onClick={handleLogoutClick}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-error-container/20 hover:bg-error-container/40 border border-error/20 text-error rounded-xl text-[13px] font-bold transition-all mr-auto focus:outline-none focus:ring-2 focus:ring-error"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Logout
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 border border-outline-variant rounded-xl text-[13px] font-semibold hover:bg-surface-container-low transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-xl text-[13px] font-bold hover:bg-surface-tint active:scale-[0.98] disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
              >
                {isSaving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin shrink-0" />
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    Save Settings
                  </>
                )}
              </button>
            </div>

          </form>
        )}

      </div>

      {/* Custom Logout Confirmation Dialog (Z-index 210 to float over the profile modal) */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
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
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 border border-outline-variant rounded-xl text-[13px] font-bold hover:bg-surface-container-low transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem("lead_cleaner_token");
                  localStorage.removeItem("lead_cleaner_email");
                  localStorage.removeItem("lead_cleaner_name");
                  localStorage.removeItem("lead_cleaner_login_at");
                  window.location.reload();
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
