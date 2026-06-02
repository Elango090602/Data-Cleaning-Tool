import React, { useState, useEffect, useRef } from "react";
import { 
  sendOTP, 
  verifyOTP, 
  googleLogin, 
  getGoogleAuthUrl, 
  exchangeGoogleCode, 
  verifyOtpSecure, 
  resendOtpSecure, 
  googleLoginSimulated,
  registerUser,
  verifyRegistration,
  loginUser,
  forgotPassword,
  resetPassword
} from "../services/api";
import { supabase } from "../services/supabaseClient";
import UserProfileModal from "../components/UserProfileModal";

/* ─── Animated counter hook ─── */
function useCounter(target, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const animate = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return [count, ref];
}

/* ─── Floating particles background ─── */
function ParticleField() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1.5px,transparent_1.5px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1.5px,transparent_1.5px)] bg-[size:4.5rem_4.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_80%,transparent_100%)] opacity-35" />
    </div>
  );
}

/* ─── Feature pillar ─── */
function FeaturePill({ icon, label }) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-full px-3.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-[13px] font-semibold text-slate-800 hover:border-indigo-300 hover:shadow-sm transition-all duration-300 hover:-translate-y-0.5 select-none">
      <span className="material-symbols-outlined text-indigo-600 text-[16px] sm:text-[18px]">{icon}</span>
      {label}
    </div>
  );
}

/* ─── Stat counter ─── */
function StatBlock({ value, suffix, label }) {
  const [count, ref] = useCounter(value, 2200);
  return (
    <div ref={ref} className="text-left">
      <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-indigo-200 text-[11px] sm:text-[12px] mt-0.5 font-medium tracking-wide uppercase">{label}</div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Main Landing Page
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function LandingPage({ onEnterApp }) {
  const [isVisible, setIsVisible] = useState(false);

  // OTP Auth States
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem("lead_cleaner_email") || "");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [sandboxNotice, setSandboxNotice] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isGoogleLoggingIn, setIsGoogleLoggingIn] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleName, setGoogleName] = useState("");
  const [googleError, setGoogleError] = useState("");

  // Password-based Auth States
  const [authName, setAuthName] = useState("");
  const [authRole, setAuthRole] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Additional UX States
  const [authMode, setAuthMode] = useState("signup"); // "signup" or "signin" or "forgot_password"
  const [googleLoadingStep, setGoogleLoadingStep] = useState(""); // "", "verifying", "sending_otp"
  const [googleWarningType, setGoogleWarningType] = useState(null); // null, "already_exists", "not_found"
  const [googleWarningMsg, setGoogleWarningMsg] = useState("");
  const [isVerifiedSuccess, setIsVerifiedSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const parseNameFromEmail = (email) => {
    if (!email || !email.includes("@")) return "";
    const localPart = email.split("@")[0];
    return localPart
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  // Interactive Segmented Tabs State (Canva Style)
  const [activeTab, setActiveTab] = useState("email");

  // Helper to detect if Supabase credentials are configured
  const isSupabaseConfigured = () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    return url && url !== "YOUR_SUPABASE_URL" && key && key !== "YOUR_SUPABASE_ANON_KEY";
  };

  // Listen to Supabase Session & auth state changes
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    // Check active session immediately
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        localStorage.setItem("lead_cleaner_token", session.access_token);
        localStorage.setItem("lead_cleaner_email", session.user.email);
        localStorage.setItem("lead_cleaner_name", session.user.user_metadata?.name || session.user.user_metadata?.full_name || session.user.email.split("@")[0].toUpperCase());
        setCurrentUser(session.user.email);
        onEnterApp();
      }
    };
    checkSession();

    // Subscribe to auth state events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "USER_UPDATED")) {
        localStorage.setItem("lead_cleaner_token", session.access_token);
        localStorage.setItem("lead_cleaner_email", session.user.email);
        localStorage.setItem("lead_cleaner_name", session.user.user_metadata?.name || session.user.user_metadata?.full_name || session.user.email.split("@")[0].toUpperCase());
        setCurrentUser(session.user.email);
        onEnterApp();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Countdown timer for resending OTP
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((c) => c - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  // Catch Google OAuth Callback Authorization Code
  useEffect(() => {
    if (isSupabaseConfigured()) return;
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    if (code) {
      window.history.replaceState({}, document.title, window.location.pathname);
      const flow = localStorage.getItem("google_auth_flow") || "signup";
      setAuthMode(flow);
      handleOAuthExchange(code, flow);
    }
  }, []);

  const handleAuthResponse = (response, flow) => {
    const status = response.status;
    
    if (status === "EXISTING_USER_LOGIN") {
      localStorage.setItem("lead_cleaner_token", response.token);
      localStorage.setItem("lead_cleaner_email", response.user.email);
      localStorage.setItem("lead_cleaner_name", response.user.name);
      setCurrentUser(response.user.email);
      
      setIsVerifiedSuccess(true);
      setSuccessMessage("Successfully logged in!");
      
      setTimeout(() => {
        setIsVerifiedSuccess(false);
        setSuccessMessage("");
        setShowGoogleModal(false);
        setShowLoginModal(false);
        onEnterApp();
      }, 1200);
    } else if (status === "NEW_USER_OTP_SENT" || status === "UNVERIFIED_USER_OTP_SENT") {
      setLoginEmail(response.email);
      setShowGoogleModal(false);
      setShowLoginModal(true);
      setOtpSent(true);
      setCountdown(60);
      setSandboxNotice(response.sandbox);
      setOtpError("");
      setOtpCode("");
      setSuccessMessage("We sent a verification code to your email.");
      setGoogleWarningType(null);
    } else if (status === "USER_ALREADY_EXISTS") {
      setGoogleEmail(response.email);
      setGoogleWarningType("already_exists");
      setGoogleWarningMsg(response.message || "User already exists. Please sign in instead.");
      setShowGoogleModal(false);
      setShowLoginModal(true);
      setOtpSent(false);
    } else if (status === "USER_NOT_FOUND") {
      setGoogleEmail(response.email);
      setGoogleWarningType("not_found");
      setGoogleWarningMsg(response.message || "No account found. Please sign up first.");
      setShowGoogleModal(false);
      setShowLoginModal(true);
      setOtpSent(false);
    }
  };

  const handleOAuthExchange = async (code, flow) => {
    setIsGoogleLoggingIn(true);
    setGoogleLoadingStep("verifying");
    setOtpError("");
    setSuccessMessage("");
    setShowLoginModal(true); // show modal immediately for loading spinner
    try {
      const redirectUri = (typeof process !== "undefined" && process.env && process.env.GOOGLE_REDIRECT_URI) || import.meta.env.VITE_GOOGLE_REDIRECT_URI || "http://localhost:5173/auth/callback";
      
      const timer = setTimeout(() => {
        setGoogleLoadingStep("sending_otp");
      }, 700);

      const response = await exchangeGoogleCode(code, redirectUri, flow);
      clearTimeout(timer);
      
      handleAuthResponse(response, flow);
    } catch (err) {
      setOtpError(err.message || "Google OAuth exchange failed.");
      setShowLoginModal(true);
    } finally {
      setIsGoogleLoggingIn(false);
      setGoogleLoadingStep("");
    }
  };

  const handleGoogleSignInTrigger = async () => {
    setOtpError("");
    setGoogleError("");
    setSuccessMessage("");
    setGoogleWarningType(null);
    
    if (isSupabaseConfigured()) {
      setIsGoogleLoggingIn(true);
      setGoogleLoadingStep("verifying");
      try {
        const redirectUri = window.location.origin;
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: redirectUri,
          }
        });
        if (error) throw error;
      } catch (err) {
        setGoogleError(err.message || "Failed to initiate Google sign-in via Supabase.");
      } finally {
        setIsGoogleLoggingIn(false);
        setGoogleLoadingStep("");
      }
      return;
    }

    localStorage.setItem("google_auth_flow", authMode);
    
    setIsGoogleLoggingIn(true);
    setGoogleLoadingStep("verifying");
    
    try {
      const urlData = await getGoogleAuthUrl();
      if (urlData.configured) {
        window.location.href = urlData.url;
        return;
      }
    } catch (err) {
      console.warn("Failed to check Google OAuth configuration:", err);
    } finally {
      setIsGoogleLoggingIn(false);
      setGoogleLoadingStep("");
    }

    const defaultEmail = loginEmail && loginEmail.includes("@") ? loginEmail : "";
    const defaultName = defaultEmail ? parseNameFromEmail(defaultEmail) : "";
    setGoogleEmail(defaultEmail);
    setGoogleName(defaultName);
    setShowGoogleModal(true);
  };

  const handleGoogleSignIn = async (email, name) => {
    if (!email || !email.includes("@")) {
      setGoogleError("Please enter a valid Google account email.");
      return;
    }
    if (!name || name.trim().length === 0) {
      setGoogleError("Please enter your name.");
      return;
    }

    setIsGoogleLoggingIn(true);
    setGoogleLoadingStep("verifying");
    setGoogleError("");
    setSuccessMessage("");
    setGoogleWarningType(null);
    try {
      const loginPromise = googleLoginSimulated(email, name, authMode);
      
      const timer = setTimeout(() => {
        setGoogleLoadingStep("sending_otp");
      }, 700);

      const response = await loginPromise;
      clearTimeout(timer);

      handleAuthResponse(response, authMode);
    } catch (err) {
      setGoogleError(err.message || "Google authentication failed.");
    } finally {
      setIsGoogleLoggingIn(false);
      setGoogleLoadingStep("");
    }
  };

  const handleLaunchClick = () => {
    if (currentUser) {
      onEnterApp();
    } else {
      setAuthMode("signup");
      setGoogleWarningType(null);
      setShowLoginModal(true);
      setOtpError("");
      setOtpSent(false);
      setOtpCode("");
      setSuccessMessage("");
      setAuthName("");
      setAuthRole("");
      setAuthPassword("");
      setShowPassword(false);
      setNewPassword("");
      setShowNewPassword(false);
    }
  };

  const handleSendOTP = async (e) => {
    if (e) e.preventDefault();
    if (!loginEmail || !loginEmail.includes("@")) {
      setOtpError("Please enter a valid email address.");
      return;
    }

    setIsSendingOtp(true);
    setOtpError("");
    setSuccessMessage("");
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.auth.signInWithOtp({
          email: loginEmail,
        });
        if (error) throw error;
        setOtpSent(true);
        setCountdown(60);
        setSandboxNotice(false);
        setSuccessMessage("A fresh verification code has been sent via Supabase.");
      } else {
        const response = await resendOtpSecure(loginEmail);
        if (response.success) {
          setOtpSent(true);
          setCountdown(60);
          setSandboxNotice(response.sandbox);
          setSuccessMessage("A fresh verification code has been sent.");
        }
      }
    } catch (err) {
      setOtpError(err.message || "Failed to dispatch verification code.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    if (e) e.preventDefault();
    if (otpCode.length !== 6 || isNaN(otpCode)) {
      setOtpError("Please enter a valid 6-digit numeric code.");
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError("");
    setSuccessMessage("");
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase.auth.verifyOtp({
          email: loginEmail,
          token: otpCode,
          type: "email"
        });
        if (error) throw error;
        if (data.session) {
          setIsVerifiedSuccess(true);
          setSuccessMessage("Verification successful!");
          localStorage.setItem("lead_cleaner_token", data.session.access_token);
          localStorage.setItem("lead_cleaner_email", data.session.user.email);
          localStorage.setItem("lead_cleaner_name", data.session.user.user_metadata?.name || data.session.user.user_metadata?.full_name || data.session.user.email.split("@")[0].toUpperCase());
          setCurrentUser(data.session.user.email);
          
          setTimeout(() => {
            setIsVerifiedSuccess(false);
            setSuccessMessage("");
            setShowLoginModal(false);
            onEnterApp();
          }, 1200);
        } else {
          throw new Error("No session returned from Supabase. Try again.");
        }
      } else {
        const response = await verifyOtpSecure(loginEmail, otpCode);
        if (response.success || response.status === "OTP_VERIFIED") {
          setIsVerifiedSuccess(true);
          setSuccessMessage("Verification successful!");
          localStorage.setItem("lead_cleaner_token", response.token);
          localStorage.setItem("lead_cleaner_email", response.user.email);
          localStorage.setItem("lead_cleaner_name", response.user.name);
          setCurrentUser(response.user.email);
          
          setTimeout(() => {
            setIsVerifiedSuccess(false);
            setSuccessMessage("");
            setShowLoginModal(false);
            onEnterApp();
          }, 1200);
        }
      }
    } catch (err) {
      if (err.status === "INVALID_OTP") {
        setOtpError("Invalid verification code. Please check and try again.");
      } else if (err.status === "EXPIRED_OTP") {
        setOtpError("Verification code has expired. Please request a new one.");
      } else {
        setOtpError(err.message || "Invalid or expired code. Please try again.");
      }
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleRegister = async (e) => {
    if (e) e.preventDefault();
    if (!authName.trim()) {
      setOtpError("Please enter your full name.");
      return;
    }
    if (!authRole.trim()) {
      setOtpError("Please select or enter your job role.");
      return;
    }
    if (!loginEmail || !loginEmail.includes("@")) {
      setOtpError("Please enter a valid email address.");
      return;
    }
    if (authPassword.length < 6) {
      setOtpError("Password must be at least 6 characters long.");
      return;
    }

    setIsSendingOtp(true);
    setOtpError("");
    setSuccessMessage("");
    try {
      const response = await registerUser({
        email: loginEmail,
        password: authPassword,
        name: authName,
        role: authRole
      });
      if (response.success) {
        setOtpSent(true);
        setCountdown(60);
        setSandboxNotice(response.sandbox);
        setSuccessMessage("Account details registered! Enter verification code.");
      }
    } catch (err) {
      setOtpError(err.message || "Failed to register user account.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyRegistrationOTP = async (e) => {
    if (e) e.preventDefault();
    if (otpCode.length !== 6 || isNaN(otpCode)) {
      setOtpError("Please enter a valid 6-digit numeric code.");
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError("");
    setSuccessMessage("");
    try {
      const response = await verifyRegistration({ email: loginEmail, otp: otpCode });
      if (response.success) {
        setIsVerifiedSuccess(true);
        setSuccessMessage("Account verified and activated!");
        localStorage.setItem("lead_cleaner_token", response.token);
        localStorage.setItem("lead_cleaner_email", response.user.email);
        localStorage.setItem("lead_cleaner_name", response.user.name);
        setCurrentUser(response.user.email);
        
        setTimeout(() => {
          setIsVerifiedSuccess(false);
          setSuccessMessage("");
          setShowLoginModal(false);
          onEnterApp();
        }, 1200);
      }
    } catch (err) {
      setOtpError(err.message || "Invalid or expired code. Please try again.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!loginEmail || !loginEmail.includes("@")) {
      setOtpError("Please enter a valid email address.");
      return;
    }
    if (!authPassword) {
      setOtpError("Please enter your password.");
      return;
    }

    setIsSendingOtp(true);
    setOtpError("");
    setSuccessMessage("");
    try {
      const response = await loginUser({ email: loginEmail, password: authPassword });
      if (response.success) {
        setIsVerifiedSuccess(true);
        setSuccessMessage("Login successful!");
        localStorage.setItem("lead_cleaner_token", response.token);
        localStorage.setItem("lead_cleaner_email", response.user.email);
        localStorage.setItem("lead_cleaner_name", response.user.name);
        setCurrentUser(response.user.email);
        
        setTimeout(() => {
          setIsVerifiedSuccess(false);
          setSuccessMessage("");
          setShowLoginModal(false);
          onEnterApp();
        }, 1200);
      }
    } catch (err) {
      if (err.data && err.data.status === "UNVERIFIED_ACCOUNT") {
        setOtpError("Your account email is unverified. Sending verification code...");
        try {
          const res = await resendOtpSecure(loginEmail);
          setOtpSent(true);
          setCountdown(60);
          setSandboxNotice(res.sandbox);
          setSuccessMessage("A verification code has been sent to complete your signup.");
        } catch (sendErr) {
          setOtpError(sendErr.message || "Account is unverified, and sending a verification code failed.");
        }
      } else {
        setOtpError(err.message || "Incorrect password or account not found.");
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleForgotPassword = async (e) => {
    if (e) e.preventDefault();
    if (!loginEmail || !loginEmail.includes("@")) {
      setOtpError("Please enter a valid email address.");
      return;
    }

    setIsSendingOtp(true);
    setOtpError("");
    setSuccessMessage("");
    try {
      const response = await forgotPassword(loginEmail);
      if (response.success) {
        setOtpSent(true);
        setCountdown(60);
        setSandboxNotice(response.sandbox);
        setSuccessMessage("Password reset code sent. Check your email!");
      }
    } catch (err) {
      setOtpError(err.message || "Failed to request password reset code.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    if (otpCode.length !== 6 || isNaN(otpCode)) {
      setOtpError("Please enter a valid 6-digit numeric code.");
      return;
    }
    if (newPassword.length < 6) {
      setOtpError("New password must be at least 6 characters long.");
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError("");
    setSuccessMessage("");
    try {
      const response = await resetPassword({
        email: loginEmail,
        otp: otpCode,
        newPassword: newPassword
      });
      if (response.success) {
        setSuccessMessage("Password updated successfully! Please login.");
        setOtpSent(false);
        setOtpCode("");
        setNewPassword("");
        setAuthPassword("");
        setAuthMode("signin");
      }
    } catch (err) {
      setOtpError(err.message || "Failed to reset password. Please check the code.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    
    // Smooth scroll reveal observer
    const observerOptions = {
      root: null,
      rootMargin: "-20px 0px -20px 0px",
      threshold: 0.08,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal-active");
        } else {
          entry.target.classList.remove("reveal-active");
        }
      });
    }, observerOptions);

    const targets = document.querySelectorAll(".reveal-section, .pop-reveal, .fade-in-slide");
    targets.forEach((target) => observer.observe(target));

    return () => {
      clearTimeout(timer);
      targets.forEach((target) => observer.unobserve(target));
    };
  }, []);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#fafafa] text-slate-900 selection:bg-indigo-200 selection:text-indigo-900">

      {/* ── Navigation Bar (Canva Style) ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-100 transition-all duration-700 ${isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"}`}>
        <div className="antigravity-container h-16 sm:h-20 flex items-center justify-between">
          
          {/* Logo brand */}
          <div 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity select-none shrink-0"
            title="LeadSanity Home"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shrink-0">
              <span className="material-symbols-outlined text-white text-[18px]">dataset</span>
            </div>
            <span className="font-extrabold text-slate-800 text-[18px] sm:text-[20px] tracking-tight">LeadSanity</span>
          </div>

          {/* Navigation Links in Center */}
          <div className="hidden md:flex items-center gap-8 text-[14px] font-semibold text-slate-600">
            <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
            <a href="#explore-tools" className="hover:text-indigo-600 transition-colors">Explore Tools</a>
            <a href="#pricing" className="hover:text-indigo-600 transition-colors">Pricing</a>
            <a href="#resources" className="hover:text-indigo-600 transition-colors">Resources</a>
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-md text-[13px] font-bold">Help</span>
          </div>

          {/* Authentication & User Panel */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center gap-2.5 hover:opacity-90 transition-all focus:outline-none cursor-pointer"
                title="View Profile Settings"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 shadow-sm font-bold">
                  {(localStorage.getItem("lead_cleaner_name") || currentUser.split("@")[0]).charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 leading-none">
                    {localStorage.getItem("lead_cleaner_name") || (currentUser.split("@")[0].charAt(0).toUpperCase() + currentUser.split("@")[0].slice(1))}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium mt-0.5 truncate max-w-[100px]">{currentUser}</span>
                </div>
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setAuthMode("signup");
                    setGoogleWarningType(null);
                    setShowLoginModal(true);
                    setOtpError("");
                    setOtpSent(false);
                    setOtpCode("");
                    setSuccessMessage("");
                  }}
                  className="px-4 py-2 text-[13px] font-bold text-slate-700 border border-slate-300 rounded-full hover:bg-slate-50 transition-all select-none focus:outline-none"
                >
                  Sign up
                </button>
                <button
                  onClick={() => {
                    setAuthMode("signin");
                    setGoogleWarningType(null);
                    setShowLoginModal(true);
                    setOtpError("");
                    setOtpSent(false);
                    setOtpCode("");
                    setSuccessMessage("");
                  }}
                  className="px-4 py-2 text-[13px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-full shadow-sm hover:shadow transition-all select-none ml-1 focus:outline-none"
                >
                  Log in
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero Section (Canva Gradient Style) ── */}
      <section className="relative pt-24 sm:pt-28 pb-20 bg-gradient-to-br from-[#732eff] via-[#5c00e6] to-[#00b0ff] overflow-hidden rounded-b-[2rem] sm:rounded-b-[3.5rem] shadow-xl">
        <ParticleField />

        <div className={`relative z-10 w-full antigravity-container grid grid-cols-1 lg:grid-cols-12 gap-12 items-center text-left transition-all duration-[1.2s] ease-[var(--ease-out-expo)] ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          
          {/* Hero Left Column (Info) */}
          <div className="lg:col-span-7 flex flex-col items-start fade-in-slide reveal-active">
            
            {/* Animated Pill Badge */}
            <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-3.5 py-1.5 mb-6 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />
              <span className="text-white text-[10px] sm:text-[11px] font-bold tracking-wider uppercase">Automated Data Hygiene</span>
            </div>

            {/* Huge Contrast Header */}
            <h1 className="text-4xl sm:text-5xl md:text-[64px] font-extrabold text-white leading-[1.05] tracking-[-2.14px] mb-6 max-w-3xl font-sans" style={{ fontVariationSettings: '"wdth" 100, "opsz" 124' }}>
              Pristine B2B lead lists.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-emerald-200">
                Zero manual formatting.
              </span>
            </h1>

            {/* Contrast Subtitle */}
            <p className="text-indigo-100 text-sm sm:text-base md:text-[17px] max-w-xl leading-relaxed mb-8">
              Your GTM pipeline is only as powerful as the data you feed it. Clean, format, and structure messy CSV exports from ZoomInfo, Apollo, and other sources automatically before they ever hit your CRM.
            </p>

            {/* Canva Style White Pill CTA Button inside Hero */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-start gap-4 mb-10 w-full sm:w-auto">
              <button
                onClick={handleLaunchClick}
                className="group flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white text-[#5c00e6] font-bold text-[14px] sm:text-[15px] hover:bg-[#fafafa] active:scale-[0.98] transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none"
              >
                <span className="material-symbols-outlined text-[20px]">bolt</span>
                Sign up and start cleaning
                <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform duration-200">arrow_forward</span>
              </button>
            </div>

            {/* Hero Trust Indicators */}
            <div className="flex flex-row items-center gap-10 sm:gap-12 justify-start border-t border-white/10 pt-8 w-full max-w-lg">
              <StatBlock value={50} suffix="+" label="Auto-Mapped Fields" />
              <StatBlock value={98} suffix="%" label="CRM Accuracy" />
              <StatBlock value={10} suffix="x" label="Faster Than Excel" />
            </div>

          </div>

          {/* Hero Right Column (Interactive Live Demonstration) */}
          <div className="lg:col-span-5 w-full flex justify-center pop-reveal reveal-active">
            
            {/* macOS Window Demo Block */}
            <div className="relative w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden hover:scale-[1.02] transition-transform duration-500">
              
              {/* macOS Window Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                  <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                  <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
                </div>
                <span className="text-[11px] font-semibold text-slate-400 tracking-wider font-mono">LeadSanity Engine v2.4</span>
                <span className="w-8" />
              </div>

              {/* Console Body */}
              <div className="p-6 space-y-5">
                
                {/* Raw Input */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Incoming Raw CSV Record</span>
                  <div className="p-3.5 bg-slate-950/80 rounded-xl font-mono text-[11px] text-slate-300 border border-slate-800 break-all leading-relaxed">
                    <span className="text-red-400">"j.doe@CO_LTD.com"</span>, "+1 (123) 456-7890 ext.4" , <span className="text-amber-400">"linkedin.com/in/john-doe-1234?ref=src"</span>
                  </div>
                </div>

                {/* Processing Indicator */}
                <div className="flex justify-center my-1">
                  <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[16px] text-indigo-400 animate-bounce">keyboard_double_arrow_down</span>
                  </div>
                </div>

                {/* Sanitized Output */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Sanitized CRM Schema</span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-bold tracking-wide uppercase border border-emerald-500/20">
                      <span className="material-symbols-outlined text-[10px] fill">check_circle</span>
                      100% Score
                    </span>
                  </div>
                  <div className="p-3.5 bg-emerald-950/20 rounded-xl font-mono text-[11px] border border-emerald-500/30 text-emerald-200 space-y-1.5">
                    <div><span className="text-slate-400">Email:</span> <span className="text-emerald-300 font-bold">john.doe@company.com</span></div>
                    <div><span className="text-slate-400">Phone:</span> <span className="text-emerald-300 font-bold">+1 123-456-7890</span></div>
                    <div><span className="text-slate-400">LinkedIn:</span> <span className="text-emerald-300 font-bold">linkedin.com/in/john-doe</span></div>
                  </div>
                </div>

                {/* Floating Indicators */}
                <div className="grid grid-cols-3 gap-2.5 pt-2">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-2 text-center">
                    <span className="block text-[13px] font-extrabold text-white">4.9s</span>
                    <span className="text-[8px] text-slate-400 font-bold">Clean Time</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-2 text-center">
                    <span className="block text-[13px] font-extrabold text-emerald-400">99.8%</span>
                    <span className="text-[8px] text-slate-400 font-bold">Accuracy</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-2 text-center">
                    <span className="block text-[13px] font-extrabold text-indigo-400">0</span>
                    <span className="text-[8px] text-slate-400 font-bold">Fails</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Features Strip (Canva Style Features list) ── */}
      <section id="features" className="relative py-12 border-b border-slate-100 bg-white">
        <div className="antigravity-container w-full">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <FeaturePill icon="alternate_email" label="Verified Email Formats" />
            <FeaturePill icon="call" label="ITU Country Calling Codes" />
            <FeaturePill icon="language" label="Normalized Domains" />
            <FeaturePill icon="work" label="Clean LinkedIn Handles" />
            <FeaturePill icon="content_copy" label="Cross-Record Deduplication" />
            <FeaturePill icon="delete_sweep" label="Blank Field Purging" />
            <FeaturePill icon="swap_horiz" label="Pre-Import Mappings" />
            <FeaturePill icon="download" label="Flexible Export Splits" />
          </div>
        </div>
      </section>

      {/* ── Exploration Interactive Tab Section (Canva Segmented Tabs Style) ── */}
      <section id="explore-tools" className="py-20 bg-white reveal-section">
        <div className="antigravity-container w-full text-center">
          
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">
            Explore LeadSanity's Tools
          </h2>
          <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto mb-10 leading-relaxed">
            Toggle between our core clean modules below to see how our engine transforms and handles varied list anomalies.
          </p>

          {/* Canva Segmented Control Container */}
          <div className="inline-flex flex-wrap items-center justify-center p-1.5 bg-slate-100 rounded-full gap-1 mb-12 max-w-full">
            <button
              onClick={() => setActiveTab("email")}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${activeTab === "email" ? "bg-indigo-600 text-white shadow" : "text-slate-600 hover:text-slate-900"}`}
            >
              Email Sanitizer
            </button>
            <button
              onClick={() => setActiveTab("phone")}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${activeTab === "phone" ? "bg-indigo-600 text-white shadow" : "text-slate-600 hover:text-slate-900"}`}
            >
              Phone Normalizer
            </button>
            <button
              onClick={() => setActiveTab("domain")}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${activeTab === "domain" ? "bg-indigo-600 text-white shadow" : "text-slate-600 hover:text-slate-900"}`}
            >
              Domain Standardizer
            </button>
            <button
              onClick={() => setActiveTab("dedup")}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${activeTab === "dedup" ? "bg-indigo-600 text-white shadow" : "text-slate-600 hover:text-slate-900"}`}
            >
              Fuzzy Deduplicator
            </button>
          </div>

          {/* Active Tab Preview Pane */}
          <div className="max-w-4xl mx-auto bg-slate-50 border border-slate-100 rounded-3xl p-6 sm:p-10 shadow-sm text-left transition-all duration-300">
            {activeTab === "email" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Corporate Domain & Syntax Validation</h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-4">
                    Instantly flags and filters consumer accounts (Gmail, Outlook) from B2B datasets while formatting inconsistent emails with trailing spaces, typos, or malformed syntaxes.
                  </p>
                  <ul className="space-y-2 text-xs font-semibold text-slate-700">
                    <li className="flex items-center gap-1.5"><span className="material-symbols-outlined text-green-500 text-[16px] fill">check_circle</span>Strips whitespaces and parameters</li>
                    <li className="flex items-center gap-1.5"><span className="material-symbols-outlined text-green-500 text-[16px] fill">check_circle</span>Categorizes personal vs business</li>
                  </ul>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-100 space-y-3 font-mono text-[11px] shadow-sm">
                  <div className="pb-2 border-b border-slate-100 text-[10px] font-bold text-slate-400">EMAIL SANITIZER SIMULATION</div>
                  <div className="space-y-2">
                    <div className="p-2 bg-red-50 border border-red-100 rounded flex items-center justify-between">
                      <span className="text-slate-500 line-through">J_DOE(at)GMAIL.com</span>
                      <span className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded text-[8px]">GENERIC/WARNING</span>
                    </div>
                    <div className="p-2 bg-green-50 border border-green-100 rounded flex items-center justify-between">
                      <span className="text-slate-500 line-through">sales@company.com?utm=src</span>
                      <span className="text-green-700 font-bold">sales@company.com</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "phone" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">ITU Country Calling Code Alignment</h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-4">
                    Converts local, messy customer phone number formatting into unified E.164 standard strings with correct dial codes, preserving extension figures in a dedicated attribute.
                  </p>
                  <ul className="space-y-2 text-xs font-semibold text-slate-700">
                    <li className="flex items-center gap-1.5"><span className="material-symbols-outlined text-green-500 text-[16px] fill">check_circle</span>Auto-appends dial codes</li>
                    <li className="flex items-center gap-1.5"><span className="material-symbols-outlined text-green-500 text-[16px] fill">check_circle</span>Strips bad letters and labels</li>
                  </ul>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-100 space-y-3 font-mono text-[11px] shadow-sm">
                  <div className="pb-2 border-b border-slate-100 text-[10px] font-bold text-slate-400">PHONE NORMALIZER SIMULATION</div>
                  <div className="space-y-2">
                    <div className="p-2 bg-green-50 border border-green-100 rounded flex items-center justify-between">
                      <span className="text-slate-500 line-through">+44 020 1234 5678</span>
                      <span className="text-green-700 font-bold">+44 20 1234 5678</span>
                    </div>
                    <div className="p-2 bg-green-50 border border-green-100 rounded flex items-center justify-between">
                      <span className="text-slate-500 line-through">123.456.7890 ext. 20</span>
                      <span className="text-green-700 font-bold">+1 123-456-7890 ext. 20</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "domain" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Noisy URL Parameter Stripping</h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-4">
                    Trims tracking parameters (UTMs, subdomains) and formats standard domain URLs. Returns corporate sites and pristine LinkedIn handles directly.
                  </p>
                  <ul className="space-y-2 text-xs font-semibold text-slate-700">
                    <li className="flex items-center gap-1.5"><span className="material-symbols-outlined text-green-500 text-[16px] fill">check_circle</span>Removes protocol (https/http)</li>
                    <li className="flex items-center gap-1.5"><span className="material-symbols-outlined text-green-500 text-[16px] fill">check_circle</span>Strips search strings and subfolders</li>
                  </ul>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-100 space-y-3 font-mono text-[11px] shadow-sm">
                  <div className="pb-2 border-b border-slate-100 text-[10px] font-bold text-slate-400">DOMAIN & PROFILE SIMULATION</div>
                  <div className="space-y-2">
                    <div className="p-2 bg-green-50 border border-green-100 rounded flex items-center justify-between">
                      <span className="text-slate-500 line-through">https://uk.google.com/home?ref=1</span>
                      <span className="text-green-700 font-bold">google.com</span>
                    </div>
                    <div className="p-2 bg-green-50 border border-green-100 rounded flex items-center justify-between">
                      <span className="text-slate-500 line-through">linkedin.com/in/john-doe/overview/</span>
                      <span className="text-green-700 font-bold">linkedin.com/in/john-doe</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "dedup" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Fuzzy Record Deduplication</h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-4">
                    Analyzes emails, domains, and phone numbers in cross-record pipelines. Flag exact duplicates and similar fuzzy patterns before importing into active systems.
                  </p>
                  <ul className="space-y-2 text-xs font-semibold text-slate-700">
                    <li className="flex items-center gap-1.5"><span className="material-symbols-outlined text-green-500 text-[16px] fill">check_circle</span>Fuzzy similarity scoring</li>
                    <li className="flex items-center gap-1.5"><span className="material-symbols-outlined text-green-500 text-[16px] fill">check_circle</span>Isolates duplicates for manual view</li>
                  </ul>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-100 space-y-3 font-mono text-[11px] shadow-sm">
                  <div className="pb-2 border-b border-slate-100 text-[10px] font-bold text-slate-400">Fuzzy Deduplication SIMULATION</div>
                  <div className="space-y-2">
                    <div className="p-2 bg-red-50 border border-red-100 rounded flex items-center justify-between">
                      <span className="text-slate-700">Acme Corporation (John)</span>
                      <span className="text-slate-500 text-[9px] italic">Primary Record</span>
                    </div>
                    <div className="p-2 bg-amber-50 border border-amber-100 rounded flex items-center justify-between">
                      <span className="text-slate-500 line-through">Acme Co. (John)</span>
                      <span className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded text-[8px]">DUPLICATE</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* ── Business Features Section (Canva Style pastel layout) ── */}
      <section className="py-24 bg-slate-50 border-t border-slate-100 reveal-section">
        <div className="antigravity-container w-full">
          
          {/* Centered Title with correct space */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
              Our Business Features
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Enhance the data hygiene capabilities of your team or your entire business with LeadSanity's robust validation schemas. Protect your CRM from day one.
            </p>
          </div>

          {/* Pastel Rounded Cards aligned beautifully */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch justify-center">
            
            {/* Card 1: Soft Pastel Green */}
            <div className="flex flex-col justify-between bg-[#e8f5e9] border border-[#c8e6c9] rounded-[2rem] p-8 overflow-hidden relative min-h-[440px] shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group pop-reveal reveal-delay-1">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 leading-tight mb-4 max-w-[200px]">
                  Set up standard schemas
                </h3>
                <button 
                  onClick={handleLaunchClick}
                  className="px-4 py-2 bg-white text-slate-800 font-bold text-[12px] rounded-full shadow-sm hover:shadow hover:bg-slate-50 transition-all select-none focus:outline-none"
                >
                  Learn more
                </button>
              </div>
              {/* Visual asset cropping out of bottom */}
              <div className="mt-8 transform translate-y-4 group-hover:translate-y-2 transition-transform duration-500 select-none">
                <div className="bg-white rounded-2xl p-4 shadow-lg border border-slate-100/50 space-y-2.5 max-w-[280px] mx-auto font-mono text-[10px]">
                  <div className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100">
                    <span className="font-semibold text-slate-700">biz_email</span>
                    <span className="material-symbols-outlined text-slate-400 text-[12px]">arrow_right_alt</span>
                    <span className="bg-green-50 text-green-700 font-bold px-1.5 py-0.5 rounded text-[8px] uppercase">Email</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100">
                    <span className="font-semibold text-slate-700">Cell_Phone</span>
                    <span className="material-symbols-outlined text-slate-400 text-[12px]">arrow_right_alt</span>
                    <span className="bg-green-50 text-green-700 font-bold px-1.5 py-0.5 rounded text-[8px] uppercase">Phone</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Soft Pastel Lavender Blue */}
            <div className="flex flex-col justify-between bg-[#e8eaf6] border border-[#c5cae9] rounded-[2rem] p-8 overflow-hidden relative min-h-[440px] shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group pop-reveal reveal-delay-2">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 leading-tight mb-4 max-w-[220px]">
                  Empower teams to filter lists
                </h3>
                <button 
                  onClick={handleLaunchClick}
                  className="px-4 py-2 bg-white text-slate-800 font-bold text-[12px] rounded-full shadow-sm hover:shadow hover:bg-slate-50 transition-all select-none focus:outline-none"
                >
                  View options
                </button>
              </div>
              {/* Visual asset cropping out of bottom */}
              <div className="mt-8 transform translate-y-4 group-hover:translate-y-2 transition-transform duration-500 select-none">
                <div className="bg-white rounded-2xl p-4 shadow-lg border border-slate-100/50 space-y-2.5 max-w-[280px] mx-auto text-[10px]">
                  <div className="flex items-center justify-between p-1.5 border-b border-slate-100">
                    <span className="text-slate-600 font-semibold">Auto-Format Phone Numbers</span>
                    <span className="w-6 h-3.5 rounded-full bg-indigo-600 relative flex items-center justify-end px-0.5"><span className="w-2 h-2 bg-white rounded-full" /></span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 border-b border-slate-100">
                    <span className="text-slate-600 font-semibold">Verify Corporate Emails</span>
                    <span className="w-6 h-3.5 rounded-full bg-indigo-600 relative flex items-center justify-end px-0.5"><span className="w-2 h-2 bg-white rounded-full" /></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Soft Pastel Blush Pink */}
            <div className="flex flex-col justify-between bg-[#fce4ec] border border-[#f8bbd0] rounded-[2rem] p-8 overflow-hidden relative min-h-[440px] shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group pop-reveal reveal-delay-3">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 leading-tight mb-4 max-w-[200px]">
                  Segmented import files
                </h3>
                <button 
                  onClick={handleLaunchClick}
                  className="px-4 py-2 bg-white text-slate-800 font-bold text-[12px] rounded-full shadow-sm hover:shadow hover:bg-slate-50 transition-all select-none focus:outline-none"
                >
                  Learn more
                </button>
              </div>
              {/* Visual asset cropping out of bottom */}
              <div className="mt-8 transform translate-y-4 group-hover:translate-y-2 transition-transform duration-500 select-none">
                <div className="bg-white rounded-2xl p-4 shadow-lg border border-slate-100/50 space-y-2 max-w-[280px] mx-auto text-[10px] font-mono">
                  <div className="flex items-center justify-between p-2 bg-emerald-50 text-emerald-700 rounded border border-emerald-100">
                    <span className="font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[12px] fill">check_circle</span>Sanitized_Leads.csv</span>
                    <span className="text-[8px] bg-emerald-100 px-1 py-0.5 rounded font-bold uppercase">CLEAN</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-red-50 text-red-700 rounded border border-red-100">
                    <span className="font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[12px] fill">error</span>Duplicates_Flagged.csv</span>
                    <span className="text-[8px] bg-red-100 px-1 py-0.5 rounded font-bold uppercase">FLAGGED</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Integrations Section ── */}
      <section className="py-16 border-t border-slate-100 bg-[#fafafa] reveal-section">
        <div className="antigravity-container w-full text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2.5">Works With Your Existing Operations Stack</h2>
          <p className="text-slate-600 text-[14px] sm:text-[15px] mb-8 leading-relaxed max-w-xl mx-auto">
            Import records seamlessly from any marketing, sales, or lead generation tool.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 max-w-4xl mx-auto">
            {["ZoomInfo", "Apollo.io", "HubSpot CRM", "Salesforce", "LinkedIn Sales Navigator", "Outreach", "CSV / Excel"].map((name, idx) => (
              <div
                key={name}
                className={`bg-white border border-slate-200 rounded-2xl px-5 py-3 text-[12px] sm:text-[13px] font-bold text-slate-800 hover:border-indigo-300 hover:shadow transition-all duration-200 fade-in-slide reveal-delay-${(idx % 5) + 1}`}
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-20 relative overflow-hidden bg-white border-t border-slate-100 reveal-section">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-50/10 to-indigo-50/50 pointer-events-none" />
        <div className="relative z-10 antigravity-container w-full text-center pop-reveal">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-6 mx-auto text-indigo-600">
            <span className="material-symbols-outlined text-[28px]">auto_awesome</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4 leading-tight">
            Stop losing sales to dirty data.
          </h2>
          <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto mb-8 leading-relaxed">
            Take control of your database hygiene. Upload your lead spreadsheet, preview the simulations, and export clean lists in under 60 seconds.
          </p>
          <button
            onClick={handleLaunchClick}
            className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-indigo-600 text-white font-bold text-[14px] sm:text-[15px] hover:bg-indigo-700 active:scale-[0.98] transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none"
          >
            <span className="material-symbols-outlined text-[20px]">bolt</span>
            Launch LeadSanity Now
            <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform duration-200">arrow_forward</span>
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-100 py-8 bg-[#fafafa]">
        <div className="antigravity-container flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-white text-[14px]">dataset</span>
            </div>
            <span className="font-bold text-slate-800 text-[14px]">LeadSanity Pro</span>
          </div>
          <p className="text-slate-500 text-[11px] sm:text-[12px] flex flex-wrap items-center gap-1.5 justify-center sm:justify-end">
            <span>© {new Date().getFullYear()} LeadSanity. Enterprise-grade lead data hygiene.</span>
            <span className="hidden sm:inline text-slate-300">|</span>
            <span>Developed by <a href="https://elangov.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 font-bold transition-colors">Elango V</a></span>
          </p>
        </div>
      </footer>

      {/* ── Email OTP Authentication Modal ── */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 xs:p-8 animate-scale-up">
            
            {/* Close Button */}
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-all duration-200 focus:outline-none"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            {/* Content Selection */}
            {isVerifiedSuccess ? (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 animate-bounce">
                  <span className="material-symbols-outlined text-[36px] fill">check_circle</span>
                </div>
                <h4 className="text-lg font-extrabold text-slate-800">
                  {successMessage || "Verification Successful!"}
                </h4>
                <p className="text-xs text-slate-500">
                  Redirecting to your LeadSanity dashboard...
                </p>
              </div>
            ) : isGoogleLoggingIn ? (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-4 animate-fade-in">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-100 animate-pulse"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
                </div>
                <h4 className="text-base font-extrabold text-slate-800 animate-pulse">
                  {googleLoadingStep === "verifying" ? "Verifying Google account..." : "Sending OTP to your email..."}
                </h4>
                <p className="text-xs text-slate-500 max-w-[240px]">
                  {googleLoadingStep === "verifying" 
                    ? "Exchanging secure credentials with Google." 
                    : "Please wait while we dispatch your verification code."}
                </p>
              </div>
            ) : googleWarningType ? (
              googleWarningType === "already_exists" ? (
                <div className="space-y-4 text-center py-4 animate-scale-up">
                  <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
                    <span className="material-symbols-outlined text-[24px]">warning</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">User Already Exists</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    An account with <strong>{googleEmail}</strong> already exists. Please sign in instead.
                  </p>
                  <button
                    onClick={() => {
                      setAuthMode("signin");
                      setGoogleWarningType(null);
                      setOtpSent(false);
                      setOtpError("");
                      setOtpCode("");
                    }}
                    className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[14px] transition-all shadow-md focus:outline-none"
                  >
                    Sign in
                  </button>
                </div>
              ) : (
                <div className="space-y-4 text-center py-4 animate-scale-up">
                  <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
                    <span className="material-symbols-outlined text-[24px]">person_search</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">No Account Found</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    We couldn't find an account associated with <strong>{googleEmail}</strong>. Please sign up first.
                  </p>
                  <button
                    onClick={() => {
                      setAuthMode("signup");
                      setGoogleWarningType(null);
                      setOtpSent(false);
                      setOtpError("");
                      setOtpCode("");
                    }}
                    className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[14px] transition-all shadow-md focus:outline-none"
                  >
                    Create account
                  </button>
                </div>
              )
            ) : (
              <>
                {/* Header */}
                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-4 text-indigo-600">
                    <span className="material-symbols-outlined text-[28px]">
                      {otpSent ? "mark_email_read" : (authMode === "forgot_password" ? "lock_reset" : "vpn_key")}
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-800">
                    {otpSent 
                      ? (authMode === "forgot_password" ? "Reset Credentials" : "Verify your code") 
                      : (authMode === "signup" ? "Create your account" : (authMode === "forgot_password" ? "Reset your password" : "Sign In to LeadSanity"))}
                  </h3>
                  <p className="text-slate-500 text-[12px] sm:text-[13px] mt-1.5 leading-relaxed">
                    {otpSent
                      ? `We've sent a verification code to ${loginEmail}.`
                      : (authMode === "signup"
                        ? "Enter your details below to register and access your workspace."
                        : (authMode === "forgot_password" 
                          ? "Enter your email address and we'll send you a password reset code."
                          : "Enter your email and password to log in."))}
                  </p>
                  {successMessage && (
                    <div className="mt-2 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg py-1 px-3 inline-block">
                      {successMessage}
                    </div>
                  )}
                </div>

                {/* Main Form */}
                {!otpSent ? (
                  <form onSubmit={
                    authMode === "signup" 
                      ? handleRegister 
                      : (authMode === "forgot_password" ? handleForgotPassword : handleLogin)
                  } className="space-y-4">
                    
                    {/* Full Name (Sign Up only) */}
                    {authMode === "signup" && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Full Name
                        </label>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                            person
                          </span>
                          <input
                            type="text"
                            required
                            placeholder="e.g. John Doe"
                            value={authName}
                            onChange={(e) => {
                              setAuthName(e.target.value);
                              setOtpError("");
                            }}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-[13px] sm:text-[14px] bg-slate-50 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-semibold text-slate-800"
                          />
                        </div>
                      </div>
                    )}

                    {/* Job Role Dropdown (Sign Up only) */}
                    {authMode === "signup" && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Job Role
                        </label>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                            work
                          </span>
                          <select
                            required
                            value={authRole}
                            onChange={(e) => {
                              setAuthRole(e.target.value);
                              setOtpError("");
                            }}
                            className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 text-[13px] sm:text-[14px] bg-slate-50 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-semibold text-slate-800 appearance-none cursor-pointer"
                          >
                            <option value="" disabled>Select your role</option>
                            <option value="SDR / BDR">SDR / BDR</option>
                            <option value="Sales Operations Manager">Sales Operations Manager</option>
                            <option value="Marketing Operations Manager">Marketing Operations Manager</option>
                            <option value="Growth Marketer">Growth Marketer</option>
                            <option value="Founder / CEO">Founder / CEO</option>
                            <option value="Developer / Engineer">Developer / Engineer</option>
                            <option value="Other">Other</option>
                          </select>
                          <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">
                            arrow_drop_down
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Email Address (All modes) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Email Address
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                          mail
                        </span>
                        <input
                          type="email"
                          required
                          placeholder="e.g. name@company.com"
                          value={loginEmail}
                          onChange={(e) => {
                            setLoginEmail(e.target.value);
                            setOtpError("");
                          }}
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-[13px] sm:text-[14px] bg-slate-50 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-semibold text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Password Field (Sign Up & Sign In only) */}
                    {(authMode === "signup" || authMode === "signin") && (
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Password
                          </label>
                          {authMode === "signin" && (
                            <button
                              type="button"
                              onClick={() => {
                                setAuthMode("forgot_password");
                                setOtpError("");
                                setSuccessMessage("");
                              }}
                              className="text-[11px] font-semibold text-indigo-600 hover:underline focus:outline-none font-bold"
                            >
                              Forgot Password?
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                            lock
                          </span>
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            placeholder="At least 6 characters"
                            value={authPassword}
                            onChange={(e) => {
                              setAuthPassword(e.target.value);
                              setOtpError("");
                            }}
                            className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 text-[13px] sm:text-[14px] bg-slate-50 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-semibold text-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                          >
                            <span className="material-symbols-outlined text-[18px] select-none">
                              {showPassword ? "visibility_off" : "visibility"}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}

                    {otpError && (
                      <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-[11px] sm:text-[12px] font-medium leading-normal animate-shake">
                        <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                        {otpError}
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSendingOtp}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-600 text-white font-bold text-[13px] sm:text-[14px] hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 transition-all shadow-md hover:shadow-lg focus:outline-none"
                    >
                      {isSendingOtp ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                          {authMode === "signup" ? "Registering..." : (authMode === "forgot_password" ? "Sending Code..." : "Logging in...")}
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">
                            {authMode === "signup" ? "person_add" : (authMode === "forgot_password" ? "send" : "login")}
                          </span>
                          {authMode === "signup" ? "Sign Up" : (authMode === "forgot_password" ? "Send Reset Code" : "Log In")}
                        </>
                      )}
                    </button>

                    {/* Toggle Auth Mode Footer Links */}
                    <div className="text-center pt-2 text-[12px] font-semibold text-slate-500 space-y-2">
                      {authMode === "signup" && (
                        <div>
                          Already have an account?{" "}
                          <button
                            type="button"
                            onClick={() => {
                              setAuthMode("signin");
                              setOtpError("");
                              setSuccessMessage("");
                            }}
                            className="text-indigo-600 hover:underline focus:outline-none font-bold"
                          >
                            Log in
                          </button>
                        </div>
                      )}
                      {authMode === "signin" && (
                        <div>
                          Don't have an account?{" "}
                          <button
                            type="button"
                            onClick={() => {
                              setAuthMode("signup");
                              setOtpError("");
                              setSuccessMessage("");
                            }}
                            className="text-indigo-600 hover:underline focus:outline-none font-bold"
                          >
                            Sign up
                          </button>
                        </div>
                      )}
                      {authMode === "forgot_password" && (
                        <div>
                          Remembered your password?{" "}
                          <button
                            type="button"
                            onClick={() => {
                              setAuthMode("signin");
                              setOtpError("");
                              setSuccessMessage("");
                            }}
                            className="text-indigo-600 hover:underline focus:outline-none font-bold"
                          >
                            Back to Login
                          </button>
                        </div>
                      )}
                    </div>
                  </form>
                ) : (
                  <form onSubmit={
                    authMode === "forgot_password" 
                      ? handleResetPassword 
                      : (authMode === "signup" ? handleVerifyRegistrationOTP : handleVerifyOTP)
                  } className="space-y-4">
                    
                    {/* OTP input field */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Enter 6-Digit OTP
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                          lock_open
                        </span>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          placeholder="• • • • • •"
                          value={otpCode}
                          onChange={(e) => {
                            setOtpCode(e.target.value.replace(/\D/g, ""));
                            setOtpError("");
                          }}
                          className="w-full pl-10 pr-4 py-3 text-center tracking-[8px] font-mono font-bold rounded-xl border border-slate-200 text-[16px] sm:text-[18px] bg-slate-50 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-slate-800"
                        />
                      </div>
                    </div>

                    {/* New Password field (Forgot Password verification mode) */}
                    {authMode === "forgot_password" && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          New Password
                        </label>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                            lock_reset
                          </span>
                          <input
                            type={showNewPassword ? "text" : "password"}
                            required
                            placeholder="At least 6 characters"
                            value={newPassword}
                            onChange={(e) => {
                              setNewPassword(e.target.value);
                              setOtpError("");
                            }}
                            className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 text-[13px] sm:text-[14px] bg-slate-50 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-semibold text-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                          >
                            <span className="material-symbols-outlined text-[18px] select-none">
                              {showNewPassword ? "visibility_off" : "visibility"}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}

                    {otpError && (
                      <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-[11px] sm:text-[12px] font-medium leading-normal animate-shake">
                        <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                        {otpError}
                      </div>
                    )}

                    {sandboxNotice && (
                      <div className="flex items-start gap-2 p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-[11px] sm:text-[12px] font-medium leading-relaxed">
                        <span className="material-symbols-outlined text-[18px] text-amber-500 shrink-0">info</span>
                        <div>
                          <strong className="block text-amber-900 mb-0.5">⚠️ Development Sandbox Mode</strong>
                          {loginEmail && (loginEmail.endsWith("@company.com") || loginEmail.endsWith("@test.com") || loginEmail.endsWith("@example.com")) ? (
                            <span>This is a simulated test domain. You can verify access using the mock bypass code: <strong className="text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-mono font-bold text-[13px] border border-indigo-200">123456</strong></span>
                          ) : (
                            <span>Resend email configurations aren't set in your .env yet. We printed the 6-digit OTP code to the **backend terminal window**! Go there to copy and verify it.</span>
                          )}
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isVerifyingOtp || otpCode.length !== 6 || (authMode === "forgot_password" && newPassword.length < 6)}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-600 text-white font-bold text-[13px] sm:text-[14px] hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 transition-all shadow-md hover:shadow-lg focus:outline-none"
                    >
                      {isVerifyingOtp ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                          {authMode === "forgot_password" ? "Resetting Password..." : "Verifying..."}
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">
                            {authMode === "forgot_password" ? "lock_reset" : "verified_user"}
                          </span>
                          {authMode === "forgot_password" ? "Reset Password" : "Verify & Access Workspace"}
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setOtpCode("");
                          setOtpError("");
                          setSuccessMessage("");
                        }}
                        className="hover:text-indigo-600 transition-colors flex items-center gap-0.5 focus:outline-none"
                      >
                        <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                        Change Email
                      </button>

                      {countdown > 0 ? (
                        <span>Resend in {countdown}s</span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendOTP}
                          disabled={isSendingOtp}
                          className="text-indigo-600 hover:underline disabled:opacity-50 font-bold focus:outline-none flex items-center gap-1"
                        >
                          {isSendingOtp && <span className="w-3.5 h-3.5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />}
                          Resend Code
                        </button>
                      )}
                    </div>
                  </form>
                )}

                {/* Shield Notice */}
                <div className="flex items-center justify-center gap-1 mt-6 text-[10px] text-slate-400 font-semibold select-none">
                  <span className="material-symbols-outlined text-[14px] text-green-500">verified</span>
                  Secure SSL Encrypted Connection
                </div>
              </>
            )}

          </div>
        </div>
      )}



      {/* ── User Profile Settings Panel ── */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSaveSuccess={(profile) => {
          setCurrentUser(localStorage.getItem("lead_cleaner_email") || "");
        }}
      />
    </div>
  );
}
