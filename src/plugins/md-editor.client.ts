/**
 * Warm md-editor local extensions in the background (do not block app mount / hydration).
 * Components still `await ensureMdEditorConfigured()` before mounting MdPreview/MdEditor.
 */
export default defineNuxtPlugin(() => {
  void import('@/shared/ui/mdEditorSetup.client').then((m) =>
    m.ensureMdEditorConfigured().catch((err) => {
      console.error('[md-editor] init failed', err)
    }),
  )
})
