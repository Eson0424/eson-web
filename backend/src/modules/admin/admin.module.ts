import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { AdminController } from './admin.controller.js'
import { AdminService } from './admin.service.js'
import { AdminReferenceController } from './admin-reference.controller.js'
import { AdminContactController } from './contact/admin-contact.controller.js'
import { AdminContactService } from './contact/admin-contact.service.js'
import { AdminLabController } from './lab/admin-lab.controller.js'
import { AdminLabService } from './lab/admin-lab.service.js'
import { AdminExperienceController } from './experience/admin-experience.controller.js'
import { AdminExperienceService } from './experience/admin-experience.service.js'
import { AdminWorkController } from './work/admin-work.controller.js'
import { AdminWorkService } from './work/admin-work.service.js'
import { AdminWritingController } from './writing/admin-writing.controller.js'
import { AdminWritingService } from './writing/admin-writing.service.js'

@Module({
  imports: [AuthModule],
  controllers: [
    AdminController,
    AdminWorkController,
    AdminLabController,
    AdminWritingController,
    AdminExperienceController,
    AdminReferenceController,
    AdminContactController,
  ],
  providers: [
    AdminService,
    AdminWorkService,
    AdminLabService,
    AdminWritingService,
    AdminExperienceService,
    AdminContactService,
  ],
})
export class AdminModule {}
