export const THEME_STORAGE_KEY = "darkMode";

export function readInitialDarkPreference(): boolean {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === null) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return saved === "true";
}

export function applyAppTheme(dark: boolean): void {
  const root = document.documentElement;
  root.classList.toggle("dark-mode", dark);
  root.classList.toggle("dark", dark);
  root.setAttribute("data-bs-theme", dark ? "dark" : "light");
  document.body.classList.toggle("dark-mode", dark);
}
