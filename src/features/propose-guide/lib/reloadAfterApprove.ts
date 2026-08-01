/** Unified reload after an auto-approved proposal. */
export function reloadAfterApprove() {
  return reloadNuxtApp({ force: true })
}
