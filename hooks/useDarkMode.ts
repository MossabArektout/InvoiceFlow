'use client';

import { useEffect, useState } from 'react';

const DEFAULT_STORAGE_KEY = 'invoiceflow_theme';
const DEFAULT_CLASS_NAME = 'invoiceflow-dark';

export const useDarkMode = (storageKey = DEFAULT_STORAGE_KEY, className = DEFAULT_CLASS_NAME) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedTheme = localStorage.getItem(storageKey);
    setIsDarkMode(storedTheme === 'dark');
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    root.classList.toggle(className, isDarkMode);
    localStorage.setItem(storageKey, isDarkMode ? 'dark' : 'light');
  }, [className, isDarkMode, storageKey]);

  return { isDarkMode, setIsDarkMode };
};

