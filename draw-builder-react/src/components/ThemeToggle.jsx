import { useState } from 'react';
import { resolvedTheme, setTheme } from '../utils/theme';
import { IconSun, IconMoon } from './Icon';

export default function ThemeToggle({ className = 'theme-toggle' }) {
  const [theme, setThemeState] = useState(resolvedTheme());

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setThemeState(next);
  }

  return (
    <button
      type="button"
      className={className}
      onClick={toggle}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <IconSun /> : <IconMoon />}
    </button>
  );
}
