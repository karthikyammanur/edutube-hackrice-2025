/**
 * Initialization script to prevent theme flash
 * This must be added to <head> before any content loads
 */

(function() {
  const savedTheme = (window as any).appTheme;
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const theme = savedTheme || systemTheme;
  
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.classList.add('no-transition');
  
  // Remove no-transition class after page loads
  window.addEventListener('load', () => {
    document.documentElement.classList.remove('no-transition');
  });
})();