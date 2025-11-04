import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'supersecretkey',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [],
  providers: [],
  exports: [JwtModule],
})
export class AuthModule {}
