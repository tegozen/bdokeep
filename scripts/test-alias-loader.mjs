import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const domainDir = path.join(root, 'apps/mf-shared/domain')

export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@domain' || specifier === '@bdokeep/domain') {
    return {
      shortCircuit: true,
      url: pathToFileURL(path.join(domainDir, 'index.ts')).href,
    }
  }
  if (specifier.startsWith('@domain/')) {
    const rest = specifier.slice('@domain/'.length)
    return {
      shortCircuit: true,
      url: pathToFileURL(path.join(domainDir, `${rest}.ts`)).href,
    }
  }
  return nextResolve(specifier, context)
}
