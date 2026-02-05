import { IsNotEmpty, IsString } from 'class-validator';

export class JoinGameDto {
  @IsNotEmpty()
  @IsString()
  discordId: string;
}
