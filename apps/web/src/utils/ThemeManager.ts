/**
 * Complete Theme Management System for EduTube Application
 * Handles theme persistence, system theme detection, and toggle functionality
 */

export class ThemeManager {
  private theme: 'light' | 'dark';

  constructor() {
    this.theme = this.getStoredTheme() || this.getSystemTheme();
    this.init();
  }

  init() {
    this.applyTheme(this.theme);
    this.setupToggleListener();
    this.setupSystemThemeListener();
  }

  getStoredTheme(): 'light' | 'dark' | null {
    // Use in-memory storage since localStorage not available in artifacts
    return (window as any).appTheme || null;
  }

  setStoredTheme(theme: 'light' | 'dark') {
    (window as any).appTheme = theme;
  }

  getSystemTheme(): 'light' | 'dark' {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  applyTheme(theme: 'light' | 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
    this.updateToggleIcon(theme);
    this.setStoredTheme(theme);
    this.theme = theme;
  }

  toggleTheme() {
    const newTheme = this.theme === 'light' ? 'dark' : 'light';
    this.applyTheme(newTheme);
  }

  updateToggleIcon(theme: 'light' | 'dark') {
    const lightIcon = document.querySelector('.light-icon') as HTMLElement;
    const darkIcon = document.querySelector('.dark-icon') as HTMLElement;
    
    if (lightIcon && darkIcon) {
      if (theme === 'dark') {
        lightIcon.style.display = 'none';
        darkIcon.style.display = 'inline';
      } else {
        lightIcon.style.display = 'inline';
        darkIcon.style.display = 'none';
      }
    }
  }

  setupToggleListener() {
    const toggleButton = document.getElementById('theme-toggle');
    if (toggleButton) {
      toggleButton.addEventListener('click', () => {
        this.toggleTheme();
      });
    }
  }

  setupSystemThemeListener() {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!this.getStoredTheme()) {
        this.applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  getCurrentTheme(): 'light' | 'dark' {
    return this.theme;
  }
}

// Global theme manager instance
export let themeManager: ThemeManager;

// Initialize theme manager
export function initializeTheme() {
  themeManager = new ThemeManager();
  return themeManager;
}