import { pollYoutubeVideoStatus } from '../../utils/pollYoutubeVideoStatus'

export default defineTask({
  meta: {
    name: 'youtube:poll-ready',
    description:
      'Mark YouTube guide videos ready when thumbnails appear; backfill oEmbed titles; drop stale processing slots via cron proposals',
  },
  async run() {
    const result = await pollYoutubeVideoStatus()
    return { result }
  },
})
