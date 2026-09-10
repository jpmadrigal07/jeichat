import { Readable } from 'node:stream';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MockStorageService {
  maxUploadBytes = 26_214_400;

  readonly uploadedKeys = new Set<string>();
  headResult: { size: number; contentType: string } | null = {
    size: 1024,
    contentType: 'image/png',
  };

  async presignUpload(
    key: string,
    _contentType: string,
    _maxBytes: number,
  ): Promise<string> {
    return `https://mock-r2.test/upload/${encodeURIComponent(key)}`;
  }

  async presignDownload(
    key: string,
    _options?: {
      contentType?: string;
      contentDisposition?: string;
    },
  ): Promise<string> {
    return `https://mock-r2.test/download/${encodeURIComponent(key)}`;
  }

  async delete(key: string): Promise<void> {
    this.uploadedKeys.delete(key);
  }

  async head(
    key: string,
  ): Promise<{ size: number; contentType: string } | null> {
    if (!this.uploadedKeys.has(key)) return null;
    return this.headResult;
  }

  async getObject(key: string, _range?: string) {
    if (!this.uploadedKeys.has(key)) return null;
    const payload = Buffer.from('mock-object');
    const body = Readable.from([payload]);
    return {
      body,
      contentType: this.headResult?.contentType ?? 'application/octet-stream',
      contentLength: payload.length,
      statusCode: 200 as const,
    };
  }

  markUploaded(key: string) {
    this.uploadedKeys.add(key);
  }

  reset() {
    this.uploadedKeys.clear();
    this.headResult = { size: 1024, contentType: 'image/png' };
  }
}
