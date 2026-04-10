import { Module, Global } from '@nestjs/common';
import { MailService } from './mail.service.js';

/** Global: cualquier módulo puede inyectar MailService sin importarlo */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
