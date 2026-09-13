import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'
import { readEnv } from '../../config/env.js'
import { forbidden, unauthorized } from '../../common/errors/app-error.js'

export interface AuthenticatedUser {
  id: string
  email?: string
  role: string
}

export interface RequestWithUser extends Request {
  user?: AuthenticatedUser
}

/** Access Token 必须通过 Authorization: Bearer 传输（AGENTS §24） */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly env = readEnv()

  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>()
    const header = request.headers.authorization

    if (!header?.startsWith('Bearer ')) {
      throw unauthorized()
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; email?: string; role?: string }>(
        header.slice('Bearer '.length),
        { secret: this.env.jwtSecret },
      )

      request.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role ?? 'ADMIN',
      }
    } catch {
      throw unauthorized()
    }

    return true
  }
}

/** 仅 ADMIN 可访问（V1 单一角色，docs/API.md §26） */
@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>()

    if (request.user?.role !== 'ADMIN') {
      throw forbidden()
    }

    return true
  }
}
