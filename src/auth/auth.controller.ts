import { Controller, Get, Req, UseGuards, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Get('discord')
  @UseGuards(AuthGuard('discord'))
  discordLogin() {
    // Initiates the Discord OAuth2 flow
  }

  @Get('discord/callback')
  @UseGuards(AuthGuard('discord'))
  discordLoginCallback(@Req() req: any, @Res() res: Response) {
    const { access_token, user } = this.authService.login(req.user);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    res.redirect(`${frontendUrl}/login/callback?token=${access_token}&discordId=${user.discordId}&username=${user.username}&avatar=${user.avatar}`);
  }
}
