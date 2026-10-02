import { HomepageBannerSchema } from '#database/schema'
import { DateTime } from 'luxon'

export default class HomepageBanner extends HomepageBannerSchema {
  isLive(now = DateTime.now()) {
    if (!this.isActive) return false
    if (this.startsAt && now < this.startsAt.startOf('day')) return false
    if (this.endsAt && now > this.endsAt.endOf('day')) return false
    return true
  }
}
