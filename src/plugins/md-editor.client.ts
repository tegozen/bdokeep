/**
 * Warm md-editor local extensions before any page mounts MdPreview/MdEditor.
 * Prevents a race where components mount before config() and hit unpkg CDN.
 */
export default defineNuxtPlugin(async () => {
  const { ensureMdEditorConfigured } = await import('@/shared/ui/mdEditorSetup.client')
  await ensureMdEditorConfigured()
})
