import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { GameSession, GameStatus } from './entities/game-session.entity';
import { GameParticipant } from './entities/game-participant.entity';
import { CreateGameDto } from './dto/create-game.dto';
import { GameActionDto } from './dto/game-action.dto';
import { PointsService } from '../points/points.service';
import { LedgerRefType } from '../points/entities/point-ledger.entity';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(GameSession)
    private sessionRepository: Repository<GameSession>,
    @InjectRepository(GameParticipant)
    private participantRepository: Repository<GameParticipant>,
    private pointsService: PointsService,
    private dataSource: DataSource,
  ) {}

  async createSession(dto: CreateGameDto): Promise<GameSession> {
    const session = this.sessionRepository.create({
      type: dto.type,
      config: dto.config,
      createdBy: dto.createdBy,
      status: GameStatus.CREATED,
    });
    return this.sessionRepository.save(session);
  }

  async getSession(id: string): Promise<GameSession> {
    const session = await this.sessionRepository.findOne({ where: { id } });
    if (!session) {
      throw new NotFoundException('Game session not found');
    }
    return session;
  }

  async joinSession(
    sessionId: string,
    discordId: string,
  ): Promise<GameParticipant> {
    const session = await this.getSession(sessionId);

    if (
      session.status !== GameStatus.OPEN &&
      session.status !== GameStatus.CREATED
    ) {
      throw new BadRequestException('Session is not open for joining');
    }

    const existing = await this.participantRepository.findOne({
      where: { sessionId, discordId },
    });
    if (existing) {
      throw new ConflictException('Already joined');
    }

    const entryFee = session.config?.entryFee || 0;

    if (entryFee > 0) {
      const idempotencyKey = `join:${sessionId}:${discordId}`;

      try {
        await this.pointsService.spend({
          discordId,
          amount: entryFee,
          reason: `Join Game ${session.type}`,
          refType: LedgerRefType.GAME,
          refId: sessionId,
          idempotencyKey,
        });
      } catch (e) {
        if (e instanceof ConflictException) {
          // Already paid? allow proceed
        } else {
          throw e;
        }
      }
    }

    const participant = this.participantRepository.create({
      sessionId,
      discordId,
      state: {},
    });

    return this.participantRepository.save(participant);
  }

  async updateStatus(id: string, status: GameStatus): Promise<GameSession> {
    const session = await this.getSession(id);
    session.status = status;
    if (status === GameStatus.IN_PROGRESS) {
      session.startedAt = new Date();
    } else if (status === GameStatus.CLOSED || status === GameStatus.SETTLED) {
      session.endedAt = new Date();
    }
    return this.sessionRepository.save(session);
  }

  async processAction(sessionId: string, dto: GameActionDto): Promise<any> {
    const session = await this.getSession(sessionId);
    if (session.status !== GameStatus.IN_PROGRESS) {
      throw new BadRequestException('Game is not in progress');
    }
    return { ok: true, action: dto.actionType, newState: {} };
  }
}
