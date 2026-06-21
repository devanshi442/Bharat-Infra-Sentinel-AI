import { Sun, Moon } from 'lucide-react'
import { useDarkMode } from '../hooks/useDarkMode'

/**
 * DarkModeToggle — sun/moon button.
 * variant="light" = for use on dark/colored hero backgrounds (white icon)
 * variant="dark"  = for use on light backgrounds (slate icon)
 */
export default function DarkModeToggle({ variant = 'dark' }) {
  const [dark, setDark] = useDarkMode()

  const baseClass =
    'flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95'

  const lightVariant =
    'text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20'
  const darkVariant =
    'text-slate-500 hover:text-brand-primary bg-surface-2 hover:bg-brand-light border border-border-muted dark:text-purple-300 dark:hover:text-brand-medium dark:bg-surface dark:hover:bg-surface-2 dark:border-border-muted'

  return (
    <button
      onClick={() => setDark(d => !d)}
      className={`${baseClass} ${variant === 'light' ? lightVariant : darkVariant}`}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}
