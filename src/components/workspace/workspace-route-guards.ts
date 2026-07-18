export function isDashboardWorkspacePath(pathname: string | null) {
  return pathname === '/dashboard-v2' || Boolean(pathname?.startsWith('/dashboard-v2/'));
}

export function shouldRestoreDashboardNavigation(desktop: boolean | null, pathname: string | null) {
  return desktop === true && isDashboardWorkspacePath(pathname);
}
