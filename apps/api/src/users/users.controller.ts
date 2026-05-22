import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list() {
    return this.users.list();
  }

  @Get(':id')
  getOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.users.getById(id);
  }

  @Post('invite')
  @Roles(UserRole.office_owner, UserRole.office_manager)
  @Audit('user.invite', { targetType: 'user' })
  invite(@Body() dto: InviteUserDto) {
    return this.users.invite(dto);
  }

  @Patch(':id')
  @Roles(UserRole.office_owner, UserRole.office_manager)
  @Audit('user.update', { targetType: 'user' })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }
}
