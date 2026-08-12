import assert from 'node:assert/strict'
import { afterEach, describe, it, mock } from 'node:test'
import { createError } from 'h3'

const applyProposalMock = mock.fn(async () => {
  throw createError({ statusCode: 502, statusMessage: 'apply boom' })
})

let sqlUpdateCalled = false
const sql = Object.assign(
  async () => {
    sqlUpdateCalled = true
    return []
  },
  { json: (v: unknown) => v },
)

mock.module('./applyProposal.ts', {
  namedExports: { applyProposal: applyProposalMock },
})

mock.module('./db.ts', {
  namedExports: { useDb: () => sql },
})

const { applyPendingOrReject } = await import('./applyPendingOrReject.ts')

describe('applyPendingOrReject', () => {
  afterEach(() => {
    applyProposalMock.mock.resetCalls()
    sqlUpdateCalled = false
  })

  const proposal = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    class_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    section: 'buffs',
    payload: {},
    status: 'pending',
  }

  it('leaves row pending when rejectOnFailure is false', async () => {
    await assert.rejects(
      () => applyPendingOrReject(proposal, { rejectOnFailure: false }),
      (err: unknown) => {
        assert.ok(err && typeof err === 'object' && 'statusMessage' in err)
        assert.equal((err as { statusMessage?: string }).statusMessage, 'apply boom')
        return true
      },
    )
    assert.equal(sqlUpdateCalled, false)
  })

  it('auto-rejects pending row by default on apply failure', async () => {
    await assert.rejects(() => applyPendingOrReject(proposal))
    assert.equal(sqlUpdateCalled, true)
  })
})
