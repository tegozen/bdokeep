import { pollYoutubeVideoStatus } from '../utils/pollYoutubeVideoStatus'

/**
 * After deploy/rebuild, pull real YouTube titles for placeholder «Видео N» rows
 * without waiting for the hourly cron.
 */
export default defineNitroPlugin(() => {
  setTimeout(() => {
    void pollYoutubeVideoStatus().catch((err) => {
      console.warn('[youtube] startup poll failed:', err)
    })
  }, 5_000)
})
