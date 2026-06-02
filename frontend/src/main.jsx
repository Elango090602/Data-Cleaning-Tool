import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import LandingPage from './pages/LandingPage.jsx'
import App from './pages/App.jsx'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import './index.css'

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function isSessionValid() {
  const token = localStorage.getItem("lead_cleaner_token");
  if (!token) return false;
  const loginTimestamp = localStorage.getItem("lead_cleaner_login_at");
  if (!loginTimestamp) return true; // Legacy sessions without timestamp are treated as valid
  const elapsed = Date.now() - parseInt(loginTimestamp, 10);
  return elapsed < SESSION_TTL_MS;
}

function clearSession() {
  localStorage.removeItem("lead_cleaner_token");
  localStorage.removeItem("lead_cleaner_email");
  localStorage.removeItem("lead_cleaner_name");
  localStorage.removeItem("lead_cleaner_login_at");
}

function Root() {
  const [page, setPage] = useState(() => {
    if (window.location.hash === "#app" && isSessionValid()) return "app";
    // If token exists but expired, clear it
    if (localStorage.getItem("lead_cleaner_token") && !isSessionValid()) clearSession();
    return "landing";
  });

  // Periodically check session validity while on app page
  useEffect(() => {
    if (page !== "app") return;
    const interval = setInterval(() => {
      if (!isSessionValid()) {
        clearSession();
        window.location.hash = "";
        setPage("landing");
      }
    }, 60 * 1000); // Check every minute
    return () => clearInterval(interval);
  }, [page]);

  useEffect(() => {
    if (page !== "landing") return;

    // Initialize Lenis smooth scroll
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
      smoothWheel: true,
      wheelMultiplier: 1.0,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
    window.lenis = lenis;

    // Intercept anchor clicks for momentum scrolling with header offset
    const handleAnchorClick = (e) => {
      const href = e.currentTarget.getAttribute("href");
      if (href && href.startsWith("#")) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          lenis.scrollTo(target, {
            offset: -80, // Offset for sticky navigation bar
            duration: 1.4,
          });
        }
      }
    };

    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => link.addEventListener("click", handleAnchorClick));

    return () => {
      lenis.destroy();
      window.lenis = null;
      links.forEach(link => link.removeEventListener("click", handleAnchorClick));
    };
  }, [page]);

  if (page === "app") {
    return (
      <App 
        onBackToLanding={() => {
          // Navigate to landing WITHOUT clearing session
          window.location.hash = "";
          setPage("landing");
        }}
        onLogout={() => {
          clearSession();
          window.location.hash = "";
          setPage("landing");
        }}
      />
    );
  }

  return (
    <LandingPage 
      onEnterApp={() => {
        window.location.hash = "#app";
        setPage("app");
      }} 
    />
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
