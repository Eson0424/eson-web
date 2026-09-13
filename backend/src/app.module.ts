import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { HealthModule } from './health/health.module.js'
import { PrismaModule } from './prisma/prisma.module.js'
import { AuthModule } from './modules/auth/auth.module.js'
import { ContactModule } from './modules/contact/contact.module.js'
import { ExperienceModule } from './modules/experience/experience.module.js'
import { LabModule } from './modules/lab/lab.module.js'
import { MediaModule } from './modules/media/media.module.js'
import { SettingsModule } from './modules/settings/settings.module.js'
import { TaxonomyModule } from './modules/taxonomy/taxonomy.module.js'
import { UsersModule } from './modules/users/users.module.js'
import { WorkModule } from './modules/work/work.module.js'
import { WritingModule } from './modules/writing/writing.module.js'
import { AdminModule } from './modules/admin/admin.module.js'

const DEFAULT_THROTTLE_TTL_MS = 60_000
const DEFAULT_THROTTLE_LIMIT = 100

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    // 全局默认限流；登录 / 联系表单等更严格策略在对应业务模块中覆盖。
    ThrottlerModule.forRoot([
      { ttl: DEFAULT_THROTTLE_TTL_MS, limit: DEFAULT_THROTTLE_LIMIT },
    ]),
    PrismaModule,
    HealthModule,
    WorkModule,
    LabModule,
    WritingModule,
    ExperienceModule,
    TaxonomyModule,
    SettingsModule,
    MediaModule,
    UsersModule,
    AuthModule,
    ContactModule,
    AdminModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
