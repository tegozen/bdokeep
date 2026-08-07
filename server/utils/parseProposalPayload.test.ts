import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createError } from 'h3'
import { CRYSTAL_PRESET_IDS, MAX_COMBOS_PER_MODE } from '../../domain/index.ts'
import type { Sql } from './db.ts'
import {
  parseAndValidatePayload,
  type CatalogIdsExist,
} from './parseProposalPayload.ts'
import { formatApplyRejectNote } from './applyPendingOrReject.ts'

const SKILL_A = '11111111-1111-4111-8111-111111111111'
const SKILL_B = '22222222-2222-4222-8222-222222222222'
const BUFF_A = '33333333-3333-4333-8333-333333333333'
const CRYSTAL_A = '44444444-4444-4444-8444-444444444444'
const RELIC_A = '55555555-5555-4555-8555-555555555555'
const LIGHT_A = '66666666-6666-4666-8666-666666666666'
const ESSENCE_A = '77777777-7777-4777-8777-777777777777'

const dummySql = (() => {
  const fn = async () => []
  return fn as unknown as Sql
})()

function allowAll(ids: string[]): CatalogIdsExist {
  const set = new Set(ids)
  return async (_sql, _table, requested) => new Set(requested.filter((id) => set.has(id)))
}

function allowNone(): CatalogIdsExist {
  return async () => new Set()
}

async function expectHttpError(
  fn: () => Promise<unknown>,
  statusCode: number,
  statusMessage?: string | RegExp,
) {
  await assert.rejects(fn, (err: unknown) => {
    assert.ok(err && typeof err === 'object' && 'statusCode' in err)
    const e = err as { statusCode: number; statusMessage?: string }
    assert.equal(e.statusCode, statusCode)
    if (typeof statusMessage === 'string') {
      assert.equal(e.statusMessage, statusMessage)
    } else if (statusMessage) {
      assert.match(String(e.statusMessage || ''), statusMessage)
    }
    return true
  })
}

describe('formatApplyRejectNote', () => {
  it('prefers H3 statusMessage', () => {
    const err = createError({ statusCode: 400, statusMessage: 'Некорректный пресет' })
    assert.equal(
      formatApplyRejectNote(err),
      'auto-reject: apply failed — Некорректный пресет',
    )
  })

  it('falls back to Error.message', () => {
    assert.equal(
      formatApplyRejectNote(new Error('boom')),
      'auto-reject: apply failed — boom',
    )
  })

  it('truncates long detail', () => {
    const long = 'x'.repeat(600)
    const note = formatApplyRejectNote(new Error(long))
    assert.ok(note.length <= 500)
    assert.ok(note.startsWith('auto-reject: apply failed — '))
  })
})

describe('parseAndValidatePayload combo', () => {
  it('accepts legacy skill_ids', async () => {
    const out = await parseAndValidatePayload({
      sql: dummySql,
      classSlug: 'warrior',
      section: 'combo_awakening',
      rawPayload: { skill_ids: [SKILL_A, SKILL_B] },
      catalogIdsExist: allowAll([SKILL_A, SKILL_B]),
    })
    assert.deepEqual(out.payload, {
      mode: 'awakening',
      kind: 'pvp',
      combos: [{ title: '', notes: '', skill_ids: [SKILL_A, SKILL_B] }],
    })
  })

  it('accepts kind pve', async () => {
    const out = await parseAndValidatePayload({
      sql: dummySql,
      classSlug: 'warrior',
      section: 'combo_awakening',
      rawPayload: { kind: 'pve', combos: [{ skill_ids: [SKILL_A] }] },
      catalogIdsExist: allowAll([SKILL_A]),
    })
    assert.equal(out.payload.kind, 'pve')
  })

  it('rejects invalid kind', async () => {
    await expectHttpError(
      () =>
        parseAndValidatePayload({
          sql: dummySql,
          classSlug: 'warrior',
          section: 'combo_awakening',
          rawPayload: { kind: 't1', combos: [{ skill_ids: [SKILL_A] }] },
          catalogIdsExist: allowAll([SKILL_A]),
        }),
      400,
      'Некорректный тип комбы',
    )
  })

  it('rejects empty combo', async () => {
    await expectHttpError(
      () =>
        parseAndValidatePayload({
          sql: dummySql,
          classSlug: 'warrior',
          section: 'combo_awakening',
          rawPayload: { combos: [] },
          catalogIdsExist: allowAll([]),
        }),
      400,
      'Выберите хотя бы один скилл',
    )
  })

  it('rejects over MAX_COMBOS_PER_MODE', async () => {
    const combos = Array.from({ length: MAX_COMBOS_PER_MODE + 1 }, () => ({
      skill_ids: [SKILL_A],
    }))
    await expectHttpError(
      () =>
        parseAndValidatePayload({
          sql: dummySql,
          classSlug: 'warrior',
          section: 'combo_awakening',
          rawPayload: { combos },
          catalogIdsExist: allowAll([SKILL_A]),
        }),
      400,
      `Максимум ${MAX_COMBOS_PER_MODE} комб`,
    )
  })

  it('skipUnknownCatalog drops unknown skills to empty replace', async () => {
    const out = await parseAndValidatePayload({
      sql: dummySql,
      classSlug: 'warrior',
      section: 'combo_succession',
      rawPayload: { combos: [{ skill_ids: [SKILL_A] }] },
      skipUnknownCatalog: true,
      catalogIdsExist: allowNone(),
    })
    assert.deepEqual(out.payload, { mode: 'succession', kind: 'pvp', combos: [] })
  })
})

describe('parseAndValidatePayload buffs', () => {
  it('happy path with replaced_presets', async () => {
    const out = await parseAndValidatePayload({
      sql: dummySql,
      classSlug: 'warrior',
      section: 'buffs',
      rawPayload: {
        buffs: [{ preset: 't1', buff_id: BUFF_A, sort_order: 0 }],
        replaced_presets: [...CRYSTAL_PRESET_IDS],
      },
      catalogIdsExist: allowAll([BUFF_A]),
    })
    assert.equal((out.payload.buffs as unknown[]).length, 1)
    assert.deepEqual(out.payload.replaced_presets, [...CRYSTAL_PRESET_IDS])
  })

  it('rejects rows outside replaced_presets', async () => {
    await expectHttpError(
      () =>
        parseAndValidatePayload({
          sql: dummySql,
          classSlug: 'warrior',
          section: 'buffs',
          rawPayload: {
            buffs: [{ preset: 't2', buff_id: BUFF_A }],
            replaced_presets: ['t1'],
          },
          catalogIdsExist: allowAll([BUFF_A]),
        }),
      400,
      'Строки вне replaced_presets',
    )
  })
})

describe('parseAndValidatePayload crystals', () => {
  it('happy path', async () => {
    const out = await parseAndValidatePayload({
      sql: dummySql,
      classSlug: 'warrior',
      section: 'crystals',
      rawPayload: {
        crystals: [{ preset: 't1', slot: 'nw', item_id: CRYSTAL_A, sort_order: 0 }],
        replaced_presets: ['t1'],
      },
      catalogIdsExist: allowAll([CRYSTAL_A]),
    })
    assert.equal((out.payload.crystals as unknown[]).length, 1)
  })

  it('skipUnknown: unknown item dropped; wiped structural preset leaves intentional clears', async () => {
    const STALE = '88888888-8888-4888-8888-888888888888'
    const out = await parseAndValidatePayload({
      sql: dummySql,
      classSlug: 'warrior',
      section: 'crystals',
      rawPayload: {
        crystals: [
          { preset: 't1', slot: 'nw', item_id: CRYSTAL_A },
          { preset: 't2', slot: 'nw', item_id: STALE },
        ],
        replaced_presets: [...CRYSTAL_PRESET_IDS],
      },
      skipUnknownCatalog: true,
      catalogIdsExist: allowAll([CRYSTAL_A]),
    })
    const crystals = out.payload.crystals as Array<{ preset: string }>
    assert.deepEqual(
      crystals.map((c) => c.preset),
      ['t1'],
    )
    const replaced = out.payload.replaced_presets as string[]
    assert.ok(replaced.includes('t1'))
    assert.ok(!replaced.includes('t2'))
    assert.ok(replaced.includes('besp'))
    assert.ok(replaced.includes('sub'))
  })
})

describe('parseAndValidatePayload relics / hardening', () => {
  it('relics happy path', async () => {
    const out = await parseAndValidatePayload({
      sql: dummySql,
      classSlug: 'warrior',
      section: 'relics',
      rawPayload: {
        relics: [{ preset: 't1', slot: 'r0', item_id: RELIC_A }],
        lightstones: [{ preset: 't1', slot: 'r0_a', item_id: LIGHT_A }],
        replaced_presets: ['t1'],
      },
      catalogIdsExist: async (_sql, _table, ids, extra) => {
        if (extra?.itemType === 'relic') return new Set(ids.filter((id) => id === RELIC_A))
        if (extra?.itemType === 'lightstone') return new Set(ids.filter((id) => id === LIGHT_A))
        return new Set()
      },
    })
    assert.equal((out.payload.relics as unknown[]).length, 1)
    assert.equal((out.payload.lightstones as unknown[]).length, 1)
  })

  it('hardening happy path', async () => {
    const out = await parseAndValidatePayload({
      sql: dummySql,
      classSlug: 'warrior',
      section: 'hardening',
      rawPayload: {
        hardening: [{ preset: 't1', slot: 'h0', item_id: ESSENCE_A }],
        replaced_presets: ['t1'],
      },
      catalogIdsExist: allowAll([ESSENCE_A]),
    })
    assert.equal((out.payload.hardening as unknown[]).length, 1)
  })
})

describe('parseAndValidatePayload videos', () => {
  it('rejects empty without allowEmptyVideos', async () => {
    await expectHttpError(
      () =>
        parseAndValidatePayload({
          sql: dummySql,
          classSlug: 'warrior',
          section: 'videos_awakening',
          rawPayload: { videos: [] },
          parseVideos: async (raw, opts) => {
            if (!Array.isArray(raw) || raw.length === 0) {
              if (opts?.allowEmpty) return []
              throw createError({
                statusCode: 400,
                statusMessage: 'Добавьте хотя бы одно видео',
              })
            }
            return []
          },
        }),
      400,
      'Добавьте хотя бы одно видео',
    )
  })

  it('allows empty with allowEmptyVideos', async () => {
    const out = await parseAndValidatePayload({
      sql: dummySql,
      classSlug: 'warrior',
      section: 'videos_succession',
      rawPayload: { videos: [] },
      allowEmptyVideos: true,
      parseVideos: async (raw, opts) => {
        if (!Array.isArray(raw) || raw.length === 0) {
          if (opts?.allowEmpty) return []
          throw createError({
            statusCode: 400,
            statusMessage: 'Добавьте хотя бы одно видео',
          })
        }
        return []
      },
    })
    assert.deepEqual(out.payload.videos, [])
    assert.deepEqual(out.verifiedVideos, [])
  })
})

describe('parseAndValidatePayload morphs', () => {
  const EFFECT_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  const EFFECT_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

  function morphSql(): Sql {
    const fn = async (strings: TemplateStringsArray) => {
      const text = strings.join(' ')
      if (text.includes('from skills')) {
        return [
          {
            id: SKILL_A,
            supports_addon: true,
            addon_effect_keys: ['key_a', 'key_b'],
          },
        ]
      }
      if (text.includes('skill_addon_effects')) {
        return [
          { id: EFFECT_A, key: 'key_a' },
          { id: EFFECT_B, key: 'key_b' },
        ]
      }
      return []
    }
    return fn as unknown as Sql
  }

  it('happy path', async () => {
    const out = await parseAndValidatePayload({
      sql: morphSql(),
      classSlug: 'warrior',
      section: 'morphs',
      rawPayload: {
        morphs: [
          {
            preset: 'aw_t1',
            slot_level: 50,
            skill_id: SKILL_A,
            effect_ids: [EFFECT_A, EFFECT_B],
          },
        ],
        replaced_presets: ['aw_t1'],
      },
    })
    assert.equal((out.payload.morphs as unknown[]).length, 1)
    assert.deepEqual(out.payload.replaced_presets, ['aw_t1'])
  })
})

describe('parseAndValidatePayload summary', () => {
  it('sanitizes markdown and accepts text', async () => {
    const out = await parseAndValidatePayload({
      sql: dummySql,
      classSlug: 'warrior',
      section: 'summary_awakening',
      rawPayload: { text: 'Роль: **танк**' },
    })
    assert.equal(out.payload.text, 'Роль: **танк**')
  })

  it('rejects empty text', async () => {
    await expectHttpError(
      () =>
        parseAndValidatePayload({
          sql: dummySql,
          classSlug: 'warrior',
          section: 'summary_succession',
          rawPayload: { text: '   ' },
        }),
      400,
      'Текст пустой',
    )
  })
})
