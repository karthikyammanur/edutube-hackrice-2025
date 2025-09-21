import React from 'react';

export function ThemeToggle(): JSX.Element {
  return (
    <div className="theme-toggle-container">
      <button id="theme-toggle" className="theme-toggle-btn" aria-label="Toggle dark mode">
        <span className="theme-icon light-icon">☀️</span>
        <span className="theme-icon dark-icon">🌙</span>
      </button>
    </div>
  );
}