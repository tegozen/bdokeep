export default defineEventHandler(async () => {
  const sql = useDb()
  return withDbError(() => listSkillAddonEffects(sql))
})
