import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';
import { User } from 'src/database/entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
  }

  private async createTokenAndSetCookie(
    user: User,
    response: Response,
  ): Promise<void> {
    const payload = { sub: user.id, email: user.email };
    const token = await this.jwtService.signAsync(payload);
    response.cookie('token', token, { httpOnly: true });
  }

  async signUp(
    email: string,
    password: string,
    response: Response,
  ): Promise<User> {
    const user = await this.userService.findOne(email);

    if (user) {
      throw new UnauthorizedException('User already exists');
    }

    const hashedPassword = await this.hashPassword(password);

    const newUser = {
      email,
      password: hashedPassword,
    };

    const createdUser = await this.userRepository.save(newUser);

    await this.createTokenAndSetCookie(createdUser, response);

    return createdUser;
  }

  async signIn(email: string, password: string, response: Response) {
    const user = await this.userService.findOne(email);

    if (!user) {
      throw new UnauthorizedException('Incorrect email');
    }

    const isValidPass = await bcrypt.compare(password, user.password);

    if (!isValidPass) {
      throw new UnauthorizedException('Incorrect email or password');
    }

    await this.createTokenAndSetCookie(user, response);

    return { message: 'Token created' };
  }
}
