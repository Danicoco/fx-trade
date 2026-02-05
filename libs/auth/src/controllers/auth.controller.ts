import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import {
  ForgotPasswordDto,
  LoginDto,
  LoginResponseDto,
  ProfileDto,
  ResendCodeDto,
  ResetPasswordDto,
  SignupDto,
  SignupResponseDto,
  UpdatePasswordDto,
  UpdateProfileDto,
  VerifyDto,
} from '../dto/auth.dto';
import { GenericStatus } from '@app/core/dto/generic-status.dto';
import { JwtAuthGuard } from '../guards/jwt.guard';
import { User } from '@app/core/decorators/user.decorator';
import { IdDto } from '@app/core/dto/id.dto';

@ApiTags('Authentication Endpoints')
@ApiBearerAuth('Bearer')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login a user' })
  @ApiResponse({
    type: LoginResponseDto,
  })
  async login(@Body() body: LoginDto) {
    return new GenericStatus({
      data: await this.authService.login(body),
      description: 'Login successful',
    });
  }

  @Post('admin-login')
  @ApiOperation({ summary: 'Login an admin' })
  @ApiResponse({
    type: LoginResponseDto,
  })
  async adminLogin(@Body() body: LoginDto) {
    return new GenericStatus({
      data: await this.authService.adminLogin(body),
      description: 'Admin login successful',
    });
  }

  @Post('signup')
  @ApiOperation({ summary: 'Signup a user' })
  @ApiResponse({
    type: SignupResponseDto,
  })
  async signup(@Body() body: SignupDto) {
    return new GenericStatus({
      data: await this.authService.signup(body),
      description: 'Signup successful',
    });
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify a user' })
  async verify(@Body() body: VerifyDto) {
    return new GenericStatus({
      data: await this.authService.verify(body),
      description: 'Verify successful',
    });
  }

  @Post('resend-code')
  @ApiOperation({ summary: 'Resend a code to a user' })
  async resendCode(@Body() body: ResendCodeDto) {
    return new GenericStatus({
      data: await this.authService.resendCode(body.email),
      description: 'Resend code successful',
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get a user profile' })
  @ApiResponse({
    type: ProfileDto,
  })
  async profile(@User() user: IdDto) {
    return new GenericStatus({
      data: await this.authService.getProfile(user.id),
      description: 'Profile fetched successfully',
    });
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  @ApiOperation({ summary: 'Update a user profile' })
  @ApiResponse({
    type: ProfileDto,
  })
  async updateProfile(@Body() body: UpdateProfileDto, @User() user: IdDto) {
    return new GenericStatus({
      data: await this.authService.updateProfile(user.id, body),
      description: 'Profile updated successfully',
    });
  }

  @UseGuards(JwtAuthGuard)
  @Put('password')
  @ApiOperation({ summary: 'Update a user password' })
  async updatePassword(@Body() body: UpdatePasswordDto, @User() user: IdDto) {
    return new GenericStatus({
      data: await this.authService.updatePassword(user.id, body),
      description: 'Password updated successfully',
    });
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset OTP' })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return new GenericStatus({
      data: await this.authService.forgotPassword(body),
      description: 'Password reset OTP sent successfully',
    });
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with OTP' })
  async resetPassword(@Body() body: ResetPasswordDto) {
    return new GenericStatus({
      data: await this.authService.resetPassword(body),
      description: 'Password reset successfully',
    });
  }
}
