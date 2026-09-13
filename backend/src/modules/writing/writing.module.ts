import { Module } from '@nestjs/common'
import { WritingController } from './writing.controller.js'
import { WritingService } from './writing.service.js'

@Module({
  controllers: [WritingController],
  providers: [WritingService],
})
export class WritingModule {}
