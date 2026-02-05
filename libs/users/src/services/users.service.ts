import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { User, Wallet, WalletBalance } from '@app/typeorm/entities';
import {
  CreateAdminDto,
  UserDto,
  UserQueryDto,
  UserStatsDto,
  WalletDto,
} from '../dto/user.dto';
import { PaginatedResponse } from '@app/core/dto/paginated-response.dto';
import { UserRole } from '@app/typeorm/utils/enums';
import { encryptData } from '@app/auth/utils/encryption';
import { GmailService } from '@app/core/services/gmail.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,

    @InjectRepository(WalletBalance)
    private readonly walletBalanceRepository: Repository<WalletBalance>,

    private readonly gmailService: GmailService,
  ) {}

  async findAll(query: UserQueryDto): Promise<PaginatedResponse<UserDto>> {
    const { page, pageSize, role, isActive, search, skip } = query;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id as id',
        'user.firstName as "firstName"',
        'user.lastName as "lastName"',
        'user.email as email',
        'user.phoneNumber as "phoneNumber"',
        'user.address as address',
        'user.verifiedAt as "verifiedAt"',
        'user.isActive as "isActive"',
        'user.role as "role"',
      ]);

    if (role) {
      queryBuilder.where('user.role = :role', { role });
    }

    if (isActive !== undefined) {
      queryBuilder.where('user.isActive = :isActive', { isActive });
    }

    if (search) {
      queryBuilder.where(
        'user."firstName" ILIKE :search OR user."lastName" ILIKE :search OR user.email ILIKE :search OR user.phoneNumber ILIKE :search OR user.username ILIKE :search',
        { search: `%${search}%` },
      );
    }

    queryBuilder.offset(skip).limit(pageSize).orderBy('user.createdAt', 'DESC');

    const [users, total] = await Promise.all([
      queryBuilder.getRawMany(),
      queryBuilder.getCount(),
    ]);

    return new PaginatedResponse(
      users.map((user) => ({
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        address: user.address,
        verifiedAt: user.verifiedAt,
        isActive: user.isActive,
        role: user.role,
      })),
      total,
      page ?? 1,
      pageSize ?? 10,
    );
  }

  async findOne(id: string): Promise<UserDto> {
    const user = await this.userRepository.findOne({
      where: { id },
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

  async createAdmin(data: CreateAdminDto): Promise<UserDto> {
    const { email, password, firstName, lastName, phoneNumber } = data;
    const existingUser = await this.userRepository.findOne({
      where: [{ email }, { phoneNumber }],
    });

    if (existingUser) {
      throw new BadRequestException(
        'Email, phone number or username already in use',
      );
    }

    const user = await this.userRepository.save({
      email,
      password: encryptData(password),
      firstName,
      lastName,
      phoneNumber,
      role: UserRole.ADMIN,
    });

    await this.gmailService.sendEmail({
      name: `${firstName} ${lastName}`,
      email,
      subject: 'Admin created successfully',
      message: `
            <h1>Admin created successfully</h1>
            <p>Hello ${firstName} ${lastName},</p>
            <p>Your admin account has been created successfully</p>
            <p>Your password is ${password}</p>
        <p>Please login to your account and change your password</p>
    `,
    });

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

  async fetchWallet(userId: string): Promise<WalletDto> {
    const wallet = await this.walletRepository.findOne({
      where: { user: userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const balances = await this.walletBalanceRepository.find({
      where: { wallet: wallet.id }
    })

    return {
      id: wallet.id,
      user: wallet.user,
      balances: balances,
    };
  }

  async fetchUserStats(): Promise<UserStatsDto> {
    const [totalUsers, activeUsers, verifiedUsers, totalAdmins] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { isActive: true } }),
      this.userRepository.count({ where: { verifiedAt: Not(IsNull()) } }),
      this.userRepository.count({ where: { role: UserRole.ADMIN } }),
    ]);

    return {
      totalUsers,
      activeUsers,
      verifiedUsers,
      totalAdmins,
    };
  }
}
