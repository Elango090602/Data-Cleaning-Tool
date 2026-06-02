import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import LandingPage from './pages/LandingPage.jsx'
import App from './pages/App.jsx'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import './index.css'

function Root() {
  const [page, setPage] = useState(() => {
    return localStorage.getItem("lead_cleaner_token") ? "app" : "landing";
  });

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
          localStorage.removeItem("lead_cleaner_token");
          localStorage.removeItem("lead_cleaner_email");
          localStorage.removeItem("lead_cleaner_name");
          setPage("landing");
        }} 
      />
    );
  }

  return <LandingPage onEnterApp={() => setPage("app")} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
