import { useEffect, useState } from 'react';
import { Logo, Tabs } from '../design-system';
import {
  BrandSection,
  ButtonSection,
  DisplaySection,
  FormSection,
  InboxSection,
  NavigationSection,
  OverlaySection,
  ReviewSection,
} from './gallery/sections';

type Theme = 'dark' | 'light';

const THEME_TABS = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
];

function useDocumentTheme(theme: Theme) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
}

export function Gallery() {
  const [theme, setTheme] = useState<Theme>('dark');
  useDocumentTheme(theme);
  return (
    <div className="min-h-screen bg-app">
      <header className="flex h-topbar items-center gap-3 border-b border-border-1 bg-surface px-5">
        <Logo size={18} />
        <span className="text-fg-3">Design system</span>
        <span className="flex-1" />
        <Tabs
          variant="pill"
          value={theme}
          onChange={(id) => setTheme(id as Theme)}
          tabs={THEME_TABS}
        />
      </header>
      <main className="mx-auto flex max-w-content flex-col gap-10 px-6 py-8">
        <BrandSection />
        <ButtonSection />
        <FormSection />
        <DisplaySection />
        <NavigationSection />
        <OverlaySection />
        <ReviewSection />
        <InboxSection />
      </main>
    </div>
  );
}
