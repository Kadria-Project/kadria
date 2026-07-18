import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../')

export async function resolve(specifier, context, nextResolve) {
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
    try {
      return await nextResolve(`${specifier}.ts`, context)
    } catch {
      return nextResolve(specifier, context)
    }
  }

  if (specifier.startsWith('@/')) {
    return nextResolve(pathToFileURL(path.join(REPO_ROOT, specifier.slice(2))).href, context)
  }

  return nextResolve(specifier, context)
}
