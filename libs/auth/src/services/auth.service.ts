import { OTP, User, Wallet, WalletBalance } from '@app/typeorm/entities';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import {
  ForgotPasswordDto,
  LoginDto,
  LoginResponseDto,
  ProfileDto,
  ResetPasswordDto,
  SignupDto,
  SignupResponseDto,
  UpdatePasswordDto,
  UpdateProfileDto,
  VerifyDto,
} from '../dto/auth.dto';
import { isEmail } from 'class-validator';
import { decryptData, encryptData } from '../utils/encryption';
import { randomInt } from 'crypto';
import { UserRole } from '@app/typeorm/utils/enums';
import { GmailService } from '@app/core/services/gmail.service';

console.log({ pass: decryptData("7ff15d600576323e9a6f12d17c32b4e4") });

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(OTP)
    private readonly otpRepository: Repository<OTP>,

    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,

    @InjectRepository(WalletBalance)
    private readonly walletBalanceRepository: Repository<WalletBalance>,

    private readonly jwtService: JwtService,

    private readonly gmailService: GmailService,
  ) {}

  async login(data: LoginDto): Promise<LoginResponseDto> {
    const { to, password } = data;

    const where: FindOptionsWhere<User> = {};

    if (isEmail(to)) {
      where.email = to;
    } else {
      where.phoneNumber = to;
    }

    const user = await this.userRepository.findOne({
      where,
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (decryptData(user.password) !== password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      await this.resendCode(user.email);
    }

    return {
      token: this.jwtService.sign({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        isActive: user.isActive,
        role: user.role,
        address: user.address,
        referredBy: user.referredBy,
        verifiedAt: user.verifiedAt,
      }),
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        isActive: user.isActive,
        role: user.role,
        address: user.address,
        referredBy: user.referredBy,
        verifiedAt: user.verifiedAt,
      },
      expiresIn: '6h',
      isVerified: user.isActive,
    };
  }

  async adminLogin(data: LoginDto): Promise<LoginResponseDto> {
    const { to, password } = data;

    const where: FindOptionsWhere<User> = {};

    if (isEmail(to)) {
      where.email = to;
    } else {
      where.phoneNumber = to;
    }

    const user = await this.userRepository.findOne({
      where,
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (decryptData(user.password) !== password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.role !== UserRole.ADMIN) {
      throw new UnauthorizedException(
        'You are not authorized to login as an admin',
      );
    }

    return {
      token: this.jwtService.sign({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        isActive: user.isActive,
        role: user.role,
        address: user.address,
        referredBy: user.referredBy,
        verifiedAt: user.verifiedAt,
      }),
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        isActive: user.isActive,
        role: user.role,
        address: user.address,
        referredBy: user.referredBy,
        verifiedAt: user.verifiedAt,
      },
      expiresIn: '6h',
      isVerified: user.isActive,
    };
  }

  async signup(data: SignupDto): Promise<SignupResponseDto> {
    const { email, password, firstName, lastName, phoneNumber } = data;

    const existingUser = await this.userRepository.findOne({
      where: [{ email }, { phoneNumber }],
    });

    if (existingUser) {
      throw new BadRequestException(
        'Email, phone number or username already in use',
      );
    }

    const user = this.userRepository.create({
      email,
      password: encryptData(password),
      firstName,
      lastName,
      phoneNumber,
      isActive: false,
    });

    await this.userRepository.save(user);

    const otp = randomInt(1000, 9999).toString();

    const otpEntity = this.otpRepository.create({
      otp,
      user: user.id,
    });

    await this.otpRepository.save(otpEntity);

    this.gmailService.sendEmail({
      email,
      name: `${firstName} ${lastName}`,
      subject: 'OTP Verification',
      message: `
        <h1>OTP Verification</h1>
        <p>Hello ${firstName} ${lastName},</p>
        <p>Your OTP is ${otp}</p>
      `,
    });

    return {
      email,
      phoneNumber,
    };
  }

  async verify(data: VerifyDto): Promise<{ message: string }> {
    const { otp, email } = data;
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User with this email not found');
    }

    if (user.isActive) {
      throw new BadRequestException('Account already verified');
    }

    const existingOtp = await this.otpRepository.findOne({
      where: { otp, user: user.id },
    });

    if (!existingOtp) {
      throw new BadRequestException('Invalid OTP');
    }

    await this.otpRepository.delete(existingOtp.id);

    await this.userRepository.update(user.id, {
      isActive: true,
      verifiedAt: new Date(),
    });

    const wallet = await this.walletRepository.save({
      user: user.id
    });

    await this.walletBalanceRepository.save({
      wallet: wallet.id,
      balance: 0,
      ledgerBalance: 0,
    });

    return { message: 'Account verified successfully' };
  }

  async resendCode(email: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User with this email not found');
    }

    if (user.isActive) {
      throw new BadRequestException('Account already verified');
    }

    await this.otpRepository.delete({ user: user.id });

    const otp = randomInt(1000, 9999).toString();

    await this.otpRepository.save({ otp, user: user.id });

    await this.gmailService.sendEmail({
      email,
      name: `${user.firstName} ${user.lastName}`,
      subject: 'OTP Verification',
      message: `
        <h1>OTP Verification</h1>
        <p>Hello ${user.firstName} ${user.lastName},</p>
        <p>Your OTP is ${otp}</p>
      `,
    });

    return { message: 'OTP sent successfully' };
  }

  async getProfile(userId: string): Promise<ProfileDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      address: user.address,
      verifiedAt: user.verifiedAt,
      isActive: user.isActive,
      role: user.role,
    };
  }

  async updateProfile(
    userId: string,
    data: UpdateProfileDto,
  ): Promise<ProfileDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.update(userId, data);

    return this.getProfile(userId);
  }

  async updatePassword(
    userId: string,
    data: UpdatePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (decryptData(user.password) !== data.oldPassword) {
      throw new BadRequestException('Old password is incorrect');
    }

    if (data.newPassword === data.oldPassword) {
      throw new BadRequestException(
        'New password cannot be the same as the old password',
      );
    }

    await this.userRepository.update(userId, {
      password: encryptData(data.newPassword),
    });

    return { message: 'Password updated successfully' };
  }

  async forgotPassword(data: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = data;

    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User with this email not found');
    }

    if (!user.isActive) {
      throw new BadRequestException(
        'Account not verified. Please verify your account first.',
      );
    }

    // Delete any existing password reset OTPs for this user
    await this.otpRepository.delete({ user: user.id });

    const otp = randomInt(1000, 9999).toString();

    const otpEntity = this.otpRepository.create({
      otp,
      user: user.id,
    });

    await this.otpRepository.save(otpEntity);

    await this.gmailService.sendEmail({
      email,
      name: `${user.firstName} ${user.lastName}`,
      subject: 'Password Reset OTP',
      message: `
        <h1>Password Reset Request</h1>
        <p>Hello ${user.firstName} ${user.lastName},</p>
        <p>You requested to reset your password. Your OTP is ${otp}</p>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });

    return { message: 'Password reset OTP sent successfully' };
  }

  async resetPassword(data: ResetPasswordDto): Promise<{ message: string }> {
    const { email, otp, newPassword } = data;

    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User with this email not found');
    }

    if (!user.isActive) {
      throw new BadRequestException(
        'Account not verified. Please verify your account first.',
      );
    }

    const existingOtp = await this.otpRepository.findOne({
      where: { otp, user: user.id },
    });

    if (!existingOtp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Delete the used OTP
    await this.otpRepository.delete(existingOtp.id);

    // Update the password
    await this.userRepository.update(user.id, {
      password: encryptData(newPassword),
    });

    return { message: 'Password reset successfully' };
  }
}
