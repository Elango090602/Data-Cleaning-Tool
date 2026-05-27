import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import LandingPage from './pages/LandingPage.jsx'
import App from './pages/App.jsx'
import './index.css'

function Root() {
  const [page, setPage] = useState(() => {
    return localStorage.getItem("lead_cleaner_token") ? "app" : "landing";
  });

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
