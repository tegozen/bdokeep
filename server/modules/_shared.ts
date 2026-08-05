import type postgres from 'postgres'

/** Transaction or root sql client used by section apply/read modules. */
export type SectionSql = postgres.Sql

export type ApplyCtx = {
  guideId: string
  classId: string
  payload: Record<string, unknown>
  replacedForApply: (
    raw: unknown,
    present: string[],
    isValid: (p: string) => boolean,
  ) => string[]
}
