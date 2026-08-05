import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { combosFromEditorItems, editorItemsFromCombos } from './combo'

describe('combosFromEditorItems', () => {
  it('single chain without dividers', () => {
    assert.deepEqual(
      combosFromEditorItems([
        { kind: 'skill', id: 'a' },
        { kind: 'skill', id: 'b' },
      ]),
      [{ notes: '', skill_ids: ['a', 'b'] }],
    )
  })

  it('leading divider sets first combo notes', () => {
    assert.deepEqual(
      combosFromEditorItems([
        { kind: 'divider', key: 'd0', notes: ' burst ' },
        { kind: 'skill', id: 'a' },
      ]),
      [{ notes: 'burst', skill_ids: ['a'] }],
    )
  })

  it('splits on mid dividers', () => {
    assert.deepEqual(
      combosFromEditorItems([
        { kind: 'skill', id: 'a' },
        { kind: 'divider', key: 'd0', notes: 'note' },
        { kind: 'skill', id: 'b' },
        { kind: 'skill', id: 'c' },
      ]),
      [
        { notes: '', skill_ids: ['a'] },
        { notes: 'note', skill_ids: ['b', 'c'] },
      ],
    )
  })

  it('drops trailing divider', () => {
    assert.deepEqual(
      combosFromEditorItems([
        { kind: 'skill', id: 'a' },
        { kind: 'divider', key: 'd0', notes: 'y' },
      ]),
      [{ notes: '', skill_ids: ['a'] }],
    )
  })

  it('drops consecutive empty dividers; last notes wins', () => {
    assert.deepEqual(
      combosFromEditorItems([
        { kind: 'divider', key: 'd0', notes: 'n1' },
        { kind: 'divider', key: 'd1', notes: 'n2' },
        { kind: 'skill', id: 'a' },
      ]),
      [{ notes: 'n2', skill_ids: ['a'] }],
    )
  })

  it('divider-only list yields empty', () => {
    assert.deepEqual(
      combosFromEditorItems([{ kind: 'divider', key: 'd0', notes: '' }]),
      [],
    )
  })
})

describe('editorItemsFromCombos', () => {
  it('always emits a leading divider per combo', () => {
    const items = editorItemsFromCombos([
      { notes: '', skill_ids: ['a'] },
      { notes: 'B', skill_ids: ['b'] },
    ])
    assert.equal(items[0]?.kind, 'divider')
    assert.equal(items[1]?.kind, 'skill')
    assert.equal(items[2]?.kind, 'divider')
    assert.equal(items[3]?.kind, 'skill')
    if (items[2]?.kind === 'divider') assert.equal(items[2].notes, 'B')
  })
})
