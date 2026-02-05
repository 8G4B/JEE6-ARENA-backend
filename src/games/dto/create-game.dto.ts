import { IsNotEmpty, IsEnum, IsObject, IsString } from 'class-validator';
import { GameType } from '../entities/game-session.entity';

export class CreateGameDto {
  @IsNotEmpty()
  @IsEnum(GameType)
  type: GameType;

  @IsNotEmpty()
  @IsObject()
  config: Record<string, any>;

  @IsNotEmpty()
  @IsString()
  createdBy: string;
}
