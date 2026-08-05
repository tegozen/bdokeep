import {
  defineAsyncComponent,
  type AsyncComponentLoader,
  type Component,
} from 'vue'
import { MF_REMOTES, type MfRemoteName } from './mfRemotes'

type RemoteContainer = {
  get: (module: string) => Promise<() => unknown>
  init: (shareScope: Record<string, unknown>) => void
}

const containers = new Map<string, Promise<RemoteContainer>>()

async function shareScope(): Promise<Record<string, unknown>> {
  const vue = await import('vue')
  const version = vue.version || '3'
  return {
    vue: {
      [version]: {
        get: () => () => vue,
        loaded: 1,
        from: 'bdokeep_host',
      },
    },
  }
}

async function loadContainer(name: MfRemoteName): Promise<RemoteContainer> {
  const existing = containers.get(name)
  if (existing) return existing

  const pending = (async () => {
    const url = MF_REMOTES[name]
    const remote = (await import(/* @vite-ignore */ url)) as RemoteContainer
    remote.init(await shareScope())
    return remote
  })()

  containers.set(name, pending)
  return pending
}

/** Load a Module Federation expose (`./Live`, `./Draft`, `./Propose`). Client-only. */
export async function loadMfModule<T = Component>(
  name: MfRemoteName,
  exposed: './Live' | './Draft' | './Propose',
): Promise<T> {
  if (import.meta.server) {
    throw new Error(`MF remote ${name}${exposed} is client-only`)
  }
  const container = await loadContainer(name)
  const factory = await container.get(exposed)
  const mod = factory() as { default?: T } | T
  if (mod && typeof mod === 'object' && 'default' in mod && mod.default) {
    return mod.default
  }
  return mod as T
}

function ssrStub(): Component {
  return { name: 'MfSsrStub', render: () => null }
}

/** Async Vue component bound to a remote expose. SSR renders nothing. */
export function mfAsyncComponent(
  name: MfRemoteName,
  exposed: './Live' | './Draft' | './Propose',
): Component {
  const loader: AsyncComponentLoader = async () => {
    if (import.meta.server) return ssrStub()
    return loadMfModule(name, exposed)
  }
  return defineAsyncComponent({
    loader,
    delay: 0,
    suspensible: false,
  })
}

/** Loader for ProposeLazy / on-demand opens. */
export function mfProposeLoader(name: MfRemoteName): () => Promise<{ default: Component }> {
  return async () => {
    const comp = await loadMfModule<Component>(name, './Propose')
    return { default: comp }
  }
}
