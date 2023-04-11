import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import * as moment from 'moment';

import { ContactSummaryService } from '@mm-services/contact-summary.service';
import { PipesService } from '@mm-services/pipes.service';
import { SettingsService } from '@mm-services/settings.service';
import { FeedbackService } from '@mm-services/feedback.service';
import { UHCStatsService } from '@mm-services/uhc-stats.service';
import { CHTScriptApiService } from '@mm-services/cht-script-api.service';

describe('ContactSummary service', () => {
  let service;
  let Settings;
  let feedbackService;
  let uhcStatsService;
  let chtScriptApiService;
  let chtScriptApi;

  beforeEach(() => {
    Settings = sinon.stub();
    feedbackService = { submit: sinon.stub() };
    uhcStatsService = {
      getHomeVisitStats: sinon.stub(),
      getUHCInterval: sinon.stub()
    };
    chtScriptApi = {
      v1: {
        hasPermissions: sinon.stub(),
        hasAnyPermission: sinon.stub()
      }
    };
    chtScriptApiService = {
      getApi: sinon.stub().returns(chtScriptApi)
    };

    const pipesTransform = (name, value) => {
      if (name !== 'reversify') {
        throw new Error('unknown filter');
      }
      return value.split('').reverse().join('');
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: SettingsService, useValue: { get: Settings } },
        { provide: PipesService, useValue: { transform: pipesTransform } },
        { provide: FeedbackService, useValue: feedbackService },
        { provide: UHCStatsService, useValue: uhcStatsService },
        { provide: CHTScriptApiService, useValue: chtScriptApiService }
      ]
    });
    service = TestBed.inject(ContactSummaryService);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('returns empty when no script configured', () => {
    Settings.resolves({ contact_summary: '' });
    const contact = {};
    const reports = [];
    return service.get(contact, reports).then(actual => {
      expect(actual.fields.length).to.equal(0);
      expect(actual.cards.length).to.equal(0);
    });
  });

  it('evals script with `reports` and `contact` in scope', () => {
    const script = `return { fields: [
                      { label: "Notes", value: "Hello " + contact.name },
                      { label: "Num reports", value: reports.length }
                    ] };`;
    Settings.resolves({ contact_summary: script });
    const contact = { name: 'jack' };
    const reports = [ { _id: 1 }, { _id: 2} ];
    return service.get(contact, reports).then(actual => {
      expect(actual.fields.length).to.equal(2);
      expect(actual.fields[0].label).to.equal('Notes');
      expect(actual.fields[0].value).to.equal('Hello jack');
      expect(actual.fields[1].label).to.equal('Num reports');
      expect(actual.fields[1].value).to.equal(2);
      expect(actual.cards.length).to.equal(0);
    });
  });

  it('applies filters to values', () => {
    const script = `return { fields: [
                      { label: "Notes", value: "Hello", filter: "reversify" }
                    ] };`;
    Settings.resolves({ contact_summary: script });
    const contact = {};
    const reports = [];
    return service.get(contact, reports).then(actual => {
      expect(actual.fields.length).to.equal(1);
      expect(actual.fields[0].label).to.equal('Notes');
      expect(actual.fields[0].value).to.equal('olleH');
      expect(actual.cards.length).to.equal(0);
    });
  });

  it('does not crash when contact-summary function returns arrays with undefined elements #4125', () => {
    const script = `
                   return {
                     fields: [undefined],
                     cards: [undefined]
                   }
                   `;
    Settings.resolves({ contact_summary: script });
    const contact = {};
    const reports = [];
    return service.get(contact, reports).then(actual => {
      expect(actual.fields).to.deep.equal([undefined]);
      expect(actual.cards).to.deep.equal([undefined]);
    });
  });

  it('does not crash when contact-summary function returns non-array elements #4125', () => {
    const script = `
                   return {
                     fields: 'alpha',
                     cards: [{ fields: 'beta' }]
                   }
                   `;
    Settings.resolves({ contact_summary: script });
    const contact = {};
    const reports = [];
    return service.get(contact, reports).then(actual => {
      expect(actual.fields).to.be.an('array');
      expect(actual.fields.length).to.equal(0);
      expect(actual.cards).to.be.an('array');
      expect(actual.cards.length).to.equal(1);
      expect(actual.cards[0].fields).to.equal('beta');
    });
  });

  it('does crash when contact summary throws an error', () => {
    const consoleErrorMock = sinon.stub(console, 'error');
    const script = `return contact.some.field;`;
    const contact = {};
    Settings.resolves({ contact_summary: script });

    return service
      .get(contact)
      .then(() => {
        throw new Error('Expected error to be thrown');
      })
      .catch((err) => {
        expect(err.message).to.equal('Configuration error');
        expect(consoleErrorMock.callCount).to.equal(1);
        expect(consoleErrorMock.args[0][0].startsWith('Configuration error in contact-summary')).to.be.true;
        expect(feedbackService.submit.callCount).to.equal(1);
        expect(feedbackService.submit.args[0][0].startsWith('Configuration error in contact-summary')).to.be.true;
      });
  });

  it('should pass targets to the ContactSummary script', () => {
    const script = `
    return {
      fields: [contact.name, lineage[0].name],
      cards: [
        { fields: reports[0].type },
        { fields: targetDoc.date_updated }
      ],
    }
    `;

    Settings.resolves({ contact_summary: script });
    const contact = { name: 'boa' };
    const reports = [{ type: 'data' }, { type: 'record' }];
    const lineage = [{ name: 'parent' }, { name: 'grandparent' }];
    const targetDoc = { date_updated: 'yesterday', targets: [{ id: 'target', type: 'count' }] };

    return service.get(contact, reports, lineage, targetDoc).then(contactSummary => {
      expect(contactSummary).to.deep.equal({
        fields: ['boa', 'parent'],
        cards: [
          { fields: 'data' },
          { fields: 'yesterday' },
        ]
      });
    });
  });

  it('should pass stats to the ContactSummary script', async () => {
    const contact = { _id: 1 };
    const reports = [];
    const script = `
    return { fields: [
      { label: "Visits count", value: uhcStats.homeVisits.count },
      { label: "Visit goal", value: uhcStats.homeVisits.countGoal },
      { label: "Last visited", value: uhcStats.homeVisits.lastVisitedDate },
      { label: "UHC interval start date", value: uhcStats.uhcInterval.start },
      { label: "UHC interval end date", value: uhcStats.uhcInterval.end }
    ] };
    `;

    Settings.resolves({ contact_summary: script });
    uhcStatsService.getHomeVisitStats.returns({
      count: 5,
      countGoal: 10,
      lastVisitedDate: moment('2021-04-07 13:30:59.999').valueOf()
    });
    uhcStatsService.getUHCInterval.returns({
      start: moment('2021-03-26 00:00:00.000').valueOf(),
      end: moment('2021-04-25 23:59:59.999').valueOf()
    });

    const contactSummary = await service.get(contact, reports);

    expect(contactSummary).to.deep.equal({
      cards: [],
      fields: [
        { label: 'Visits count', value: 5 },
        { label: 'Visit goal', value: 10 },
        { label: 'Last visited', value: moment('2021-04-07 13:30:59.999').valueOf() },
        { label: 'UHC interval start date', value: moment('2021-03-26 00:00:00.000').valueOf() },
        { label: 'UHC interval end date', value: moment('2021-04-25 23:59:59.999').valueOf() }
      ]
    });
  });

  it('should pass the cht script api to the ContactSummary script', async () => {
    const contact = { _id: 1 };
    const reports = [];
    const script = `
    return { fields: [
      { label: "has can_edit", value: cht.v1.hasPermissions('can_edit') },
      { label: "has any can_edit or can_configure:", value: cht.v1.hasAnyPermission([['can_edit'], ['can_configure']]) }
    ] };
    `;
    chtScriptApi.v1.hasPermissions.returns(true);
    chtScriptApi.v1.hasAnyPermission.returns(false);

    Settings.resolves({ contact_summary: script });

    const contactSummary = await service.get(contact, reports);

    expect(contactSummary).to.deep.equal({
      cards: [],
      fields: [
        { label: 'has can_edit', value: true },
        { label: 'has any can_edit or can_configure:', value: false }
      ]
    });
  });
});
