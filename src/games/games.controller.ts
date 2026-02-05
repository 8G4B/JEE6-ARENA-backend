import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Patch,
  ValidationPipe,
} from '@nestjs/common';
import { GamesService } from './games.service';
import { CreateGameDto } from './dto/create-game.dto';
import { JoinGameDto } from './dto/join-game.dto';
import { GameActionDto } from './dto/game-action.dto';
import { GameSession, GameStatus } from './entities/game-session.entity';
import { GameParticipant } from './entities/game-participant.entity';

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Post('sessions')
  async createSession(@Body(new ValidationPipe()) dto: CreateGameDto) {
    const session = await this.gamesService.createSession(dto);
    return { ok: true, data: session };
  }

  @Get('sessions/:id')
  async getSession(@Param('id') id: string) {
    const session = await this.gamesService.getSession(id);
    return { ok: true, data: session };
  }

  @Post('sessions/:id/join')
  async joinSession(
    @Param('id') id: string,
    @Body(new ValidationPipe()) dto: JoinGameDto,
  ) {
    const participant: GameParticipant = await this.gamesService.joinSession(
      id,
      dto.discordId,
    );
    return { ok: true, data: participant };
  }

  @Post('sessions/:id/action')
  async processAction(
    @Param('id') id: string,
    @Body(new ValidationPipe()) dto: GameActionDto,
  ) {
    const result: any = await this.gamesService.processAction(id, dto);
    return { ok: true, data: result };
  }

  @Patch('sessions/:id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: GameStatus,
  ) {
    const sessionByStatus: GameSession = await this.gamesService.updateStatus(
      id,
      status,
    );
    return { ok: true, data: sessionByStatus };
  }
}
