import { PartialType } from '@nestjs/mapped-types';
import { CreatePrintLogDto } from './create-print-log.dto.js';

export class UpdatePrintLogDto extends PartialType(CreatePrintLogDto) {}
