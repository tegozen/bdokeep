/**
 * svc-auth — admin session boundary health (login still on host during strangler).
 */
import { createApp, createRouter, defineEventHandler, toNodeListener } from 'h3'
import { createServer } from 'node:http'

const PORT = Number(process.env.PORT || 3015)
const app = createApp()
const router = createRouter()
router.get('/health', defineEventHandler(() => ({ ok: true, service: 'svc-auth' })))
app.use(router)
createServer(toNodeListener(app)).listen(PORT, '0.0.0.0', () => {
  console.log(`[svc-auth] :${PORT}`)
})
