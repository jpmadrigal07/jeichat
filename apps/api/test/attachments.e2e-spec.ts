import { ForbiddenException, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AttachmentsController } from '../src/attachments/attachments.controller';
import { AttachmentsCleanupService } from '../src/attachments/attachments-cleanup.service';
import { AttachmentsRateLimitService } from '../src/attachments/attachments-rate-limit.service';
import { AttachmentsService } from '../src/attachments/attachments.service';
import { DrizzleService } from '../src/database/drizzle.service';
import { ChatGateway } from '../src/gateway/chat.gateway';
import { InboxService } from '../src/inbox/inbox.service';
import { MessagesController } from '../src/messages/messages.controller';
import { MessagesService } from '../src/messages/messages.service';
import type { StorageConfig } from '../src/storage/storage.config';
import { StorageService } from '../src/storage/storage.service';
import { PERMISSIONS } from '../src/workspaces/permissions';
import { WorkspacePermissionsService } from '../src/workspaces/workspace-permissions.service';
import {
  AttachmentsTestStore,
  type TestAttachmentRow,
} from './helpers/attachments-test-store';
import { MockStorageService } from './helpers/mock-storage.service';
import {
  setE2eSessionUserId,
} from './jest-setup-attachments-e2e';

const WORKSPACE_ID = 'ws-test';
const CHANNEL_ID = 'ch-test';
const SENDER_ID = 'user-sender';
const OTHER_USER_ID = 'user-other';
const VIEWER_DENIED_ID = 'user-no-view';

describe('Attachments API (e2e)', () => {
  let app: INestApplication<App>;
  let store: AttachmentsTestStore;
  let mockStorage: MockStorageService;
  let denySendMessages = false;
  let denyViewChannel = false;

  const testStorageConfig: StorageConfig = {
    accountId: 'test-account',
    accessKeyId: 'test-key',
    secretAccessKey: 'test-secret',
    bucket: 'jeichat-attachments-test',
    endpoint: 'https://test-account.r2.cloudflarestorage.com',
    region: 'auto',
    presignExpiresSeconds: 600,
    maxUploadBytes: 26_214_400,
  };

  const channelRow = {
    id: CHANNEL_ID,
    workspaceId: WORKSPACE_ID,
    name: 'general',
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    store = new AttachmentsTestStore();
    mockStorage = new MockStorageService();
    mockStorage.maxUploadBytes = testStorageConfig.maxUploadBytes;
    denySendMessages = false;
    denyViewChannel = false;
    setE2eSessionUserId(SENDER_ID);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AttachmentsController, MessagesController],
      providers: [
        AttachmentsService,
        MessagesService,
        { provide: DrizzleService, useValue: { db: store.createMockDb() } },
        { provide: StorageService, useValue: mockStorage },
        {
          provide: WorkspacePermissionsService,
          useValue: {
            assertChannelPermissionByChannelId: jest.fn(
              async (
                channelId: string,
                _userId: string,
                permission: string,
              ) => {
                if (channelId !== CHANNEL_ID) {
                  throw new ForbiddenException();
                }
                if (
                  permission === PERMISSIONS.SEND_MESSAGES &&
                  denySendMessages
                ) {
                  throw new ForbiddenException();
                }
                if (
                  permission === PERMISSIONS.VIEW_CHANNEL &&
                  denyViewChannel
                ) {
                  throw new ForbiddenException();
                }
                return channelRow;
              },
            ),
          },
        },
        {
          provide: AttachmentsRateLimitService,
          useValue: { assertWithinLimit: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: AttachmentsCleanupService,
          useValue: { sweep: jest.fn() },
        },
        { provide: ChatGateway, useValue: { emitNewMessage: jest.fn() } },
        {
          provide: InboxService,
          useValue: {
            notifyMentions: jest.fn().mockResolvedValue(undefined),
            notifyReaction: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication({ bodyParser: true });
    await app.init();
  });

  afterEach(async () => {
    if (app) await app.close();
    store.reset();
    mockStorage.reset();
  });

  describe('POST /attachments/presign', () => {
    it('returns attachmentId, uploadUrl, and workspace/channel/uuid key shape', async () => {
      const res = await request(app.getHttpServer())
        .post('/attachments/presign')
        .send({
          channelId: CHANNEL_ID,
          filename: 'photo.png',
          contentType: 'image/png',
          sizeBytes: 4096,
        })
        .expect(201);

      expect(res.body.attachmentId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(res.body.uploadUrl).toContain('https://mock-r2.test/upload/');
      expect(res.body.key).toMatch(
        new RegExp(
          `^${WORKSPACE_ID}/${CHANNEL_ID}/[0-9a-f-]{36}\\.png$`,
          'i',
        ),
      );
      expect(res.body.key).toBe(
        `${WORKSPACE_ID}/${CHANNEL_ID}/${res.body.attachmentId}.png`,
      );
    });

    it('rejects unsupported MIME with 400', async () => {
      await request(app.getHttpServer())
        .post('/attachments/presign')
        .send({
          channelId: CHANNEL_ID,
          filename: 'malware.exe',
          contentType: 'application/x-msdownload',
          sizeBytes: 100,
        })
        .expect(400);
    });

    it('rejects oversized files with 400', async () => {
      await request(app.getHttpServer())
        .post('/attachments/presign')
        .send({
          channelId: CHANNEL_ID,
          filename: 'huge.png',
          contentType: 'image/png',
          sizeBytes: testStorageConfig.maxUploadBytes + 1,
        })
        .expect(400);
    });

    it('rejects without SEND_MESSAGES with 403', async () => {
      denySendMessages = true;

      await request(app.getHttpServer())
        .post('/attachments/presign')
        .send({
          channelId: CHANNEL_ID,
          filename: 'photo.png',
          contentType: 'image/png',
          sizeBytes: 1024,
        })
        .expect(403);
    });
  });

  describe('POST /channels/:channelId/messages', () => {
    const uploadedAttachment = (
      overrides: Partial<TestAttachmentRow> = {},
    ): TestAttachmentRow => ({
      id: 'att-owned',
      workspaceId: WORKSPACE_ID,
      channelId: CHANNEL_ID,
      messageId: null,
      uploaderId: SENDER_ID,
      storageKey: `${WORKSPACE_ID}/${CHANNEL_ID}/att-owned.png`,
      filename: 'photo.png',
      contentType: 'image/png',
      sizeBytes: 1024,
      status: 'uploaded',
      createdAt: new Date(),
      ...overrides,
    });

    it('rejects another user’s attachment id with 400', async () => {
      store.seedAttachment(
        uploadedAttachment({
          id: 'att-stranger',
          uploaderId: OTHER_USER_ID,
          storageKey: `${WORKSPACE_ID}/${CHANNEL_ID}/att-stranger.png`,
        }),
      );
      store.attachmentSelectFilter = (row) => row.uploaderId === SENDER_ID;

      await request(app.getHttpServer())
        .post(`/channels/${CHANNEL_ID}/messages`)
        .send({ content: 'hello', attachmentIds: ['att-stranger'] })
        .expect(400);
    });

    it('rejects a not-yet-uploaded attachment with 400', async () => {
      const pending = uploadedAttachment({
        id: 'att-pending',
        status: 'pending',
        storageKey: `${WORKSPACE_ID}/${CHANNEL_ID}/att-pending.png`,
      });
      store.seedAttachment(pending);
      store.attachmentSelectFilter = (row) => row.uploaderId === SENDER_ID;

      await request(app.getHttpServer())
        .post(`/channels/${CHANNEL_ID}/messages`)
        .send({ content: 'hello', attachmentIds: ['att-pending'] })
        .expect(400);
    });
  });

  describe('GET /attachments/:id/download-url', () => {
    it('returns 403 when viewer lacks VIEW_CHANNEL', async () => {
      const row = {
        id: 'att-dl',
        workspaceId: WORKSPACE_ID,
        channelId: CHANNEL_ID,
        messageId: null,
        uploaderId: SENDER_ID,
        storageKey: `${WORKSPACE_ID}/${CHANNEL_ID}/att-dl.png`,
        filename: 'photo.png',
        contentType: 'image/png',
        sizeBytes: 1024,
        status: 'uploaded',
        createdAt: new Date(),
      };
      store.seedAttachment(row);
      store.queueSelect([row]);

      denyViewChannel = true;
      setE2eSessionUserId(VIEWER_DENIED_ID);

      await request(app.getHttpServer())
        .get('/attachments/att-dl/download-url')
        .expect(403);
    });
  });

  describe('GET /attachments/:id', () => {
    const row = {
      id: 'att-file',
      workspaceId: WORKSPACE_ID,
      channelId: CHANNEL_ID,
      messageId: null,
      uploaderId: SENDER_ID,
      storageKey: `${WORKSPACE_ID}/${CHANNEL_ID}/att-file.png`,
      filename: 'photo.png',
      contentType: 'image/png',
      sizeBytes: 1024,
      status: 'uploaded',
      createdAt: new Date(),
    };

    it('streams the object with a private cache header', async () => {
      store.seedAttachment(row);
      mockStorage.markUploaded(row.storageKey);

      const res = await request(app.getHttpServer())
        .get('/attachments/att-file')
        .buffer(true)
        .parse((incoming, callback) => {
          const chunks: Buffer[] = [];
          incoming.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
          });
          incoming.on('end', () => {
            callback(null, Buffer.concat(chunks));
          });
        })
        .expect(200);

      expect(res.headers['cache-control']).toContain('private');
      expect(res.headers['content-type']).toMatch(/image\/png/);
      expect(Buffer.isBuffer(res.body) ? res.body.toString() : res.text).toBe(
        'mock-object',
      );
    });

    it('returns 403 when viewer lacks VIEW_CHANNEL', async () => {
      store.seedAttachment(row);
      denyViewChannel = true;
      setE2eSessionUserId(VIEWER_DENIED_ID);

      await request(app.getHttpServer())
        .get('/attachments/att-file')
        .expect(403);
    });
  });
});
