import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { VersionService } from '@mm-services/version.service';
import { DbService } from '@mm-services/db.service';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';

describe('Version service', () => {
  let get;
  let allDocs;
  let http;
  let service:VersionService;

  beforeEach(() => {
    get = sinon.stub();
    allDocs = sinon.stub();
    http = { get: sinon.stub() };

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: { get: () => ({ get, allDocs })  } },
        { provide: HttpClient, useValue: http },
      ],
    });
    service = TestBed.inject(VersionService);
  });

  afterEach(() => {
    sinon.restore();
  });


  describe('getLocal', () => {

    it('gets the version and rev from local ddoc', () => {
      get.resolves({
        _rev: '123-kldsjflksadjflksdjflksdjaf',
        build_info: {
          version: '3.5.0-beta.3',
          base_version: '3.5.0'
        }
      });
      return service.getLocal().then(({ version, rev }) => {
        expect(version).to.equal('3.5.0-beta.3 (~3.5.0)');
        expect(rev).to.equal('123');
      });
    });

    it('handles no base version', () => {
      get.resolves({
        _rev: '123-kldsjflksadjflksdjflksdjaf',
        build_info: {
          version: '3.5.0-beta.3'
        }
      });
      return service.getLocal().then(({ version }) => {
        expect(version).to.equal('3.5.0-beta.3');
      });
    });

    it('handles base version matching version', () => {
      get.resolves({
        _rev: '123-kldsjflksadjflksdjflksdjaf',
        build_info: {
          version: '3.5.0',
          base_version: '3.5.0'
        }
      });
      return service.getLocal().then(({ version }) => {
        expect(version).to.equal('3.5.0');
      });
    });

    it('handles no deploy info', () => {
      get.resolves({
        _rev: '123-kldsjflksadjflksdjflksdjaf'
      });
      return service.getLocal().then(({ version }) => {
        expect(version).to.be.undefined;
      });
    });

  });

  describe('getRemoteRev', () => {

    it('gets the rev from the remote ddoc', () => {
      get.resolves({
        _rev: '584-jsdfkjsdfkjh'
      });
      return service.getRemoteRev().then(rev => {
        expect(rev).to.equal('584');
      });
    });

  });

  describe('getServiceWorker', () => {
    it('should return version from service worker cache', async () => {
      http.get.returns(of({
        version: '4.10.0-beta.3',
        base_version: '4.10.0'
      }));

      const version = await service.getServiceWorker();

      expect(version).to.deep.equal({ version: '4.10.0-beta.3 (~4.10.0)' });
      expect(http.get.calledOnceWith('/deploy-info.json')).to.equal(true);
    });

    it('should throw error', async () => {
      http.get.returns(throwError(() => new Error('boom')));

      await expect(service.getServiceWorker()).to.be.rejectedWith('boom');
    });
  });
});
