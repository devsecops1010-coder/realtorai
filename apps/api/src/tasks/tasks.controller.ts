import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ListTasksQuery } from './dto/list-tasks.query';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  list(@Query() query: ListTasksQuery) {
    return this.tasks.list(query);
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.tasks.getById(id);
  }

  @Post()
  @Roles(UserRole.office_owner, UserRole.office_manager, UserRole.realtor)
  @Audit('task.create', { targetType: 'task' })
  create(@Body() dto: CreateTaskDto) {
    return this.tasks.create(dto);
  }

  @Patch(':id')
  @Audit('task.update', { targetType: 'task' })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateTaskDto) {
    return this.tasks.update(id, dto);
  }
}
