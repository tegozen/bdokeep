/** True when Nitro sits behind a reverse proxy that sets X-Forwarded-* correctly. */
export function trustProxyEnabled(): boolean {
  const v = (process.env.TRUST_PROXY || process.env.NUXT_TRUST_PROXY || '').trim().toLowerCase()
  return v === '1' || v === 'true'
}
