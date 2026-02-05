import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserService } from '../services/users.service';
import {
  CreateAdminDto,
  CreateAffiliateDto,
  UserQueryDto,
} from '../dto/user.dto';
import { GenericStatus } from '@app/core/dto/generic-status.dto';
import { JwtAuthGuard } from '@app/auth/guards/jwt.guard';
import { Roles, RolesGuard } from '@app/auth/guards/roles.guard';
import { UserRole } from '@app/typeorm/utils/enums';
import { User } from '@app/core/decorators/user.decorator';
import { IdDto } from '@app/core/dto/id.dto';

@ApiTags('Users Endpoints')
@ApiBearerAuth('Bearer')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('wallet')
  @ApiOperation({ summary: 'Get a user wallet' })
  async fetchWallet(@User() user: IdDto) {
    return new GenericStatus({
      data: await this.userService.fetchWallet(user.id),
      description: 'Wallet retrieved successfully',
    });
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all users' })
  async findAll(@Query() query: UserQueryDto) {
    return new GenericStatus({
      data: await this.userService.findAll(query),
      description: 'Users retrieved successfully',
    });
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user statistics' })
  async getUserStats() {
    return new GenericStatus({
      data: await this.userService.fetchUserStats(),
      description: 'User statistics retrieved successfully',
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a user by id' })
  async findOne(@Param('id') id: string) {
    return new GenericStatus({
      data: await this.userService.findOne(id),
      description: 'User retrieved successfully',
    });
  }

  @Post('create')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a user' })
  async create(@Body() body: CreateAdminDto) {
    return new GenericStatus({
      data: await this.userService.createAdmin(body),
      description: 'User created successfully',
    });
  }
}
