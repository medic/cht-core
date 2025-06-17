import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { provideMockStore } from '@ngrx/store/testing';

import { UserContactSummaryService } from '@mm-services/user-contact-summary.service';
import { CacheService } from '@mm-services/cache.service';
import { ContactChangeFilterService } from '@mm-services/contact-change-filter.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { ContactViewModelGeneratorService } from '@mm-services/contact-view-model-generator.service';
import { TargetAggregatesService } from '@mm-services/target-aggregates.service';
import { ContactSummaryService } from '@mm-services/contact-summary.service';
import { Selectors } from '@mm-selectors/index';

describe('UserContactSummaryService', () => {
  let service: UserContactSummaryService;
  let cacheService;
  let contactChangeFilterService;
  let userSettingsService;
  let contactViewModelGeneratorService;
  let targetAggregatesService;
  let contactSummaryService;
  const forms = [{ id: 'forms' }];

  let cacheRegister;
  let cacheGet;
  let cacheInvalidate;

  const registerService = () => {
    service = TestBed.inject(UserContactSummaryService);
    expect(cacheService.register.callCount).to.equal(1);

    cacheGet = cacheService.register.args[0][0].get;
    cacheInvalidate = cacheService.register.args[0][0].invalidate;

    return new Promise((resolve, reject) => {
      cacheGet((err, success) => err ? reject(err) : resolve(success));
    });
  };

  beforeEach(() => {
    const mockedSelectors = [
      { selector: Selectors.getForms, value: forms },
    ];

    cacheRegister = sinon.stub();
    cacheService = { register: sinon.stub().returns(cacheRegister) };
    contactChangeFilterService = { isRelevantChange: sinon.stub() };
    userSettingsService = { get: sinon.stub() };
    contactViewModelGeneratorService = {
      getContact: sinon.stub(),
      loadReports: sinon.stub(),
    };
    targetAggregatesService = { getTargetDocs: sinon.stub() };
    contactSummaryService = { get: sinon.stub() };

    TestBed.configureTestingModule({
      providers: [
        provideMockStore({ selectors: mockedSelectors }),
        { provide: CacheService, useValue: cacheService },
        { provide: ContactChangeFilterService, useValue: contactChangeFilterService },
        { provide: UserSettingsService, useValue: userSettingsService },
        { provide: ContactViewModelGeneratorService, useValue: contactViewModelGeneratorService },
        { provide: TargetAggregatesService, useValue: targetAggregatesService },
        { provide: ContactSummaryService, useValue: contactSummaryService },
      ],
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should register cache', () => {
    registerService();
    expect(cacheService.register.callCount).to.equal(1);
  });

  it('should cache load summary', async () => {
    const contact = {
      doc: { the: 'contact' },
      lineage: ['the', 'lineage'],
    };
    userSettingsService.get.resolves({ contact_id: 'uuid', facility_id: 'f_uuid' });
    contactViewModelGeneratorService.getContact.resolves(contact);
    contactViewModelGeneratorService.loadReports.resolves([{ the: 'report' }]);
    targetAggregatesService.getTargetDocs.resolves([{ the: 'targetDoc' }]);
    contactSummaryService.get.resolves({ the: 'context' });

    const summary = await registerService();

    expect(userSettingsService.get.callCount).to.equal(1);
    expect(contactViewModelGeneratorService.getContact.args).to.deep.equal([['uuid']]);
    expect(contactViewModelGeneratorService.loadReports.args).to.deep.equal([[contact, forms]]);
    expect(targetAggregatesService.getTargetDocs.args).to.deep.equal([[contact, 'f_uuid', 'uuid' ]]);
    expect(contactSummaryService.get.args).to.deep.equal([[
      contact.doc,
      [{ the: 'report' }],
      contact.lineage,
      [{ the: 'targetDoc' }]
    ]]);
    expect(summary).to.deep.equal({ the: 'context' });
  });

  it('should throw an error when loading contact summary fails', async () => {
    userSettingsService.get.rejects(new Error('boom'));
    const promise = registerService();
    await expect(promise).to.eventually.be.rejectedWith('boom');
  });

  it('should not load summary if the user does not have an associated contact', async () => {
    const summary = await registerService();
    expect(summary).to.be.undefined;
    expect(userSettingsService.get.callCount).to.equal(1);
    expect(contactViewModelGeneratorService.getContact.called).to.be.false;
    expect(contactViewModelGeneratorService.loadReports.called).to.be.false;
    expect(targetAggregatesService.getTargetDocs.called).to.be.false;
    expect(contactSummaryService.get.called).to.be.false;
  });
  
  it('should invalidate cache on relevant change', async () => {
    const contact = {
      doc: { the: 'contact' },
      lineage: ['the', 'lineage'],
    };
    userSettingsService.get.resolves({ contact_id: 'uuid', facility_id: 'f_uuid' });
    contactViewModelGeneratorService.getContact.resolves(contact);
    contactViewModelGeneratorService.loadReports.resolves([{ the: 'report' }]);
    targetAggregatesService.getTargetDocs.resolves([{ the: 'targetDoc' }]);
    contactSummaryService.get.resolves({ the: 'context' });

    await registerService();

    const change = { the: 'change' };

    contactChangeFilterService.isRelevantChange.returns(false);
    expect(cacheInvalidate(change)).to.equal(false);
    expect(contactChangeFilterService.isRelevantChange.args).to.deep.equal([[change, contact]]);

    contactChangeFilterService.isRelevantChange.returns(true);
    expect(cacheInvalidate(change)).to.equal(true);
    expect(contactChangeFilterService.isRelevantChange.args).to.deep.equal([[change, contact], [change, contact]]);
  });

  it('get() should return cache', async () => {
    cacheRegister.callsArgWith(0, null, 'the summary');

    await registerService();

    const response = await service.get();
    expect(response).to.equal('the summary');
  });

  it('get() should throw an error when getting cache fails', async () => {
    cacheRegister.callsArgWith(0, new Error('boom'));

    await registerService();

    await expect(service.get()).to.be.eventually.rejectedWith('boom');
  });
});
