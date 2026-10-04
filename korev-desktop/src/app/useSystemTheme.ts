import { useEffect } from 'react';
import { useMediaQuery } from './useMediaQuery';

const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

export function useSystemTheme() {
  const dark = useMediaQuery(DARK_SCHEME_QUERY);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [dark]);
}
