import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TasksController } from './tasks/tasks.controller';
import { AuthController } from './auth/auth.controller';

@Module({
  imports: [
    HttpModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'supersecretkey',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AppController, TasksController, AuthController],
  providers: [AppService],
})
export class AppModule {}
