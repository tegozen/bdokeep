/**
 * svc-proposals — proposal queue orchestrator (create + admin moderation).
 * Domain apply still delegated to host modules / section services during strangler.
 */
import {
  createApp,
  createRouter,
  defineEventHandler,
  toNodeListener,
} from 'h3'
import { createServer } from 'node:http'

const PORT = Number(process.env.PORT || 3014)

const app = createApp()
const router = createRouter()

router.get(
  '/health',
  defineEventHandler(() => ({ ok: true, service: 'svc-proposals' })),
)

// Full proposal handlers remain on host Nitro until cutover; this service
// owns the health/boundary and will absorb routes in a follow-up deploy step.
router.get(
  '/api/proposals/health',
  defineEventHandler(() => ({
    ok: true,
    note: 'Orchestrator boundary ready; routes proxied via host during strangler',
  })),
)

app.use(router)
createServer(toNodeListener(app)).listen(PORT, '0.0.0.0', () => {
  console.log(`[svc-proposals] :${PORT}`)
})
