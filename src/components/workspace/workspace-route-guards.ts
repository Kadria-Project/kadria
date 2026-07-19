const DASHBOARD_WORKSPACE_PATHS = new Set([
  '/dashboard-v2',
  '/dashboard-v2/a-faire',
  '/dashboard-v2/suivi',
  '/dashboard-v2/agenda',
  '/dashboard-v2/clients',
  '/dashboard-v2/performance',
]);

export function isDashboardWorkspacePath(pathname: string | null) {
  // Les fiches projet et client sont aussi sous /dashboard-v2, mais portent
  // leur propre surface. Les restaurer comme un mode du dashboard les
  // redirigerait vers l'accueil au montage du shell.
  return Boolean(pathname && DASHBOARD_WORKSPACE_PATHS.has(pathname));
}

export function shouldRestoreDashboardNavigation(desktop: boolean | null, pathname: string | null) {
  return desktop === true && isDashboardWorkspacePath(pathname);
}
