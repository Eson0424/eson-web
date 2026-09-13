import { Injectable } from '@nestjs/common'
import type { SiteSetting } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service.js'

/** 允许公开读取的 settings（docs/API.md §19）；其余键只能通过 Admin 读取 */
export const PUBLIC_SETTING_KEYS = [
  'site.title',
  'site.description',
  'site.email',
  'site.location',
  'site.available',
  'site.defaultLocale',
  'site.locales',
  'site.social.github',
  'site.social.linkedin',
] as const

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic(): Promise<Record<string, unknown>> {
    const settings = await this.prisma.siteSetting.findMany({
      where: { key: { in: [...PUBLIC_SETTING_KEYS] } },
    })

    return settings.reduce<Record<string, unknown>>((accumulator, setting: SiteSetting) => {
      accumulator[setting.key] = setting.value
      return accumulator
    }, {})
  }
}
