import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve as resolvePath } from 'node:path'
const root = resolvePath(dirname(fileURLToPath(import.meta.url)), '../..')
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export default undefined;', shortCircuit: true }
  if (specifier === 'next/headers') return nextResolve('next/headers.js', context)
  if (specifier.startsWith('@/')) return nextResolve(pathToFileURL(resolvePath(root, `${specifier.slice(2)}.ts`)).href, context)
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
    try { return await nextResolve(`${specifier}.ts`, context) } catch { return nextResolve(specifier, context) }
  }
  return nextResolve(specifier, context)
}
