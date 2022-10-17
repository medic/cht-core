import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { assert } from 'chai';

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
    assert.equal(UserSettings.callCount, 1);
    sinon.restore();
  });

  it('returns error from user settings', async () => {
    UserSettings.rejects(new Error('boom'));
    try {
      await service.get();
      assert.fail('Expected error to be thrown');
    } catch (err) {
      assert.equal(err.message, 'boom');
    }

    assert.equal(contact.callCount, 0);
    assert.equal(dbService.get.callCount, 0);
    assert.equal(medicDb.get.callCount, 0);
  });

  it('returns undefined when no configured contact', async () => {
    UserSettings.resolves({});
    const userContact = await service.get();
    assert.isUndefined(userContact);
    assert.equal(contact.callCount, 0);
    assert.equal(dbService.get.callCount, 0);
    assert.equal(medicDb.get.callCount, 0);
  });

  describe('when hydrating lineage', () => {
    afterEach(() => {
      assert.equal(dbService.get.callCount, 0);
      assert.equal(medicDb.get.callCount, 0);
    });

    it('returns undefined when configured contact not in the database', async () => {
      UserSettings.resolves({ contact_id: 'not-found' });
      contact.rejects({ code: 404, reason: 'missing' });
      const userContact = await service.get();
      assert.isUndefined(userContact);
      assert.equal(contact.callCount, 1);
      assert.deepEqual(contact.args[0], ['not-found', { merge: true }]);
    });

    it('returns error from getting contact', async () => {
      UserSettings.resolves({ contact_id: 'nobody' });
      contact.rejects(new Error('boom'));
      try {
        await service.get();
        assert.fail('Expected error to be thrown');
      } catch (err) {
        assert.equal(err.message, 'boom');
      }

      assert.equal(contact.callCount, 1);
      assert.deepEqual(contact.args[0], ['nobody', { merge: true }]);
    });

    it('returns contact', async () => {
      const expected = { _id: 'somebody', name: 'Some Body' };
      UserSettings.resolves({ contact_id: 'somebody' });
      contact.resolves({ doc: expected });
      const actual = await service.get();
      assert.deepEqual(actual, expected);
      assert.equal(contact.callCount, 1);
      assert.deepEqual(contact.args[0], ['somebody', { merge: true }]);
    });
  });

  describe('when not hydrating lineage', () => {
    afterEach(() => {
      assert.equal(contact.callCount, 0);
      assert.equal(dbService.get.callCount, 1);
    });

    it('returns undefined when configured contact not in the database', async () => {
      UserSettings.resolves({ contact_id: 'not-found' });
      medicDb.get.rejects({ code: 404, reason: 'missing' });
      const contact = await service.get({ hydrateLineage: false });
      assert.isUndefined(contact);
      assert.equal(medicDb.get.callCount, 1);
      assert.deepEqual(medicDb.get.args[0], ['not-found']);
    });

    it('returns error from getting contact', async () => {
      UserSettings.resolves({ contact_id: 'nobody' });
      medicDb.get.rejects(new Error('boom'));
      try {
        await service.get({ hydrateLineage: false });
        assert.fail('Expected error to be thrown');
      } catch (err) {
        assert.equal(err.message, 'boom');
      }

      assert.equal(medicDb.get.callCount, 1);
      assert.equal(medicDb.get.args[0][0], 'nobody');
    });

    it('returns contact', async () => {
      const expected = { _id: 'somebody', name: 'Some Body' };
      UserSettings.resolves({ contact_id: 'somebody' });
      medicDb.get.resolves(expected);
      const actual = await service.get({ hydrateLineage: false });
      assert.deepEqual(actual, expected);
      assert.equal(medicDb.get.callCount, 1);
      assert.deepEqual(medicDb.get.args[0], ['somebody']);
    });
  });
});
