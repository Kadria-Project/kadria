// Node's native TypeScript runner does not apply Next.js's bundler-style
// extension resolution nor the `@/*` -> repo-root tsconfig path alias. This
// loader is used only by Lot 3 performance unit tests, which import modules
// (project-lifecycle.ts, project-scoring.ts, trade-taxonomy.ts...) that use
// the `@/` alias transitively.
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../')

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const target = path.join(REPO_ROOT, specifier.slice(2))
    const targetUrl = pathToFileURL(target).href
    try {
      return await nextResolve(targetUrl, context)
    } catch {
      return nextResolve(`${targetUrl}.ts`, context)
    }
  }

  if ((specifier.startsWith('./') || specifier.startsWith('../')) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
    try {
      return await nextResolve(`${specifier}.ts`, context)
    } catch {
      return nextResolve(specifier, context)
    }
  }

  return nextResolve(specifier, context)
}
