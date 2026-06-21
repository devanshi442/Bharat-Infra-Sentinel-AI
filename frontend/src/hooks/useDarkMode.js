import { useState, useEffect } from 'react'

/**
 * useDarkMode — reads/writes `dark` class on <html> and persists to localStorage.
 * Initialize early (in main.jsx inline script) to avoid flash of wrong theme.
 */
export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false
    return document.documentElement.classList.contains('dark')
  })

  useEffect(() => {
    const html = document.documentElement
    if (dark) {
      html.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      html.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [dark])

  return [dark, setDark]
}
