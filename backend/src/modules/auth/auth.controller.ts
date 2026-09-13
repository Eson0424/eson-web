import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type { Request, Response } from 'express'
import { readEnv } from '../../config/env.js'
import { clearRefreshCookie, readCookie, setRefreshCookie } from '../../common/utils/cookies.js'
import { AuthService } from './auth.service.js'
import { LoginDto } from './dto/login.dto.js'
import { JwtAuthGuard, type RequestWithUser } from './jwt-auth.guard.js'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly env = readEnv()

  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @ApiOperation({ summary: 'Admin login（Access Token + HttpOnly refresh cookie）' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const tokens = await this.auth.login(dto.email, dto.password)

    setRefreshCookie(response, tokens.refreshToken, {
      secure: this.env.isProduction,
      maxAgeMs: this.env.refreshTokenTtlSeconds * 1000,
    })

    // refresh token 不进入响应体（AGENTS §24）
    return { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn, user: tokens.user }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using the HttpOnly cookie' })
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const tokens = await this.auth.refresh(readCookie(request, 'refresh_token'))

    setRefreshCookie(response, tokens.refreshToken, {
      secure: this.env.isProduction,
      maxAgeMs: this.env.refreshTokenTtlSeconds * 1000,
    })

    return { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn, user: tokens.user }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout（清除 refresh cookie）' })
  logout(@Res({ passthrough: true }) response: Response) {
    clearRefreshCookie(response)

    return { loggedOut: true }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Current admin user' })
  me(@Req() request: RequestWithUser) {
    return this.auth.me(request.user!.id)
  }
}
