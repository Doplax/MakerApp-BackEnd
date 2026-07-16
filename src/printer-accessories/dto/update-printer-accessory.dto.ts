import { PartialType } from '@nestjs/mapped-types';
import { CreatePrinterAccessoryDto } from './create-printer-accessory.dto.js';

export class UpdatePrinterAccessoryDto extends PartialType(
  CreatePrinterAccessoryDto,
) {}
