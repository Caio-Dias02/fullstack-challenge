import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from './entities/user.entity';
import { RegisterDto, LoginDto } from '@fullstack-challenge/types';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // Check email duplicate
    const emailExists = await this.userRepo.findOne({ where: { email: dto.email } });
    if (emailExists) throw new ConflictException('Email already registered');

    // Check username duplicate
    const usernameExists = await this.userRepo.findOne({ where: { username: dto.username } });
    if (usernameExists) throw new ConflictException('Username already registered');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      email: dto.email,
      username: dto.username,
      password: hashed,
    });
    await this.userRepo.save(user);

    return { message: 'User created successfully' };
  }

  async login(dto: LoginDto) {
    // Accept email OR username
    let user: User | null = null;
    if (dto.email) {
      user = await this.userRepo.findOne({ where: { email: dto.email } });
    } else if (dto.username) {
      user = await this.userRepo.findOne({ where: { username: dto.username } });
    }

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    // Include username in JWT payload
    const payload = { sub: user.id, email: user.email, username: user.username };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return { user, accessToken, refreshToken };
  }

  async refresh(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const newAccess = this.jwtService.sign(
        { sub: payload.sub, email: payload.email, username: payload.username },
        { expiresIn: '15m' },
      );
      return { accessToken: newAccess };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getCurrentUser(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    return { id: user.id, email: user.email, username: user.username };
  }

  async searchUsers(query: string) {
    if (!query || query.length < 1) {
      return [];
    }

    const users = await this.userRepo
      .createQueryBuilder('user')
      .where('user.email ILIKE :query OR user.username ILIKE :query', {
        query: `%${query}%`,
      })
      .select(['user.id', 'user.email', 'user.username'])
      .limit(10)
      .getMany();

    return users;
  }

  async getUserById(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return { id: user.id, email: user.email, username: user.username };
  }
}
