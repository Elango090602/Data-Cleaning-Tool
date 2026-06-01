import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import os from 'os'

// Dynamic Asset Copying Script to install the uploaded logo and favicon
try {
  const home = os.homedir();
  const appDataDir = path.join(home, ".gemini", "antigravity", "brain", "8086cc48-12e0-4f58-946a-1bfb2eb3324e");
  
  const srcLogo = path.join(appDataDir, "media__1779709831081.png"); // New transparent LeadSanity PNG logo
  const srcFavicon = path.join(appDataDir, "media__1779709831081.png"); // Transparent favicon PNG
  
  const destLogoAssets = path.join(__dirname, "src", "assets", "logo.png");
  const destLogoPublic = path.join(__dirname, "public", "logo.png");
  const destFavPublic = path.join(__dirname, "public", "favicon.png");
  const destFavIco = path.join(__dirname, "public", "favicon.ico");
  
  if (fs.existsSync(srcLogo)) {
    fs.mkdirSync(path.dirname(destLogoAssets), { recursive: true });
    fs.mkdirSync(path.dirname(destLogoPublic), { recursive: true });
    fs.copyFileSync(srcLogo, destLogoAssets);
    fs.copyFileSync(srcLogo, destLogoPublic);
    console.log("=== Vite Asset Sync: Copied logo successfully! ===");
  }
  
  if (fs.existsSync(srcFavicon)) {
    fs.copyFileSync(srcFavicon, destFavPublic);
    fs.copyFileSync(srcFavicon, destFavIco);
    console.log("=== Vite Asset Sync: Copied favicon successfully! ===");
  }
} catch (err) {
  console.error("Vite Asset Sync Failed:", err);
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      }
    }
  }
})
