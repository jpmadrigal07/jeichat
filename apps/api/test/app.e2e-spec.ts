import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/sample (GET)', () => {
    return request(app.getHttpServer())
      .get('/sample')
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          message: 'Sample API response',
        });
        expect(typeof res.body.servedAt).toBe('string');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
