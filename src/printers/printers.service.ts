import { Injectable } from '@nestjs/common';
import { CreatePrinterDto } from './dto/create-printer.dto';
import { UpdatePrinterDto } from './dto/update-printer.dto';

@Injectable()
export class PrintersService {
  create(createPrinterDto: CreatePrinterDto) {
    return 'This action adds a new printer';
  }

  findAll() {
    return `This action returns all printers`;
  }

  findOne(id: number) {
    return `This action returns a #${id} printer`;
  }

  update(id: number, updatePrinterDto: UpdatePrinterDto) {
    return `This action updates a #${id} printer`;
  }

  remove(id: number) {
    return `This action removes a #${id} printer`;
  }
}
