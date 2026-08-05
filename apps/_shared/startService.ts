/**
 * Minimal H3 microservice entry — used by apps/svc-*.
 */
import { createServer, type Server } from 'node:http'
import {
  createApp,
  createRouter,
  eventHandler,
  toNodeListener,
  type EventHandler,
  type EventHandlerRequest,
} from 'h3'

export type ServiceRoute = {
  method?: string
  path: string
  handler: EventHandler<EventHandlerRequest, unknown> | EventHandler
}

type StartServiceOpts = {
  name: string
  port: number
  routes: ServiceRoute[]
  healthPath?: string
}

type RouterMethod = (
  path: string,
  handler: EventHandler<EventHandlerRequest, unknown>,
) => unknown

export function startService(opts: StartServiceOpts): Server {
  const app = createApp({ debug: process.env.NODE_ENV !== 'production' })
  const router = createRouter()

  router.get(
    opts.healthPath ?? '/health',
    eventHandler(() => ({ ok: true, service: opts.name })),
  )

  for (const route of opts.routes) {
    const method = (route.method || 'get').toLowerCase()
    const fn = (router as unknown as Record<string, RouterMethod | undefined>)[method]
    if (typeof fn !== 'function') {
      throw new Error(`Unsupported method ${route.method}`)
    }
    fn.call(router, route.path, eventHandler(route.handler))
  }

  app.use(router)

  const server = createServer(toNodeListener(app))
  server.listen(opts.port, '0.0.0.0', () => {
    console.log(`[${opts.name}] listening on ${opts.port}`)
  })
  return server
}
