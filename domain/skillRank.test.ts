import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { collapseSkillsByRank, parseSkillRank } from './skillRank.ts'

describe('parseSkillRank', () => {
  it('parses prefix roman with colon', () => {
    assert.deepEqual(parseSkillRank('III: Благословение Асадаля'), {
      base: 'Благословение Асадаля',
      rank: 3,
    })
  })

  it('parses suffix roman', () => {
    assert.deepEqual(parseSkillRank('Беспощадный удар IV'), {
      base: 'Беспощадный удар',
      rank: 4,
    })
    assert.deepEqual(parseSkillRank('Апперкот щитом II'), {
      base: 'Апперкот щитом',
      rank: 2,
    })
  })

  it('parses roman before parenthetical suffix', () => {
    assert.deepEqual(parseSkillRank('Зарево I (Черный дух)'), {
      base: 'Зарево (Черный дух)',
      rank: 1,
    })
    assert.deepEqual(parseSkillRank('Мощь: Призрачный вихрь III (Черный дух)'), {
      base: 'Мощь: Призрачный вихрь (Черный дух)',
      rank: 3,
    })
  })

  it('parses roman after parenthetical suffix', () => {
    assert.deepEqual(parseSkillRank('Лунная метка (Черный дух) II'), {
      base: 'Лунная метка (Черный дух)',
      rank: 2,
    })
  })

  it('parses high suffix ranks XI–XX', () => {
    assert.deepEqual(parseSkillRank('Тренировка концентрации XI'), {
      base: 'Тренировка концентрации',
      rank: 11,
    })
    assert.deepEqual(parseSkillRank('Тренировка концентрации XIX'), {
      base: 'Тренировка концентрации',
      rank: 19,
    })
    assert.deepEqual(parseSkillRank('Тренировка концентрации XX'), {
      base: 'Тренировка концентрации',
      rank: 20,
    })
  })

  it('leaves non-ranked names alone', () => {
    assert.deepEqual(parseSkillRank('Суть: Беспощадный удар'), {
      base: 'Суть: Беспощадный удар',
      rank: 0,
    })
    assert.deepEqual(parseSkillRank('Благословение Асадаля'), {
      base: 'Благословение Асадаля',
      rank: 0,
    })
  })
})

describe('collapseSkillsByRank', () => {
  it('keeps max rank and base display name', () => {
    const out = collapseSkillsByRank([
      { id: '1', name_ru: 'Беспощадный удар I', icon_url: '/a' },
      { id: '2', name_ru: 'Беспощадный удар III', icon_url: '/a' },
      { id: '3', name_ru: 'Беспощадный удар II', icon_url: '/a' },
    ])
    assert.deepEqual(out, [
      { id: '2', name_ru: 'Беспощадный удар', icon_url: '/a' },
    ])
  })

  it('collapses prefix ranks with unranked base', () => {
    const out = collapseSkillsByRank([
      { id: '0', name_ru: 'Благословение Асадаля', icon_url: '/x' },
      { id: '1', name_ru: 'I: Благословение Асадаля', icon_url: '/x' },
      { id: '5', name_ru: 'V: Благословение Асадаля', icon_url: '/x' },
      { id: '2', name_ru: 'II: Благословение Асадаля', icon_url: '/x' },
    ])
    assert.deepEqual(out, [
      { id: '5', name_ru: 'Благословение Асадаля', icon_url: '/x' },
    ])
  })

  it('preserves first-seen order of distinct bases', () => {
    const out = collapseSkillsByRank([
      { id: 'a1', name_ru: 'Апперкот щитом I' },
      { id: 'b1', name_ru: 'Беспощадный удар I' },
      { id: 'a2', name_ru: 'Апперкот щитом II' },
      { id: 'b4', name_ru: 'Беспощадный удар IV' },
    ])
    assert.equal(out.length, 2)
    assert.equal(out[0]!.id, 'a2')
    assert.equal(out[0]!.name_ru, 'Апперкот щитом')
    assert.equal(out[1]!.id, 'b4')
    assert.equal(out[1]!.name_ru, 'Беспощадный удар')
  })

  it('collapses ranks before parenthetical', () => {
    const out = collapseSkillsByRank([
      { id: '1', name_ru: 'Зарево I (Черный дух)' },
      { id: '2', name_ru: 'Зарево II (Черный дух)' },
      { id: '4', name_ru: 'Зарево IV (Черный дух)' },
      { id: '3', name_ru: 'Зарево III (Черный дух)' },
    ])
    assert.deepEqual(out, [{ id: '4', name_ru: 'Зарево (Черный дух)' }])
  })

  it('does not merge black-spirit with regular ranks', () => {
    const out = collapseSkillsByRank([
      { id: 'a', name_ru: 'Зарево IV' },
      { id: 'b', name_ru: 'Зарево IV (Черный дух)' },
    ])
    assert.equal(out.length, 2)
    assert.equal(out[0]!.name_ru, 'Зарево')
    assert.equal(out[1]!.name_ru, 'Зарево (Черный дух)')
  })

  it('collapses concentration ranks through XX', () => {
    const out = collapseSkillsByRank([
      { id: '0', name_ru: 'Тренировка концентрации' },
      { id: '11', name_ru: 'Тренировка концентрации XI' },
      { id: '19', name_ru: 'Тренировка концентрации XIX' },
      { id: '20', name_ru: 'Тренировка концентрации XX' },
      { id: '15', name_ru: 'Тренировка концентрации XV' },
    ])
    assert.deepEqual(out, [{ id: '20', name_ru: 'Тренировка концентрации' }])
  })

  it('does not merge unrelated colon names', () => {
    const out = collapseSkillsByRank([
      { id: '1', name_ru: 'Суть: Беспощадный удар' },
      { id: '2', name_ru: 'Беспощадный удар I' },
    ])
    assert.equal(out.length, 2)
    assert.equal(out[0]!.name_ru, 'Суть: Беспощадный удар')
    assert.equal(out[1]!.name_ru, 'Беспощадный удар')
  })
})
