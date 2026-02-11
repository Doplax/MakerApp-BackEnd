import { Injectable } from '@nestjs/common';
import { CreateFilamentDto } from './dto/create-filament.dto';
import { UpdateFilamentDto } from './dto/update-filament.dto';

@Injectable()
export class FilamentsService {
  create(createFilamentDto: CreateFilamentDto) {
    return 'This action adds a new filament';
  }

  findAll() {
    return `This action returns all filaments`;
  }

  findOne(id: number) {
    return `This action returns a #${id} filament`;
  }

  update(id: number, updateFilamentDto: UpdateFilamentDto) {
    return `This action updates a #${id} filament`;
  }

  remove(id: number) {
    return `This action removes a #${id} filament`;
  }
}
