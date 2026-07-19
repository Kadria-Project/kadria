// Minimal ESM resolution hook used ONLY by the test runner (node --test) so
// that `import 'server-only'` inside src/lib/dev/ux-audit-guard.ts resolves
// without requiring the `server-only` package to be an installed dependency.
// `server-only` is a build-time-only no-op guard normally shimmed by
// Next.js's webpack config; it has no runtime behaviour, so redirecting it
// to an empty module here is safe and does not affect production behaviour
// (this loader is never registered outside of the test run).
export async function resolve(specifier, context, nextResolve) {
  if (specifier === '../ux-audit-guard') {
    return {
      url: new URL('../ux-audit-guard.ts', context.parentURL).href,
      shortCircuit: true,
    }
  }
  if (specifier === 'server-only') {
    return {
      url: 'data:text/javascript,export default undefined;',
      shortCircuit: true,
    }
  }
  return nextResolve(specifier, context)
}
