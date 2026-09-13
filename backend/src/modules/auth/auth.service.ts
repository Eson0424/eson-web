import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import argon2 from 'argon2'
import { readEnv } from '../../config/env.js'
import { invalidCredentials, invalidToken } from '../../common/errors/app-error.js'
import { UsersService } from '../users/users.service.js'

export interface AuthUserView {
  id: string
  email: string
  role: string
  name: string | null
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: AuthUserView
}

interface RefreshPayload {
  sub: string
  type: 'refresh'
}

@Injectable()
export class AuthService {
  private readonly env = readEnv()

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<AuthTokens> {
    const user = await this.users.findByEmail(email)

    // 不区分“用户不存在”与“密码错误”（docs/API.md §4.1）
    if (!user || !user.isActive) {
      throw invalidCredentials()
    }

    const passwordMatches = await argon2.verify(user.passwordHash, password).catch(() => false)

    if (!passwordMatches) {
      throw invalidCredentials()
    }

    await this.users.touchLastLogin(user.id)

    return this.issueTokens(user.id, user.email, user.role, user.name)
  }

  async refresh(refreshToken: string | null): Promise<AuthTokens> {
    if (!refreshToken) {
      throw invalidToken()
    }

    let payload: RefreshPayload

    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(refreshToken, {
        secret: this.env.jwtRefreshSecret,
      })
    } catch {
      throw invalidToken()
    }

    if (payload.type !== 'refresh') {
      throw invalidToken()
    }

    const user = await this.users.findById(payload.sub)

    if (!user || !user.isActive) {
      throw invalidToken()
    }

    return this.issueTokens(user.id, user.email, user.role, user.name)
  }

  async me(userId: string): Promise<AuthUserView> {
    const user = await this.users.findById(userId)

    if (!user || !user.isActive) {
      throw invalidToken()
    }

    return { id: user.id, email: user.email, role: user.role, name: user.name }
  }

  private async issueTokens(
    id: string,
    email: string,
    role: string,
    name: string | null,
  ): Promise<AuthTokens> {
    const accessToken = await this.jwt.signAsync(
      { sub: id, email, role },
      { secret: this.env.jwtSecret, expiresIn: this.env.accessTokenTtlSeconds },
    )

    const refreshToken = await this.jwt.signAsync(
      { sub: id, type: 'refresh' },
      { secret: this.env.jwtRefreshSecret, expiresIn: this.env.refreshTokenTtlSeconds },
    )

    return {
      accessToken,
      refreshToken,
      expiresIn: this.env.accessTokenTtlSeconds,
      user: { id, email, role, name },
    }
  }
}
