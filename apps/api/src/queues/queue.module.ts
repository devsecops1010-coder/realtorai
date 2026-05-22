import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import type { Env } from '../config/env.schema';
import { QUEUES } from './queue-names';
import { IncomingMessageProcessor } from './incoming-message.processor';
import { AgentsModule } from '../agents/agents.module';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const url = new URL(config.get('REDIS_URL', { infer: true }));
        return {
          connection: {
            host: url.hostname,
            port: parseInt(url.port || '6379', 10),
            password: decodeURIComponent(url.password || ''),
            username: decodeURIComponent(url.username || ''),
            // BullMQ requires this when shared with other Redis users
            maxRetriesPerRequest: null,
          },
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5_000 },
            removeOnComplete: { count: 1000, age: 24 * 60 * 60 },
            removeOnFail: { count: 5000, age: 7 * 24 * 60 * 60 },
          },
        };
      },
    }),
    BullModule.registerQueue({ name: QUEUES.INCOMING_MESSAGE }),
    AgentsModule,
  ],
  providers: [IncomingMessageProcessor],
  exports: [BullModule],
})
export class QueueModule {}
