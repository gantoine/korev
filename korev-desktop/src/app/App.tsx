import { AppShell } from './AppShell';
import { Setup } from './Setup';
import { useAuthState } from './useAuthState';
import { useSettings } from './useSettings';
import { useSystemTheme } from './useSystemTheme';

export function App() {
  useSystemTheme();
  const auth = useAuthState();
  const settings = useSettings();
  if (!auth || !settings) return <div className="h-screen bg-app" />;
  if (!auth.connection || settings.repos.length === 0) {
    return <Setup auth={auth} />;
  }
  return <AppShell auth={auth} settings={settings} />;
}
