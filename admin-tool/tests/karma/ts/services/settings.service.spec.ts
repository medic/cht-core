import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { of, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { DbService } from '@admin-tool-services/db.service';
import { ChangesService } from '@admin-tool-services/changes.service';
import { SettingsService } from '@admin-tool-services/settings.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let dbService;
  let changesService;
  let changesCallback: Function;
  let http;

  beforeEach(() => {
    changesCallback = () => {};

    http = {
      get: sinon.stub(),
      put: sinon.stub(),
    };

    changesService = {
      subscribe: sinon.stub().callsFake((options) => {
        changesCallback = options.filter
          ? (change) => {
            if (options.filter(change)) {
              options.callback(change);
            }
          }
          : options.callback;
        return { unsubscribe: sinon.stub() };
      }),
    };

    dbService = {
      get: sinon.stub().returns({
        get: sinon.stub().resolves({ _id: 'medic-client', settings: { locale: 'en' } }),
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: dbService },
        { provide: ChangesService, useValue: changesService },
        { provide: HttpClient, useValue: http },
      ],
    });

    service = TestBed.inject(SettingsService);
  });

  afterEach(() => {
    sinon.restore();
  });
  describe('get', () => {
    it('should fetch and return the settings doc', async () => {
      const settings = await service.get();

      expect(settings).to.deep.equal({ locale: 'en' });
      expect(dbService.get().get.callCount).to.equal(1);
    });

    it('should return cached settings on subsequent calls', async () => {
      await service.get();
      await service.get();

      expect(dbService.get().get.callCount).to.equal(1);
    });

    it('should subscribe to changes on construction', () => {
      expect(changesService.subscribe.callCount).to.equal(1);
      expect(changesService.subscribe.args[0][0].key).to.equal('settings');
    });

    it('should invalidate cache when settings doc changes', async () => {
      await service.get();
      expect(dbService.get().get.callCount).to.equal(1);

      changesCallback({ id: 'settings', seq: 5 });

      await service.get();
      expect(dbService.get().get.callCount).to.equal(2);
    });

    it('should not invalidate cache when an unrelated doc changes', async () => {
      await service.get();
      expect(dbService.get().get.callCount).to.equal(1);

      changesCallback({ id: 'not-settings', seq: 6 });

      await service.get();
      expect(dbService.get().get.callCount).to.equal(1);
    });

    it('should clear the cache and reject on fetch error', async () => {
      const error = new Error('not found');
      dbService.get().get.rejects(error);

      try {
        await service.get();
        expect.fail('should have thrown');
      } catch (e) {
        expect(e).to.equal(error);
      }

      // cache cleared — next call should try again
      dbService.get().get.resolves({ _id: 'medic-client', settings: { locale: 'fr' } });
      const settings = await service.get();
      expect(settings).to.deep.equal({ locale: 'fr' });
    });
  });
  describe('updateSettings', () => {
    it('should make a PUT request to /api/v1/settings', async () => {
      http.put.returns(of(void 0));
      await service.updateSettings({ date_format: 'DD/MM/YYYY' });
      expect(http.put.calledWith('/api/v1/settings')).to.be.true;
    });

    it('should send Content-Type application/json header', async () => {
      http.put.returns(of(void 0));
      await service.updateSettings({ date_format: 'DD/MM/YYYY' });
      expect(http.put.args[0][2].headers).to.deep.include({
        'Content-Type': 'application/json',
      });
    });

    it('should send replace=false by default', async () => {
      http.put.returns(of(void 0));
      await service.updateSettings({ date_format: 'DD/MM/YYYY' });
      expect(http.put.args[0][2].params).to.deep.include({ replace: 'false' });
    });

    it('should send replace=true when specified', async () => {
      http.put.returns(of(void 0));
      await service.updateSettings({ date_format: 'DD/MM/YYYY' }, true);
      expect(http.put.args[0][2].params).to.deep.include({ replace: 'true' });
    });

    it('should handle empty updates object', async () => {
      http.put.returns(of(void 0));
      await service.updateSettings({});
      expect(http.put.calledOnce).to.be.true;
    });

    it('should propagate error when request fails', async () => {
      http.put.returns(throwError(() => ({ status: 500 })));
      try {
        await service.updateSettings({ date_format: 'DD/MM/YYYY' });
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err.status).to.equal(500);
      }
    });
  });
  describe('getDateTimeSettings', () => {
    it('should map date_format to dateFormat', async () => {
      dbService.get().get.resolves({
        settings: { date_format: 'DD/MM/YYYY', reported_date_format: 'MM/DD/YYYY HH:mm:ss' },
      });
      const result = await service.getDateTimeSettings();
      expect(result.dateFormat).to.equal('DD/MM/YYYY');
    });

    it('should map reported_date_format to dateTimeFormat', async () => {
      dbService.get().get.resolves({
        settings: { date_format: 'DD/MM/YYYY', reported_date_format: 'MM/DD/YYYY HH:mm:ss' },
      });
      const result = await service.getDateTimeSettings();
      expect(result.dateTimeFormat).to.equal('MM/DD/YYYY HH:mm:ss');
    });

    it('should return empty string for missing date_format', async () => {
      dbService.get().get.resolves({ settings: {} });
      const result = await service.getDateTimeSettings();
      expect(result.dateFormat).to.equal('');
    });

    it('should return empty string for missing reported_date_format', async () => {
      dbService.get().get.resolves({ settings: {} });
      const result = await service.getDateTimeSettings();
      expect(result.dateTimeFormat).to.equal('');
    });

    it('should propagate error when get fails', async () => {
      dbService.get().get.rejects({ status: 500 });
      try {
        await service.getDateTimeSettings();
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err.status).to.equal(500);
      }
    });
  });
  describe('updateDateTimeSettings', () => {
    it('should convert dateFormat to date_format', async () => {
      http.put.returns(of(void 0));
      await service.updateDateTimeSettings({
        dateFormat: 'DD/MM/YYYY',
        dateTimeFormat: 'MM/DD/YYYY HH:mm:ss',
      });
      expect(http.put.args[0][1]).to.deep.include({
        date_format: 'DD/MM/YYYY',
      });
    });

    it('should convert dateTimeFormat to reported_date_format', async () => {
      http.put.returns(of(void 0));
      await service.updateDateTimeSettings({
        dateFormat: 'DD/MM/YYYY',
        dateTimeFormat: 'MM/DD/YYYY HH:mm:ss',
      });
      expect(http.put.args[0][1]).to.deep.include({
        reported_date_format: 'MM/DD/YYYY HH:mm:ss',
      });
    });

    it('should propagate error when updateSettings fails', async () => {
      http.put.returns(throwError(() => ({ status: 500 })));
      try {
        await service.updateDateTimeSettings({
          dateFormat: 'DD/MM/YYYY',
          dateTimeFormat: 'MM/DD/YYYY HH:mm:ss',
        });
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err.status).to.equal(500);
      }
    });
  });
  describe('getRoles', () => {
    it('should return roles from settings', async () => {
      const mockRoles = {
        chw: { name: 'usertype.chw', offline: true },
        national_admin: { name: 'usertype.national_admin' },
      };
      dbService.get().get.resolves({ settings: { roles: mockRoles } });
      const result = await service.getRoles();
      expect(result).to.deep.equal(mockRoles);
    });

    it('should return empty object when roles is undefined', async () => {
      dbService.get().get.resolves({ settings: {} });
      const result = await service.getRoles();
      expect(result).to.deep.equal({});
    });

    it('should propagate error when get fails', async () => {
      dbService.get().get.rejects({ status: 500 });
      try {
        await service.getRoles();
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err.status).to.equal(500);
      }
    });
  });
  describe('updateRoles', () => {
    it('should call updateSettings with roles and replace=true', async () => {
      http.put.returns(of(void 0));
      const mockRoles = { chw: { name: 'usertype.chw', offline: true } };
      await service.updateRoles(mockRoles);
      expect(http.put.calledWith('/api/v1/settings')).to.be.true;
    });

    it('should send replace=true', async () => {
      http.put.returns(of(void 0));
      await service.updateRoles({ chw: { name: 'usertype.chw' } });
      expect(http.put.args[0][2].params).to.deep.include({ replace: 'true' });
    });

    it('should send roles in the body', async () => {
      http.put.returns(of(void 0));
      const mockRoles = { chw: { name: 'usertype.chw', offline: true } };
      await service.updateRoles(mockRoles);
      expect(http.put.args[0][1]).to.deep.equal({ roles: mockRoles });
    });

    it('should propagate error when request fails', async () => {
      http.put.returns(throwError(() => ({ status: 500 })));
      try {
        await service.updateRoles({ chw: { name: 'usertype.chw' } });
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err.status).to.equal(500);
      }
    });
  });
});
