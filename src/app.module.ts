import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { FilamentsModule } from './filaments/filaments.module';
import { PrintersModule } from './printers/printers.module';
import { ProjectsModule } from './projects/projects.module';
import { SeedModule } from './seed/seed.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'maker_user',
      password: 'maker_password',
      database: 'maker_db',
      autoLoadEntities: true,
      synchronize: true,
    }),
    UsersModule,
    FilamentsModule,
    PrintersModule,
    ProjectsModule,
    SeedModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
