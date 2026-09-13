import { Module } from '@nestjs/common'
import { LabController } from './lab.controller.js'
import { LabService } from './lab.service.js'

@Module({
  controllers: [LabController],
  providers: [LabService],
})
export class LabModule {}
