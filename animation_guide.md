# LeadSanity Animation Guide: Scroll, Scroll-Reveal & Loading Effects

This document outlines the smooth scrolling, scroll-reveal, loading, and micro-animation systems implemented in **LeadSanity**. You can use this guide and its code snippets as a reference to recreate these modern, fluid user interface effects in other applications.

---

## 1. Smooth Scroll System (Lenis)

LeadSanity utilizes the **Lenis** smooth scroll library to manage viewport momentum, providing a high-premium, elastic scrolling feel.

### Installation
```bash
npm install lenis
```

### Configuration & Interception
In the main application entry point ([main.jsx](file:///d:/Projects/Deepan-%20Data%20Cleaning%20pipeline/zoominfo-lead-cleaner/frontend/src/main.jsx)), Lenis is initialized with customized cubic-bezier easing (`easeOutExpo`) and integrated with React's lifecycle. It also intercepts hash links to calculate offset targets automatically (ideal for sticky navigation headers).

```javascript
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { useEffect } from 'react';

// Inside your main React Component:
useEffect(() => {
  // 1. Initialize Lenis
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
    smoothWheel: true,
    wheelMultiplier: 1.0,
  });

  // 2. Register RequestAnimationFrame loop
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
  window.lenis = lenis;

  // 3. Intercept Anchor Link Clicks for smooth momentum scrolls with sticky header offset
  const handleAnchorClick = (e) => {
    const href = e.currentTarget.getAttribute("href");
    if (href && href.startsWith("#")) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        lenis.scrollTo(target, {
          offset: -80, // Offset to prevent title blocking by a sticky navbar
          duration: 1.4,
        });
      }
    }
  };

  const links = document.querySelectorAll('a[href^="#"]');
  links.forEach(link => link.addEventListener("click", handleAnchorClick));

  // 4. Cleanup on unmount
  return () => {
    lenis.destroy();
    window.lenis = null;
    links.forEach(link => link.removeEventListener("click", handleAnchorClick));
  };
}, []);
```

---

## 2. Scroll-Reveal System (IntersectionObserver & CSS Easing)

As users scroll, sections fade, slide, and bounce into view. This is achieved by combining standard **CSS transitions** (using Google Antigravity custom cubic-bezier curves) with a lightweight **React IntersectionObserver**.

### CSS Configuration ([index.css](file:///d:/Projects/Deepan-%20Data%20Cleaning%20pipeline/zoominfo-lead-cleaner/frontend/src/index.css))

```css
:root {
  /* Premium Easing Curves */
  --ease-out-expo: cubic-bezier(.19, 1, .22, 1);
  --ease-out-back: cubic-bezier(.34, 1.85, .64, 1);
  --ease-out-quint: cubic-bezier(.23, 1, .32, 1);
}

/* Base state for Reveal Sections */
.reveal-section {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.8s var(--ease-out-expo),
              transform 0.8s var(--ease-out-expo);
  will-change: transform, opacity;
}

/* Spring-back Pop Reveal */
.pop-reveal {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
  transition: opacity 0.8s var(--ease-out-back),
              transform 0.8s var(--ease-out-back);
  will-change: transform, opacity;
}

/* Slide in from Left Reveal */
.fade-in-slide {
  opacity: 0;
  transform: translateX(-15px);
  transition: opacity 0.75s var(--ease-out-quint),
              transform 0.75s var(--ease-out-quint);
  will-change: transform, opacity;
}

/* Active Class injected by IntersectionObserver */
.reveal-section.reveal-active,
.pop-reveal.reveal-active,
.fade-in-slide.reveal-active {
  opacity: 1;
  transform: translateY(0) scale(1) translateX(0);
}

/* Staggered Delay offsets */
.reveal-delay-1 { transition-delay: 80ms; }
.reveal-delay-2 { transition-delay: 160ms; }
.reveal-delay-3 { transition-delay: 240ms; }
.reveal-delay-4 { transition-delay: 320ms; }
.reveal-delay-5 { transition-delay: 400ms; }
```

### React Intersection Observer Trigger ([LandingPage.jsx](file:///d:/Projects/Deepan-%20Data%20Cleaning%20pipeline/zoominfo-lead-cleaner/frontend/src/pages/LandingPage.jsx))

```javascript
useEffect(() => {
  const observerOptions = {
    root: null,
    rootMargin: "-20px 0px -20px 0px", // Slight margins to trigger before absolute edge
    threshold: 0.08,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("reveal-active");
      } else {
        // Option: Remove 'reveal-active' to re-animate when scrolling back up
        entry.target.classList.remove("reveal-active");
      }
    });
  }, observerOptions);

  const targets = document.querySelectorAll(".reveal-section, .pop-reveal, .fade-in-slide");
  targets.forEach((target) => observer.observe(target));

  return () => {
    targets.forEach((target) => observer.unobserve(target));
  };
}, []);
```

### Usage Example
```html
<div className="reveal-section reveal-delay-2">
  <h2>Staggered Section Content</h2>
</div>
```

---

## 3. Viewport-Activated Counter Hook

A custom React hook that detects when metrics sections enter the screen and animates metric integers from `0` to a target number using cubic easing.

```javascript
import { useState, useEffect, useRef } from "react";

export function useCounter(target, duration = 2000) {
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
            // easeOutCubic: 1 - (1 - x)^3
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            
            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 } // Triggers when 30% of the metric card is in view
    );
    
    if (ref.current) observer.observe(ref.current);
    
    return () => observer.disconnect();
  }, [target, duration]);

  return [count, ref];
}
```

### Usage Example
```javascript
const [cleanedCount, countRef] = useCounter(245000);

return (
  <div ref={countRef}>
    <span>{cleanedCount.toLocaleString()}</span> Leads Cleaned
  </div>
);
```

---

## 4. Modern Loading Animators

Instead of generic browser progress wheels, LeadSanity implements custom, premium SVG/CSS compound loaders.

### 4.1 Custom Core Loader (Spinning Outer Ring + Pulsing Central Icon)
Used inside the drag-and-drop file uploader. It overlays a rotating track with a standard clockwise spin while animating a central analytics icon with a subtle pulse.

```jsx
<div className="w-14 h-14 relative flex items-center justify-center">
  {/* Static Track Ring */}
  <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
  
  {/* Rotating Accent Ring */}
  <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin" />
  
  {/* Pulsing Core Icon (Material Icon) */}
  <span className="material-symbols-outlined text-primary text-[24px] animate-pulse">
    analytics
  </span>
</div>
```

### 4.2 Fullscreen Backdrop Processing Blur Overlay
Fades in a soft, blurred mask (`backdrop-blur-[4px]`) over the viewport during backend processing, keeping focus centered on the engine status.

```jsx
{isProcessing && (
  <div className="absolute inset-0 bg-surface/90 backdrop-blur-[4px] flex flex-col items-center justify-center gap-md z-50 animate-fade-in select-none">
    {/* Large Spinner */}
    <div className="w-16 h-16 relative flex items-center justify-center">
      <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
      <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin" />
      <span className="material-symbols-outlined text-primary text-[32px] animate-pulse">
        bolt
      </span>
    </div>
    <div className="text-center max-w-md">
      <h3 className="text-[22px] font-bold text-primary">Running Sanitization Engine</h3>
      <p className="text-secondary mt-sm leading-relaxed">
        Deduplicating rows, formatting emails, and mapping schemas...
      </p>
    </div>
  </div>
)}
```

### 4.3 Action Button Micro-Spinners
Inline loading indicators inside buttons that prevent layout shifts when a backend query is fired.

```jsx
<button disabled={isLoading} className="flex items-center gap-2">
  {isLoading && (
    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
  )}
  {isLoading ? "Saving..." : "Save Settings"}
</button>
```

---

## 5. Micro-Interactions

### 5.1 Click Compression Effect
Gives tactile feedback to primary action buttons by scaling them down slightly when active.
```tailwind
className="transition-all duration-150 active:scale-95"
```

### 5.2 Hover Elevation
Raises profile indicator cards or options panels with smooth shadow transfers.
```tailwind
className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
```

### 5.3 Stepper Connector Progress Bar
Smoothly expands the connector line width to match step progress percentages (e.g. `25%` to `50%`) with transition interpolation.
```jsx
<div 
  className="absolute left-0 top-4 -translate-y-1/2 h-[2px] bg-primary transition-all duration-300 ease-out z-0"
  style={{ width: `${progressPercent}%` }}
/>
```
