import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { readEnv } from '../../config/env.js'
import { UsersModule } from '../users/users.module.js'
import { AuthController } from './auth.controller.js'
import { AuthService } from './auth.service.js'
import { AdminRoleGuard, JwtAuthGuard } from './jwt-auth.guard.js'

@Module({
  imports: [JwtModule.register({ secret: readEnv().jwtSecret }), UsersModule],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, AdminRoleGuard],
  exports: [JwtAuthGuard, AdminRoleGuard, JwtModule],
})
export class AuthModule {}
