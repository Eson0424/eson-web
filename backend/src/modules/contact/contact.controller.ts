import { Body, Controller, HttpCode, HttpStatus, Ip, Post, Headers } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { ContactService } from './contact.service.js'
import { CreateContactMessageDto } from './dto/create-contact-message.dto.js'

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  // 5 requests / hour / IP（docs/API.md §27）
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @ApiOperation({ summary: 'Submit a contact message（写入 contact_messages）' })
  create(
    @Body() dto: CreateContactMessageDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.contact.create(dto, ip, userAgent)
  }
}
