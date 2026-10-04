const FILE_PROTOCOL = 'file:';
const GITHUB_WEB_ORIGIN = 'https://github.com';

export interface AppOrigin {
  devServerUrl: string | undefined;
  rendererDirectory: string;
}

function parseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function isInsideDirectory(filePath: string, directory: string): boolean {
  const normalizedDirectory = directory.endsWith('/')
    ? directory
    : `${directory}/`;
  return filePath.startsWith(normalizedDirectory);
}

export function isAppUrl(url: string | undefined, origin: AppOrigin): boolean {
  const parsed = url ? parseUrl(url) : null;
  if (!parsed) return false;
  if (origin.devServerUrl) {
    return parsed.origin === new URL(origin.devServerUrl).origin;
  }
  if (parsed.protocol !== FILE_PROTOCOL) return false;
  return isInsideDirectory(
    decodeURIComponent(parsed.pathname),
    origin.rendererDirectory,
  );
}

export function isGithubUrl(url: string): boolean {
  const parsed = parseUrl(url);
  return parsed?.origin === GITHUB_WEB_ORIGIN;
}
