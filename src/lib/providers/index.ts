import { createDemoActionProvider, createProductionActionProvider, type DemoActionSink } from './action-provider';
import { createDemoDataProvider, createProductionDataProvider, type DemoDataSnapshot } from './data-provider';
import { demoRoutes, productionRoutes } from './route-provider';
import type { AppMode, AppProviders } from './types';

export * from './types';
export * from './route-provider';
export * from './action-provider';
export * from './data-provider';

/**
 * Returns the route/action/data providers for the given mode.
 *
 * - mode "production": routes/actions/data hit the real app — identical to
 *   the current production behavior of ArtisanDashboard.tsx /
 *   app/dashboard-v2/projet/[id]/page.tsx / app/parametres/page.tsx.
 * - mode "demo": routes point at the demo routes, actions are simulated
 *   locally, data is read from the supplied demo snapshot (defaults to the
 *   static demo-data.ts fixtures if no live snapshot is passed).
 *
 * `demoSink`/`demoSnapshot` should be sourced from `useDemoMode()` once a
 * screen migrates to call `getAppProviders('demo', { sink, snapshot })` —
 * not yet wired into any screen in this lot.
 */
export function getAppProviders(
  mode: AppMode,
  demo?: { sink?: DemoActionSink; snapshot?: DemoDataSnapshot },
): AppProviders {
  if (mode === 'demo') {
    return {
      mode,
      routes: demoRoutes,
      actions: demo?.sink
        ? createDemoActionProvider(demo.sink)
        : createDemoActionProvider({
            updateProjectFields: () => {},
            updateProjectStatus: () => {},
            updateProjectNote: () => {},
            updateProjectCallback: () => {},
            createEvent: () => {},
          }),
      data: createDemoDataProvider(demo?.snapshot ?? { projects: [] }),
    };
  }

  return {
    mode,
    routes: productionRoutes,
    actions: createProductionActionProvider(),
    data: createProductionDataProvider(),
  };
}
