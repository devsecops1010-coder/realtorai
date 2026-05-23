import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthLifecycleService } from './auth-lifecycle.service';
import { JwtStrategy } from './jwt.strategy';
import { TotpService } from './totp.service';
import { TotpController } from './totp.controller';
import type { Env } from '../config/env.schema';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) => ({
        secret: configService.get('JWT_SECRET', { infer: true }),
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_TTL', { infer: true }),
        },
      }),
    }),
  ],
  controllers: [AuthController, TotpController],
  providers: [AuthService, AuthLifecycleService, JwtStrategy, TotpService],
  exports: [AuthService, AuthLifecycleService, TotpService],
})
export class AuthModule {}
