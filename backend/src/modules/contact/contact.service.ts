import { Injectable } from '@nestjs/common'
import { readEnv } from '../../config/env.js'
import { hashIp } from '../../common/utils/ip-hash.js'
import { PrismaService } from '../../prisma/prisma.service.js'
import type { CreateContactMessageDto } from './dto/create-contact-message.dto.js'

@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}

  /** 保存联系消息：不存原始 IP，只存哈希（AGENTS §28） */
  async create(dto: CreateContactMessageDto, ip: string | undefined, userAgent: string | undefined) {
    const message = await this.prisma.contactMessage.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        subject: dto.subject.trim(),
        message: dto.message,
        status: 'UNREAD',
        ipHash: hashIp(ip, readEnv().contactIpSalt),
        userAgent: userAgent?.slice(0, 512) ?? null,
      },
      select: { id: true, status: true, createdAt: true },
    })

    // 只返回 receipt，不暴露内部字段
    return {
      id: message.id,
      status: message.status,
      createdAt: message.createdAt.toISOString(),
    }
  }
}
