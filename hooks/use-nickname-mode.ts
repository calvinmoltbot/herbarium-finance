'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'herbarium-nickname-mode';

export function useNicknameMode() {
  const [showNicknames, setShowNicknames] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') setShowNicknames(true);
  }, []);

  const toggleNicknames = useCallback(() => {
    setShowNicknames(prev => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return { showNicknames, toggleNicknames };
}
