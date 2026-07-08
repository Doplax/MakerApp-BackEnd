import { PartialType } from '@nestjs/mapped-types';
import { CreateFilamentOfferDto } from './create-filament-offer.dto.js';

export class UpdateFilamentOfferDto extends PartialType(CreateFilamentOfferDto) {}
