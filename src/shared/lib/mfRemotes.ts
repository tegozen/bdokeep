/**
 * Runtime Module Federation remotes (same-origin via gateway).
 * remoteEntry is emitted under assets/ by vite-plugin-federation.
 */
export const MF_REMOTES = {
  crystals: '/mf/crystals/assets/remoteEntry.js',
  relics: '/mf/relics/assets/remoteEntry.js',
  hardening: '/mf/hardening/assets/remoteEntry.js',
  morphs: '/mf/morphs/assets/remoteEntry.js',
  combo: '/mf/combo/assets/remoteEntry.js',
  buffs: '/mf/buffs/assets/remoteEntry.js',
  videos: '/mf/videos/assets/remoteEntry.js',
  summary: '/mf/summary/assets/remoteEntry.js',
  feedback: '/mf/feedback/assets/remoteEntry.js',
  'chat-macro': '/mf/chat-macro/assets/remoteEntry.js',
} as const

export type MfRemoteName = keyof typeof MF_REMOTES

/** Map proposal section → remote that exports Draft / Propose. */
export function remoteForProposalSection(section: string): MfRemoteName | null {
  if (section === 'crystals') return 'crystals'
  if (section === 'relics') return 'relics'
  if (section === 'hardening') return 'hardening'
  if (section === 'morphs') return 'morphs'
  if (section === 'buffs') return 'buffs'
  if (section.startsWith('combo_')) return 'combo'
  if (section.startsWith('videos_')) return 'videos'
  if (section.startsWith('summary_')) return 'summary'
  return null
}
