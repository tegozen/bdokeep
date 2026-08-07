export type GuildBannerLink = {
  label: string
  url: string
}

export type GuildBannerPublic =
  | { enabled: false }
  | {
      enabled: true
      body: string
      has_icon: boolean
      links: GuildBannerLink[]
      updated_at: string
    }
