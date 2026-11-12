/**
 * Recover partial public BDO Keep guide content from the search-index JSON.
 * Never overwrites existing populated sections. No invented catalog entities.
 * Dry-run is the default; --apply commits changes in one transaction.
 */
import fs from 'node:fs'
import postgres from 'postgres'

const args = process.argv.slice(2)
const file = args.find((a) => !a.startsWith('--'))
const apply = args.includes('--apply')
if (!file) throw new Error('Usage: node db/recover-guides.mjs /path/to/recovery.json [--apply]')
const recovery = JSON.parse(fs.readFileSync(file, 'utf8'))
if (!Array.isArray(recovery.recovered_classes)) throw new Error('Invalid recovery JSON')
const databaseUrl = process.env.MIGRATE_DATABASE_URL || process.env.DATABASE_URL
if (!databaseUrl) throw new Error('MIGRATE_DATABASE_URL or DATABASE_URL is required')
const db = postgres(databaseUrl, { max: 1 })

const norm = (s) => String(s ?? '').toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/[—–-]/g,' ').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ')
const baseSkill = (s) => norm(s).replace(/\b(?:i|ii|iii|iv|v|vi|vii|viii|ix|x)\b$/g, '').trim()
const parseQty = (s) => { const match = String(s).match(/^(.*?)\s*[×x]\s*(\d+)$/u); return match ? { name: match[1].trim(), count: Number(match[2]) } : {name:String(s),count:1} }
// Prefer the full skill label, including its roman numeral tier. Only fall
// back to a tierless label when exactly one candidate exists.
const findOne = (rows, name, transform = norm) => {
  const key = norm(name)
  const exact = rows.filter((r) => norm(r.name_ru) === key)
  if (exact.length === 1) return exact[0]
  if (exact.length > 1 || transform === norm) return null
  const fallbackKey = transform(name)
  const fallback = rows.filter((r) => transform(r.name_ru) === fallbackKey)
  return fallback.length === 1 ? fallback[0] : null
}
const report = { mode: apply ? 'apply' : 'dry-run', classes: [], unmatched: [], skipped: [], repairedSlots: 0 }
const missing = (slug, section, name) => report.unmatched.push({slug,section,name})
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0
const CRYSTAL_STANDARD_SLOTS = ['nw','n','ne','n_w','n_c','n_e','w','c_w','c_e','e','s_w','s_c','s_e','sw','s','se']
const LIGHTSTONE_SLOTS = ['r0_a','r0_b','r1_a','r1_b']
const isDawn = (name) => /Кристалл рассвета|речного рассвета/i.test(name)
const isSpirit = (name) => name === 'Камень духов [Скорость]' || name === 'Камень духов [Крит. удар]'

// Repair earlier imports where rows were stored with NULL slots. Never move
// already placed rows. This is a best-effort layout: exact historical positions
// were not captured by Google.
async function repairSlots(sql, table, guideId, slug) {
  const rows = await sql.unsafe(
    `select g.id,g.slot,g.sort_order,i.name_ru from ${table} g join items i on i.id=g.item_id where g.guide_id=$1 and g.preset='t1' order by g.sort_order,g.id`,
    [guideId],
  )
  if (!rows.length || rows.every((r) => r.slot)) return
  if (rows.some((r) => r.slot)) {
    report.skipped.push({slug,section:table,reason:'partially assigned slots; refusing to reorder'})
    return
  }
  let standard = 0, dawn = 0, light = 0, spirit = 0
  for (const row of rows) {
    let slot
    if (table === 'guide_lightstones') slot = LIGHTSTONE_SLOTS[light++]
    else if (isDawn(row.name_ru)) slot = dawn < 6 ? `dawn_${dawn++}` : null
    else if (isSpirit(row.name_ru)) slot = spirit++ === 0 ? 'center' : null
    else slot = CRYSTAL_STANDARD_SLOTS[standard++]
    if (!slot) { missing(slug,table + '_slots',row.name_ru); continue }
    await sql.unsafe(`update ${table} set slot=$1 where id=$2`,[slot,row.id])
    report.repairedSlots++
  }
}

try {
  await db.begin(async (sql) => {
    const [skills, items, buffs, effects] = await Promise.all([
      sql`select id, class_slug, name_ru from skills`,
      sql`select id, name_ru, item_type from items`,
      sql`select id, name_ru from buffs`,
      sql`select id, name_ru, tier_labels from skill_addon_effects`,
    ])
    for (const entry of recovery.recovered_classes) {
      const slug = entry.slug
      const sections = entry.sections || {}
      const klass = (await sql`select id from classes where slug = ${slug}`)[0]
      if (!klass) { report.skipped.push({slug,reason:'class missing: run catalog migrate/seed first'}); continue }
      let guide = (await sql`select * from class_guides where class_id = ${klass.id}`)[0]
      if (!guide) guide = (await sql`insert into class_guides (class_id) values (${klass.id}) returning *`)[0]
      const guideId = guide.id
      const counts = {slug,summary:0,combos:0,comboSteps:0,morphs:0,crystals:0,relics:0,lightstones:0,buffs:0,hardening:0}
      const catalogSkills = skills.filter((s) => s.class_slug === slug)

      // The archived page does not distinguish awakening/succession: use awakening
      // as a reviewable staging choice and never touch succession/PvE data.
      if (nonempty(sections.pvp_notes) && !nonempty(guide.summary_pvp_awakening)) {
        await sql`update class_guides set summary_pvp_awakening = ${sections.pvp_notes}, updated_at = now() where id = ${guideId}`
        counts.summary++
      }
      if (Array.isArray(sections.combos) && sections.combos.length) {
        const exists = await sql`select 1 from guide_combos where guide_id = ${guideId} and mode = 'awakening' and kind = 'pvp' limit 1`
        if (!exists.length) for (const [index, combo] of sections.combos.entries()) {
          const mapped = (combo.skills || []).map((name) => ({name,skill:findOne(catalogSkills,name,baseSkill)}))
          // Do not silently store a truncated combo.
          const unknown = mapped.filter((m) => !m.skill)
          if (unknown.length) { unknown.forEach((m) => missing(slug,'combos',m.name)); continue }
          const title = nonempty(combo.title) ? combo.title.slice(0,60) : null
          const inserted = (await sql`insert into guide_combos (guide_id,mode,kind,sort_order,title) values (${guideId},'awakening','pvp',${index},${title}) returning id`)[0]
          counts.combos++
          for (const [stepIndex, m] of mapped.entries()) {
            await sql`insert into guide_combo_steps (guide_id,combo_id,skill_id,sort_order) values (${guideId},${inserted.id},${m.skill.id},${stepIndex})`
            counts.comboSteps++
          }
        }
        else report.skipped.push({slug,section:'combos',reason:'existing awakening PvP combos'})
      }
      // Morph slot levels are inferred from display order, not recovered;
      // only seed when we can resolve both the skill and both exact effect labels.
      if (Array.isArray(sections.morphs) && sections.morphs.length) {
        const exists = await sql`select 1 from guide_morphs where guide_id = ${guideId} and preset = 'aw_t1' limit 1`
        if (!exists.length) for (const [index,morph] of sections.morphs.slice(0,6).entries()) {
          const skill = findOne(catalogSkills,morph.skill,baseSkill)
          const resolveEffect = (label) => {
            const key = norm(label)
            const match = effects.filter((effect) => Object.values(effect.tier_labels || {}).some((v) => norm(v) === key))
            return match.length === 1 ? match[0] : null
          }
          const e1 = resolveEffect(morph.effects?.[0])
          const e2 = resolveEffect(morph.effects?.[1])
          if (!skill || !e1 || !e2) { missing(slug,'morphs',JSON.stringify(morph)); continue }
          await sql`insert into guide_morphs (guide_id,preset,slot_level,skill_id,effect_id_1,effect_id_2,sort_order) values (${guideId},'aw_t1',${50 + index*2},${skill.id},${e1.id},${e2.id},${index}) on conflict do nothing`
          counts.morphs++
        }
        else report.skipped.push({slug,section:'morphs',reason:'existing awakening T1 morphs'})
      }
      for (const [key,table,catalog] of [['crystals','guide_crystals',items],['buffs','guide_buffs',buffs]]) {
        const values = sections[key]
        if (!Array.isArray(values) || !values.length) continue
        const exists = await sql.unsafe(`select 1 from ${table} where guide_id = $1 and preset = 't1' limit 1`,[guideId])
        if (exists.length) { report.skipped.push({slug,section:key,reason:'existing T1 records'}); continue }
        let pos = 0
        for (const raw of values) {
          const {name,count} = parseQty(raw)
          const item = findOne(catalog,name)
          if (!item) { missing(slug,key,name); continue }
          for (let k=0;k<count;k++) {
            if (key === 'crystals') await sql`insert into guide_crystals (guide_id,item_id,preset,sort_order) values (${guideId},${item.id},'t1',${pos++})`
            else await sql`insert into guide_buffs (guide_id,buff_id,preset,sort_order) values (${guideId},${item.id},'t1',${pos++})`
            counts[key]++
          }
        }
      }
      if (sections.relics?.stones?.length) {
        const existing = await sql`select 1 from guide_lightstones where guide_id = ${guideId} and preset = 't1' limit 1`
        if (!existing.length) for (const [index,name] of sections.relics.stones.entries()) {
          const item = findOne(items,name)
          if (!item) {missing(slug,'lightstones',name);continue}
          await sql`insert into guide_lightstones (guide_id,item_id,preset,sort_order) values (${guideId},${item.id},'t1',${index})`
          counts.lightstones++
        }
        else report.skipped.push({slug,section:'lightstones',reason:'existing T1 records'})
      }
      // Items for the hardening board use the catalog prefix 'Камень закалки –'.
      // Match only exact normalized names and the essence item type.
      if (Array.isArray(sections.temper) && sections.temper.length) {
        const exists = await sql`select 1 from guide_essence where guide_id=${guideId} and preset='t1' limit 1`
        if (!exists.length) for (const [index,name] of sections.temper.slice(0,5).entries()) {
          const item = findOne(items.filter((i) => i.item_type === 'essence'), 'Камень закалки – ' + name)
          if (!item) { missing(slug,'hardening',name); continue }
          await sql`insert into guide_essence (guide_id,item_id,slot,sort_order,preset) values (${guideId},${item.id},${'h'+index},${index},'t1')`
          counts.hardening++
        }
        else report.skipped.push({slug,section:'hardening',reason:'existing T1 hardening'})
      }
      await repairSlots(sql,'guide_crystals',guideId,slug)
      await repairSlots(sql,'guide_lightstones',guideId,slug)
      if (sections.relics?.set) missing(slug,'relic_set',sections.relics.set + ' (set label is computed from lightstones; no item to seed)')
      for (const title of sections.videos || []) missing(slug,'videos',title + ' (YouTube URL not recovered)')
      report.classes.push(counts)
    }
    if (!apply) throw new Error('__DRY_RUN_ROLLBACK__')
  })
} catch (error) {
  if (error.message !== '__DRY_RUN_ROLLBACK__') throw error
} finally {
  await db.end()
}
console.log(JSON.stringify(report,null,2))
if (!apply) console.log('Dry run: transaction rolled back. Add --apply to commit.')
