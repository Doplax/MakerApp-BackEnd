import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrintLogsService } from './print-logs.service.js';
import { CreatePrintLogDto } from './dto/create-print-log.dto.js';
import { UpdatePrintLogDto } from './dto/update-print-log.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';

@Controller('print-logs')
@UseGuards(AuthGuard('jwt'))
export class PrintLogsController {
  constructor(private readonly printLogsService: PrintLogsService) {}

  @Post()
  create(
    @Body() createPrintLogDto: CreatePrintLogDto,
    @CurrentUser() user: User,
  ) {
    return this.printLogsService.create(createPrintLogDto, user);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.printLogsService.findAll(user);
  }

  @Get('filament/:filamentId')
  findByFilament(
    @Param('filamentId', ParseUUIDPipe) filamentId: string,
    @CurrentUser() user: User,
  ) {
    return this.printLogsService.findByFilament(filamentId, user);
  }

  @Get('printer/:printerId')
  findByPrinter(
    @Param('printerId', ParseUUIDPipe) printerId: string,
    @CurrentUser() user: User,
  ) {
    return this.printLogsService.findByPrinter(printerId, user);
  }

  @Get('project/:projectId')
  findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: User,
  ) {
    return this.printLogsService.findByProject(projectId, user);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.printLogsService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePrintLogDto: UpdatePrintLogDto,
    @CurrentUser() user: User,
  ) {
    return this.printLogsService.update(id, updatePrintLogDto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.printLogsService.remove(id, user);
  }
}
