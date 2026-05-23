import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * File storage for the sign module. Provider-agnostic: MVP is local FS
 * under SIGN_STORAGE_ROOT (default ./storage/sign). S3 / R2 adapters slot
 * in here later behind the same save/read interface. Paths returned are
 * always *relative* to the root so the DB doesn't pin the provider.
 */
@Injectable()
export class SignStorageService {
  private readonly logger = new Logger(SignStorageService.name);
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = resolve(
      config.get<string>('SIGN_STORAGE_ROOT') ?? './storage/sign',
    );
    this.logger.log(`Sign storage root: ${this.root}`);
  }

  async save(buffer: Buffer, subdir: string, originalName: string): Promise<string> {
    const safeName = originalName.replace(/[^\w.\-]/g, '_').slice(0, 100);
    const relPath = join(subdir, `${randomUUID()}_${safeName}`);
    const absPath = join(this.root, relPath);
    await mkdir(join(this.root, subdir), { recursive: true });
    await writeFile(absPath, buffer, { mode: 0o600 });
    return relPath;
  }

  async read(relPath: string): Promise<Buffer> {
    return readFile(join(this.root, relPath));
  }
}
