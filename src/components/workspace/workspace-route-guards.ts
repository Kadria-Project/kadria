export function isDashboardWorkspacePath(pathname: string | null) {
  // La restauration de navigation ne concerne que le point d'entrée legacy.
  // Les routes dédiées ont déjà une surface propre : restaurer le dernier
  // mode mémorisé les redirigerait à tort (ex. Agenda vers Suivi).
  return pathname === '/dashboard-v2';
}

export function shouldRestoreDashboardNavigation(desktop: boolean | null, pathname: string | null) {
  return desktop === true && isDashboardWorkspacePath(pathname);
}
