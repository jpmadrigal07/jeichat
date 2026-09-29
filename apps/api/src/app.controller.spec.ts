import { ServiceUnavailableException } from '@nestjs/common';

import { Test, TestingModule } from '@nestjs/testing';

import { AppController } from './app.controller';

import { AppService } from './app.service';

import { DrizzleService } from './database/drizzle.service';



describe('AppController', () => {

  let appController: AppController;

  const drizzle = { ping: jest.fn().mockResolvedValue(undefined) };



  beforeEach(async () => {

    drizzle.ping.mockReset();

    drizzle.ping.mockResolvedValue(undefined);



    const app: TestingModule = await Test.createTestingModule({

      controllers: [AppController],

      providers: [

        AppService,

        { provide: DrizzleService, useValue: drizzle },

      ],

    }).compile();



    appController = app.get<AppController>(AppController);

  });



  describe('root', () => {

    it('should return "Hello World!"', () => {

      expect(appController.getHello()).toBe('Hello World!');

    });

  });



  describe('health', () => {

    it('should return ok when the database responds', async () => {

      await expect(appController.getHealth()).resolves.toEqual({

        ok: true,

        revision: null,

      });

      expect(drizzle.ping).toHaveBeenCalledTimes(1);

    });



    it('should throw when the database is down', async () => {

      drizzle.ping.mockRejectedValueOnce(new Error('connect'));

      await expect(appController.getHealth()).rejects.toBeInstanceOf(

        ServiceUnavailableException,

      );

    });

  });



  describe('sample', () => {

    it('should return a JSON-shaped payload', () => {

      const body = appController.getSample();

      expect(body.message).toBe('Sample API response');

      expect(body.servedAt).toMatch(

        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,

      );

    });

  });

});


