import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import type { NextFunction, Request, Response } from 'express'
import helmet from 'helmet'
import { AppModule } from './app.module.js'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js'
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js'
import { readEnv } from './config/env.js'
import { StorageService } from './modules/media/storage.service.js'

async function bootstrap(): Promise<void> {
  const env = readEnv()
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  app.setGlobalPrefix('api/v1')
  app.use(helmet())
  /**
   * 本地媒体文件通过 `/media/<object-key>` 只读暴露（Phase 4-F.1）。
   * helmet 默认给所有响应加 `Cross-Origin-Resource-Policy: same-origin`，
   * 而 Public 站点与 backend 是不同端口（3000/3124 vs 3001），因此只对媒体文件放开。
   */
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (request.path.startsWith('/media/')) {
      response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    }

    next()
  })

  const storage = app.get(StorageService, { strict: false })
  const localMediaRoot = storage.getLocalRoot()

  if (localMediaRoot) {
    // 本地 bucket 根：URL `/<object-key>` 直接映射到 <root>/<object-key>
    // （object key 以 `media/` 开头，因此公开 URL 是 /media/<yyyy>/<mm>/<uuid>.<ext>）
    app.useStaticAssets(localMediaRoot, {
      index: false,
      dotfiles: 'deny',
      immutable: true,
      maxAge: '365d',
    })
  }

  app.enableCors({
    // Refresh Token 通过 HttpOnly Cookie 传输，因此需要 credentials。
    origin: env.corsOrigin,
    credentials: true,
  })
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  // 统一响应封装与统一错误格式（docs/API.md §5、§6）
  app.useGlobalInterceptors(new ResponseInterceptor())
  app.useGlobalFilters(new AllExceptionsFilter())

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Eson_web API')
    .setDescription('Eson_web REST API — public content, auth foundation and contact')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('health')
    .addTag('work')
    .addTag('lab')
    .addTag('writing')
    .addTag('experience')
    .addTag('taxonomy')
    .addTag('settings')
    .addTag('auth')
    .addTag('contact')
    .addTag('admin')
    .build()
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig))

  await app.listen(env.port)
}

await bootstrap()
