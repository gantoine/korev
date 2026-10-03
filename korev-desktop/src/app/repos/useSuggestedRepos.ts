import { useEffect, useState } from 'react';
import { korev } from '../bridge';

export function useSuggestedRepos(): string[] {
  const [suggested, setSuggested] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    void korev()
      .settings.suggestedRepos()
      .then((repos) => {
        if (active) setSuggested(repos);
      });
    return () => {
      active = false;
    };
  }, []);
  return suggested;
}
