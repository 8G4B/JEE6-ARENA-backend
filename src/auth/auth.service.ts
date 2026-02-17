import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  login(user: User) {
    const payload = { sub: user.discordId, username: user.username };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }
}
