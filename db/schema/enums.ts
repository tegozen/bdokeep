import { pgEnum } from 'drizzle-orm/pg-core'

export const itemType = pgEnum('item_type', [
  'relic',
  'lightstone',
  'crystal',
  'essence',
  'other',
])
