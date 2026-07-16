// Node's native TypeScript runner does not apply Next.js's bundler-style
// extension resolution. This loader is used only by the dry-run unit test.
export async function resolve(specifier, context, nextResolve) {
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
    try {
      return await nextResolve(`${specifier}.ts`, context)
    } catch {
      return nextResolve(specifier, context)
    }
  }

  return nextResolve(specifier, context)
}
