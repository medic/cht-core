import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect, assert } from 'chai';

import { UserContactService } from '@mm-services/user-contact.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';

describe('UserContact service', () => {
  let service:UserContactService;
  let UserSettings;
  let contact;

  beforeEach(() => {
    contact = sinon.stub();
    UserSettings = sinon.stub();

    TestBed.configureTestingModule({
      providers: [
        { provide: UserSettingsService, useValue: { get: UserSettings } },
        { provide: LineageModelGeneratorService, useValue: { contact } },
      ],
    });
    service = TestBed.inject(UserContactService);
  });

  afterEach(() => {
    sinon.restore();
  });


  it('returns error from user settings', () => {
    UserSettings.rejects(new Error('boom'));
    return service
      .get()
      .then(() => {
        assert.fail('Expected error to be thrown');
      })
      .catch((err) => {
        expect(err.message).to.equal('boom');
      });
  });

  it('returns undefined when no configured contact', () => {
    UserSettings.resolves({});
    return service.get().then(function(contact) {
      expect(contact).to.equal(undefined);
    });
  });

  it('returns undefined when configured contact not in the database', () => {
    UserSettings.resolves({ contact_id: 'not-found' });
    contact.rejects({ code: 404, reason: 'missing' });
    return service.get().then((contact) => {
      expect(contact).to.equal(undefined);
    });
  });

  it('returns error from getting contact', () => {
    UserSettings.resolves({ contact_id: 'nobody' });
    contact.rejects(new Error('boom'));
    return service
      .get()
      .then(() => {
        assert.fail('Expected error to be thrown');
      })
      .catch((err) => {
        expect(err.message).to.equal('boom');
        expect(contact.callCount).to.equal(1);
        expect(contact.args[0][0]).to.equal('nobody');
      });
  });

  it('returns contact', () => {
    const expected = { _id: 'somebody', name: 'Some Body' };
    UserSettings.resolves({ contact_id: 'somebody' });
    contact.resolves({ doc: expected });
    return service.get().then((actual) => {
      expect(actual).to.deep.equal(expected);
      expect(contact.callCount).to.equal(1);
      expect(contact.args[0][0]).to.equal('somebody');
      expect(contact.args[0][1].merge).to.equal(true);
    });
  });

});
