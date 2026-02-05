import { IsNotEmpty, IsString, IsObject, IsOptional } from 'class-validator';

export class GameActionDto {
  @IsNotEmpty()
  @IsString()
  discordId: string;

  @IsNotEmpty()
  @IsString()
  actionType: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;
}
