import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { Person, Qualifier } from '@medic/cht-datasource';

import { UserContactService } from '@mm-services/user-contact.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';

describe('UserContact service', () => {
  let service: UserContactService;
  let getPerson;
  let bind;
  let UserSettings;

  beforeEach(() => {
    UserSettings = sinon.stub();
    getPerson = sinon.stub();
    bind = sinon
      .stub()
      .returns(getPerson);

    TestBed.configureTestingModule({
      providers: [
        { provide: CHTDatasourceService, useValue: { bind } },
        { provide: UserSettingsService, useValue: { get: UserSettings } },
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

    await expect(service.get()).to.be.rejectedWith('boom');

    expect(bind.notCalled).to.be.true;
    expect(getPerson.notCalled).to.be.true;
  });

  it('returns null when no configured contact', async () => {
    UserSettings.resolves({});

    const userContact = await service.get();

    expect(userContact).to.be.null;
    expect(bind.notCalled).to.be.true;
    expect(getPerson.notCalled).to.be.true;
  });

  it('returns null when user settings not in the database', async () => {
    UserSettings.rejects({ code: 404, reason: 'missing' });

    const userContact = await service.get();

    expect(userContact).to.be.null;
    expect(bind.notCalled).to.be.true;
    expect(getPerson.notCalled).to.be.true;
  });

  it('returns null when configured contact not in the database', async () => {
    UserSettings.resolves({ contact_id: 'not-found' });
    getPerson.resolves(null);

    const userContact = await service.get();

    expect(userContact).to.be.null;
    expect(bind.calledOnceWithExactly(Person.v1.getWithLineage)).to.be.true;
    expect(getPerson.calledOnceWithExactly(Qualifier.byUuid('not-found'))).to.be.true;
  });

  it('returns error from getting contact', async () => {
    UserSettings.resolves({ contact_id: 'nobody' });
    getPerson.rejects(new Error('boom'));

    await expect(service.get()).to.be.rejectedWith('boom');

    expect(bind.calledOnceWithExactly(Person.v1.getWithLineage)).to.be.true;
    expect(getPerson.calledOnceWithExactly(Qualifier.byUuid('nobody'))).to.be.true;
  });

  it('returns contact with lineage', async () => {
    const expected = { _id: 'somebody', name: 'Some Body' };
    UserSettings.resolves({ contact_id: 'somebody' });
    getPerson.resolves(expected);

    const actual = await service.get();

    expect(actual).to.equal(expected);
    expect(bind.calledOnceWithExactly(Person.v1.getWithLineage)).to.be.true;
    expect(getPerson.calledOnceWithExactly(Qualifier.byUuid(expected._id))).to.be.true;
  });

  it('returns contact without lineage', async () => {
    const expected = { _id: 'somebody', name: 'Some Body' };
    UserSettings.resolves({ contact_id: 'somebody' });
    getPerson.resolves(expected);

    const actual = await service.get({ hydrateLineage: false });

    expect(actual).to.equal(expected);
    expect(bind.calledOnceWithExactly(Person.v1.get)).to.be.true;
    expect(getPerson.calledOnceWithExactly(Qualifier.byUuid(expected._id))).to.be.true;
  });
});
