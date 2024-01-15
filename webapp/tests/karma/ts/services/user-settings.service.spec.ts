import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect, assert } from 'chai';

import { UserSettingsService } from '@mm-services/user-settings.service';
import { DbService } from '@mm-services/db.service';
import { SessionService } from '@mm-services/session.service';
import { ChangesService } from '@mm-services/changes.service';
import { LanguageService } from '@mm-services/language.service';

describe('UserSettings service', () => {
  let service:UserSettingsService;
  let get;
  let userCtx;
  let changesCallback;
  let getLanguage;

  beforeEach(() => {
    userCtx = sinon.stub();
    get = sinon.stub();
    getLanguage = sinon.stub();

    TestBed.configureTestingModule({
      providers: [
        { provide: ChangesService, useValue: { subscribe: (options) => changesCallback = options.callback } },
        { provide: LanguageService, useValue: { get: getLanguage } },
        { provide: SessionService, useValue: { userCtx } },
        { provide: DbService, useValue: { get: () => ({ get }) } },
      ],
    });
    service = TestBed.inject(UserSettingsService);
  });

  afterEach(() => {
    sinon.restore();
  });


  it('errors when no user ctx', () => {
    userCtx.returns();
    return service
      .get()
      .then(() => {
        assert.fail('expected error to be thrown');
      })
      .catch(err => {
        expect(err.message).to.equal('UserCtx not found');
      });
  });

  it('gets from local db', () => {
    userCtx.returns({ name: 'jack' });
    get.returns(Promise.resolve({ id: 'j' }));
    return service.get().then((actual:any) => {
      expect(actual.id).to.equal('j');
      expect(userCtx.callCount).to.equal(2);
      expect(get.callCount).to.equal(1);
      expect(get.args[0][0]).to.equal('org.couchdb.user:jack');
      expect(getLanguage.callCount).to.equal(0);
    });
  });

  it('get with language', () => {
    userCtx.returns({ name: 'jack' });
    get.returns(Promise.resolve({ id: 'j' }));
    getLanguage.resolves('en');
    return service.getWithLanguage().then((actual:any) => {
      expect(actual.id).to.equal('j');
      expect(actual.language).to.equal('en');
      expect(userCtx.callCount).to.equal(2);
      expect(get.callCount).to.equal(1);
      expect(get.args[0][0]).to.equal('org.couchdb.user:jack');
      expect(getLanguage.callCount).to.equal(1);
    });
  });

  it('is cached', () => {
    userCtx.returns({ name: 'jack' });
    get.resolves({ id: 'j' });
    return service
      .get()
      .then((first:any) => {
        expect(first.id).to.equal('j');
        expect(get.callCount).to.equal(1);
        return service.get();
      })
      .then((second:any) => {
        expect(second.id).to.equal('j');
        expect(get.callCount).to.equal(1);
      });
  });

  it('is not cached when changes occur', () => {
    userCtx.returns({ name: 'jack' });
    get.resolves({ id: 'j' });
    return service
      .get()
      .then((first:any) => {
        expect(first.id).to.equal('j');
        expect(get.callCount).to.equal(1);
        changesCallback({ id: 'org.couchdb.user:jack', changes: [ { rev: '5-xyz' } ] });
        return service.get();
      })
      .then((second:any) => {
        expect(second.id).to.equal('j');
        expect(get.callCount).to.equal(2);
      });
  });

  it('multiple concurrent calls result in single database lookup', () => {
    userCtx.returns({ name: 'jack' });
    get.resolves({ id: 'j' });
    const isExpected = doc => {
      expect(doc.id).to.equal('j');
      expect(get.callCount).to.equal(1);
    };

    const firstPromise = service.get();
    service.get();
    return service
      .get()
      .then(isExpected)
      .then(() => firstPromise)
      .then(isExpected);
  });

  it('gets from remote db', () => {
    userCtx.returns({ name: 'jack' });
    get
      .onCall(0).rejects({ code: 404 })
      .onCall(1).resolves({ id: 'j' });
    return service.get().then((actual:any) => {
      expect(actual.id).to.equal('j');
      expect(userCtx.callCount).to.equal(2);
      expect(get.callCount).to.equal(2);
      expect(get.args[0][0]).to.equal('org.couchdb.user:jack');
      expect(get.args[1][0]).to.equal('org.couchdb.user:jack');
    });
  });

  it('errors if remote db errors', () => {
    userCtx.returns({ name: 'jack' });
    get
      .onCall(0).returns(Promise.reject({ code: 404 }))
      .onCall(1).returns(Promise.reject({ code: 503, message: 'nope' }));
    service
      .get()
      .then(() => {
        assert.fail('expected error to be thrown');
      })
      .catch(err => {
        expect(userCtx.callCount).to.equal(2);
        expect(get.callCount).to.equal(2);
        expect(get.args[0][0]).to.equal('org.couchdb.user:jack');
        expect(get.args[1][0]).to.equal('org.couchdb.user:jack');
        expect(err.message).to.equal('nope');
      });
  });
});
