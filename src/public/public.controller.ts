import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service.js';
import { PublicMakerProfileDto } from './dto/public-maker-profile.dto.js';

/**
 * Controller público - sin @UseGuards
 * Expone información pública de makers
 */
@Controller('public')
export class PublicController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Obtiene el perfil público de un maker
   * Accessible sin autenticación
   *
   * @param id UUID del usuario (maker)
   * @returns PublicMakerProfileDto con solo información pública
   */
  @Get('makers')
  async getMakersOnMap() {
    return this.usersService.findMakersOnMap();
  }

  @Get('makers/:id')
  async getPublicMakerProfile(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PublicMakerProfileDto> {
    try {
      return await this.usersService.findPublicProfile(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`Maker with ID ${id} not found`);
    }
  }
}
