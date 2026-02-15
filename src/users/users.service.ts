import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findOne(discordId: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ discordId });
  }

  async findOrCreate(profile: any): Promise<User> {
    const { id, username, avatar, discriminator, email } = profile;
    let user = await this.findOne(id);

    if (!user) {
      user = this.usersRepository.create({
        discordId: id,
        username,
        avatar,
        discriminator,
        email,
      });
    } else {
      user.username = username;
      user.avatar = avatar;
      user.discriminator = discriminator;
      user.email = email;
    }

    return this.usersRepository.save(user);
  }
}
