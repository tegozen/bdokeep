/** Home-grid card portrait (~108–120 CSS px, 2–3x → 360 px). */
export function cardPortraitUrl(portraitUrl: string) {
  return portraitUrl.replace(/portrait\.png$/i, 'portrait-card-360.webp')
}
