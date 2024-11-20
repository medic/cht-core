import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { Person, Qualifier } from '@medic/cht-datasource';

import { UserContactService } from '@mm-services/user-contact.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';
import { AuthService } from '@mm-services/auth.service';

describe('UserContact service', () => {
  let service: UserContactService;
  let authService;
  let getPerson;
  let getPersonWithLineage;
  let bind;
  let UserSettings;

  beforeEach(() => {
    UserSettings = sinon.stub();
    getPerson = sinon.stub();
    getPersonWithLineage = sinon.stub();
    bind = sinon.stub();
    bind.withArgs(Person.v1.get).returns(getPerson);
    bind.withArgs(Person.v1.getWithLineage).returns(getPersonWithLineage);
    authService = { online: sinon.stub() };

    TestBed.configureTestingModule({
      providers: [
        { provide: CHTDatasourceService, useValue: { bind } },
        { provide: UserSettingsService, useValue: { get: UserSettings } },
        { provide: AuthService, useValue: authService },
      ],
    });
    service = TestBed.inject(UserContactService);
  });

  afterEach(() => {
    expect(bind.args).to.deep.equal([[Person.v1.get], [Person.v1.getWithLineage]]);
    sinon.restore();
  });

  describe('get', () => {
    afterEach(() => {
      expect(UserSettings.callCount).to.equal(1);
      expect(authService.online.notCalled).to.be.true;
    });

    it('returns error from user settings', async () => {
      UserSettings.rejects(new Error('boom'));

      await expect(service.get()).to.be.rejectedWith('boom');

      expect(getPerson.notCalled).to.be.true;
      expect(getPersonWithLineage.notCalled).to.be.true;
    });

    it('returns null when no configured contact', async () => {
      UserSettings.resolves({});

      const userContact = await service.get();

      expect(userContact).to.be.null;
      expect(getPerson.notCalled).to.be.true;
      expect(getPersonWithLineage.notCalled).to.be.true;
    });

    it('returns null when user settings not in the database', async () => {
      UserSettings.rejects({ code: 404, reason: 'missing' });

      const userContact = await service.get();

      expect(userContact).to.be.null;
      expect(getPerson.notCalled).to.be.true;
      expect(getPersonWithLineage.notCalled).to.be.true;
    });

    it('returns null when configured contact not in the database', async () => {
      UserSettings.resolves({ contact_id: 'not-found' });
      getPersonWithLineage.resolves(null);

      const userContact = await service.get();

      expect(userContact).to.be.null;
      expect(getPerson.notCalled).to.be.true;
      expect(getPersonWithLineage.calledOnceWithExactly(Qualifier.byUuid('not-found'))).to.be.true;
    });

    it('returns error from getting contact', async () => {
      UserSettings.resolves({ contact_id: 'nobody' });
      getPersonWithLineage.rejects(new Error('boom'));

      await expect(service.get()).to.be.rejectedWith('boom');

      expect(getPerson.notCalled).to.be.true;
      expect(getPersonWithLineage.calledOnceWithExactly(Qualifier.byUuid('nobody'))).to.be.true;
    });

    it('returns contact with lineage', async () => {
      const expected = { _id: 'somebody', name: 'Some Body' };
      UserSettings.resolves({ contact_id: 'somebody' });
      getPersonWithLineage.resolves(expected);

      const actual = await service.get();

      expect(actual).to.equal(expected);
      expect(getPerson.notCalled).to.be.true;
      expect(getPersonWithLineage.calledOnceWithExactly(Qualifier.byUuid(expected._id))).to.be.true;
    });

    it('returns contact without lineage', async () => {
      const expected = { _id: 'somebody', name: 'Some Body' };
      UserSettings.resolves({ contact_id: 'somebody' });
      getPerson.resolves(expected);

      const actual = await service.get({ hydrateLineage: false });

      expect(actual).to.equal(expected);
      expect(getPerson.calledOnceWithExactly(Qualifier.byUuid(expected._id))).to.be.true;
      expect(getPersonWithLineage.notCalled).to.be.true;
    });
  });

  describe('getUserLineageToRemove()', () => {
    afterEach(() => {
      expect(getPerson.notCalled).to.be.true;
      expect(authService.online.calledWithExactly(true)).to.be.true;
    });

    it('should return null when user is type online', async () => {
      authService.online.returns(true);

      const result = await service.getUserLineageToRemove();

      expect(result).to.be.null;
      expect(UserSettings.notCalled).to.be.true;
      expect(getPersonWithLineage.notCalled).to.be.true;
    });

    it('should return null when user has more than one assigned facility', async () => {
      authService.online.returns(false);
      UserSettings.resolves({ contact_id: 'somebody', facility_id: [ 'id-1', 'id-2' ] });

      const result = await service.getUserLineageToRemove();

      expect(result).to.be.null;
      expect(UserSettings.calledOnceWithExactly()).to.be.true;
      expect(getPersonWithLineage.notCalled).to.be.true;
    });

    it('should return null when parent is not defined', async () => {
      authService.online.returns(false);
      UserSettings.resolves({ contact_id: 'somebody', facility_id: [ 'id-1', 'id-2' ] });
      getPersonWithLineage.resolves({ parent: undefined });

      const result = await service.getUserLineageToRemove();

      expect(result).to.be.null;
      expect(UserSettings.calledOnceWithExactly()).to.be.true;
      expect(getPersonWithLineage.notCalled).to.be.true;
    });

    it('should return facility name when user is type offline and has only one assigned facility', async () => {
      authService.online.returns(false);
      UserSettings.resolves({ contact_id: 'somebody', facility_id: 'id-1' });
      getPersonWithLineage.resolves({ parent: { name: 'Kisumu Area' } });

      const resultWithString = await service.getUserLineageToRemove();

      expect(resultWithString).to.equal('Kisumu Area');

      UserSettings.resolves({ contact_id: 'somebody', facility_id: [ 'id-5' ] });
      getPersonWithLineage.resolves({ parent: { name: 'Kakamega Area' } });

      const resultWithArray = await service.getUserLineageToRemove();

      expect(resultWithArray).to.equal('Kakamega Area');
      expect(UserSettings.callCount).to.equal(4);
      expect(getPersonWithLineage.args).to.deep.equal([[Qualifier.byUuid('somebody')], [Qualifier.byUuid('somebody')]]);
    });
  });
});
