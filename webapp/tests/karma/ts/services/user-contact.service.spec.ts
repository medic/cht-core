import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { UserContactService } from '@mm-services/user-contact.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { DbService } from '@mm-services/db.service';

describe('UserContact service', () => {
  let service: UserContactService;
  let UserSettings;
  let contact;
  let medicDb;
  let dbService;

  beforeEach(() => {
    contact = sinon.stub();
    UserSettings = sinon.stub();
    medicDb = { get: sinon.stub() };
    dbService = {
      get: sinon
        .stub()
        .returns(medicDb)
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: dbService },
        { provide: UserSettingsService, useValue: { get: UserSettings } },
        { provide: LineageModelGeneratorService, useValue: { contact } },
      ],
    });
    service = TestBed.inject(UserContactService);
  });

  afterEach(() => {
    expect(UserSettings.callCount).to.equal(1);
    sinon.restore();
  });

  it('returns error from user settings', async () => {
    UserSettings.rejects(new Error('boom'));
    try {
      await service.get();
      expect(true).to.equal('Expected error to be thrown');
    } catch (err) {
      expect(err.message).to.equal('boom');
    }

    expect(contact.callCount).to.equal(0);
    expect(dbService.get.callCount).to.equal(0);
    expect(medicDb.get.callCount).to.equal(0);
  });

  it('returns undefined when no configured contact', async () => {
    UserSettings.resolves({});
    const userContact = await service.get();
    expect(userContact).to.be.undefined;
    expect(contact.callCount).to.equal(0);
    expect(dbService.get.callCount).to.equal(0);
    expect(medicDb.get.callCount).to.equal(0);
  });

  describe('when hydrating lineage', () => {
    afterEach(() => {
      expect(dbService.get.callCount).to.equal(0);
      expect(medicDb.get.callCount).to.equal(0);
    });

    it('returns undefined when configured contact not in the database', async () => {
      UserSettings.resolves({ contact_id: 'not-found' });
      contact.rejects({ code: 404, reason: 'missing' });
      const userContact = await service.get();
      expect(userContact).to.be.undefined;
      expect(contact.callCount).to.equal(1);
      expect(contact.args[0]).to.deep.equal(['not-found', { merge: true }]);
    });

    it('returns error from getting contact', async () => {
      UserSettings.resolves({ contact_id: 'nobody' });
      contact.rejects(new Error('boom'));
      try {
        await service.get();
        expect(true).to.equal('Expected error to be thrown');
      } catch (err) {
        expect(err.message).to.equal('boom');
      }

      expect(contact.callCount).to.equal(1);
      expect(contact.args[0]).to.deep.equal(['nobody', { merge: true }]);
    });

    it('returns contact', async () => {
      const expected = { _id: 'somebody', name: 'Some Body' };
      UserSettings.resolves({ contact_id: 'somebody' });
      contact.resolves({ doc: expected });
      const actual = await service.get();
      expect(actual).to.deep.equal(expected);
      expect(contact.callCount).to.equal(1);
      expect(contact.args[0]).to.deep.equal(['somebody', { merge: true }]);
    });
  });

  describe('when not hydrating lineage', () => {
    afterEach(() => {
      expect(contact.callCount).to.equal(0);
      expect(dbService.get.callCount).to.equal(1);
    });

    it('returns undefined when configured contact not in the database', async () => {
      UserSettings.resolves({ contact_id: 'not-found' });
      medicDb.get.rejects({ code: 404, reason: 'missing' });
      const contact = await service.get({ hydrateLineage: false });
      expect(contact).to.be.undefined;
      expect(medicDb.get.callCount).to.equal(1);
      expect(medicDb.get.args[0]).to.deep.equal(['not-found']);
    });

    it('returns error from getting contact', async () => {
      UserSettings.resolves({ contact_id: 'nobody' });
      medicDb.get.rejects(new Error('boom'));
      try {
        await service.get({ hydrateLineage: false });
        expect(true).to.equal('Expected error to be thrown');
      } catch (err) {
        expect(err.message).to.equal('boom');
      }

      expect(medicDb.get.callCount).to.equal(1);
      expect(medicDb.get.args[0][0], 'nobo).to.equal(');
    });

    it('returns contact', async () => {
      const expected = { _id: 'somebody', name: 'Some Body' };
      UserSettings.resolves({ contact_id: 'somebody' });
      medicDb.get.resolves(expected);
      const actual = await service.get({ hydrateLineage: false });
      expect(actual).to.deep.equal(expected);
      expect(medicDb.get.callCount).to.equal(1);
      expect(medicDb.get.args[0]).to.deep.equal(['somebody']);
    });
  });
});
