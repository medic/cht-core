import { TestBed } from '@angular/core/testing';
import {
  TranslateFakeLoader,
  TranslateLoader,
  TranslateModule,
  TranslateService
} from '@ngx-translate/core';
import sinon from 'sinon';
import { expect, assert } from 'chai';
import * as moment from 'moment';

import { TargetAggregatesService } from '@mm-services/target-aggregates.service';
import { UHCSettingsService } from '@mm-services/uhc-settings.service';
import { DbService } from '@mm-services/db.service';
import { SearchService } from '@mm-services/search.service';
import { GetDataRecordsService } from '@mm-services/get-data-records.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { AuthService } from '@mm-services/auth.service';
import { SettingsService } from '@mm-services/settings.service';
import { CalendarIntervalService } from '@mm-services/calendar-interval.service';
import { TranslateFromService } from '@mm-services/translate-from.service';

describe('TargetAggregatesService', () => {
  let service: TargetAggregatesService;
  let uhcSettingsService;
  let translateFromService;
  let searchService;
  let dbService;
  let getDataRecordsService;
  let userSettingsService;
  let contactTypesService;
  let authService;
  let settingsService;
  let calendarIntervalService;
  let translateService;

  const randomString = (length?) => Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, length);
  const ratioTranslationKey = 'analytics.target.aggregates.ratio';

  beforeEach(() => {
    authService = {has: sinon.stub()};
    settingsService = {get: sinon.stub()};
    contactTypesService = {
      getTypeId: sinon.stub(),
      getChildren: sinon.stub(),
      isPersonType: sinon.stub(),
    };
    getDataRecordsService = {get: sinon.stub()};
    searchService = {search: sinon.stub()};
    userSettingsService = {get: sinon.stub()};
    dbService = {
      get: sinon.stub(),
      allDocs: sinon.stub()
    };
    uhcSettingsService = {getMonthStartDate: sinon.stub()};
    translateFromService = {get: sinon.stub()};
    calendarIntervalService = {getCurrent: sinon.stub().returns({end: 100})};

    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
      ],
      providers: [
        {provide: AuthService, useValue: authService},
        {provide: SettingsService, useValue: settingsService},
        {provide: ContactTypesService, useValue: contactTypesService},
        {provide: GetDataRecordsService, useValue: getDataRecordsService},
        {provide: SearchService, useValue: searchService},
        {provide: UserSettingsService, useValue: userSettingsService},
        {provide: DbService, useValue: dbService},
        {provide: UHCSettingsService, useValue: uhcSettingsService},
        {provide: TranslateFromService, useValue: translateFromService},
        {provide: CalendarIntervalService, useValue: calendarIntervalService},
      ]
    });
    service = TestBed.inject(TargetAggregatesService);
    translateService = TestBed.inject(TranslateService);
    dbService.get.returns(dbService);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('isEnabled', () => {
    it('should return false when user does not have permission', async () => {
      authService.has.resolves(false);

      const result = await service.isEnabled();

      expect(result).to.equal(false);
    });

    it('should return true when user has permission', async () => {
      authService.has.resolves(true);

      const result = await service.isEnabled();

      expect(result).to.equal(true);
      expect(authService.has.callCount).to.equal(1);
      expect(authService.has.args[0]).to.deep.equal(['can_aggregate_targets']);
    });
  });

  describe('getAggregates', () => {
    it('should throw error if getting settings fails', () => {
      settingsService.get.rejects({ err: 'some' });
      userSettingsService.get.resolves({ facility_id: 'aaa' });

      return service
        .getAggregates()
        .then(() => assert.isFalse('Should have thrown'))
        .catch(err => expect(err).to.deep.equal({ err: 'some' }));
    });

    it('should throw error if getting userSettings fails', () => {
      settingsService.get.resolves({ tasks: { targets: {
        items: [{
          id: 'target',
          aggregate: true,
          type: 'count'
        }]
      } } });
      userSettingsService.get.rejects({ err: 'some' });
      dbService.allDocs.resolves({ rows: [] });

      return service
        .getAggregates()
        .then(() => assert.isFalse('Should have thrown'))
        .catch(err => expect(err).to.deep.equal({ err: 'some' }));
    });

    it('should throw if no facility_id', () => {
      settingsService.get.resolves({ tasks: { targets: {
        items: [{
          id: 'target',
          aggregate: true,
          type: 'count'
        }]
      } } });
      userSettingsService.get.resolves({});
      dbService.allDocs.resolves({ rows: [] });

      return service
        .getAggregates()
        .then(() => assert.isFalse('Should have thrown'))
        .catch(err => expect(err.translationKey).to.equal('analytics.target.aggregates.error.no.contact'));
    });

    it('should throw when no home place', () => {
      settingsService.get.resolves({ tasks: { targets: {
        items: [{
          id: 'target',
          aggregate: true,
          type: 'count'
        }]
      } } });
      userSettingsService.get.resolves({ facility_id: 'home' });
      getDataRecordsService.get.withArgs('home').resolves();
      dbService.allDocs.resolves({ rows: [] });

      return service
        .getAggregates()
        .then(() => assert.isFalse('Should have thrown'))
        .catch(err => expect(err.translationKey).to.equal('analytics.target.aggregates.error.no.contact'));
    });

    it('should not search when there are no targets to aggregate', async () => {
      settingsService.get.resolves({});

      const result = await service.getAggregates();

      expect(result.length).to.equal(0);
      expect(searchService.search.callCount).to.equal(0);
      expect(dbService.allDocs.callCount).to.equal(0);
    });

    it('should search for contacts by type', async () => {
      settingsService.get.resolves({ tasks: { targets: {
        items: [{
          id: 'target',
          aggregate: true,
          type: 'count'
        }]
      } } });
      userSettingsService.get.resolves({ facility_id: 'home' });
      getDataRecordsService.get.resolves([]);
      getDataRecordsService.get.withArgs('home').resolves({ _id: 'home' });
      contactTypesService.getTypeId.returns('home_type');
      contactTypesService.getChildren.resolves([{ id: 'type1' }, { id: 'type2' }, { id: 'type3' }]);
      searchService.search.resolves([]);
      dbService.allDocs.resolves({ rows: [] });

      const result = await service.getAggregates();

      expect(result.length).to.equal(1);
      expect(result[0].id).to.equal('target');
      expect(settingsService.get.callCount).to.equal(1);
      expect(userSettingsService.get.callCount).to.equal(1);
      expect(getDataRecordsService.get.callCount).to.equal(2);
      expect(getDataRecordsService.get.args[0]).to.deep.equal(['home']);
      expect(getDataRecordsService.get.args[1]).to.deep.equal([[]]);
      expect(contactTypesService.getTypeId.callCount).to.equal(1);
      expect(contactTypesService.getTypeId.args[0]).to.deep.equal([{ _id: 'home' }]);
      expect(contactTypesService.getChildren.callCount).to.equal(1);
      expect(contactTypesService.getChildren.args[0]).to.deep.equal(['home_type']);
      expect(searchService.search.callCount).to.equal(1);
      expect(searchService.search.args[0]).to.deep.equal([
        'contacts',
        { types: { selected: ['type1', 'type2', 'type3'] } },
        { limit: 100, skip: 0 },
      ]);
    });

    it('should repeat search until all contacts are retrieved', async () => {
      settingsService.get.resolves({ tasks: { targets: {
        items: [{
          id: 'target',
          aggregate: true,
          type: 'count'
        }]
      } } });
      userSettingsService.get.resolves({ facility_id: 'home' });
      getDataRecordsService.get.resolves([]);
      getDataRecordsService.get.withArgs('home').resolves({ _id: 'home' });
      contactTypesService.getTypeId.returns('home_type');
      contactTypesService.getChildren.resolves([{ id: 'type1' }, { id: 'type2' }, { id: 'type3' }]);
      dbService.allDocs.resolves({ rows: [] });

      searchService.search.onCall(0).resolves(Array.from({ length: 100 }).map(() => ({ _id: 'place' })));
      searchService.search.onCall(1).resolves(Array.from({ length: 100 }).map(() => ({ _id: 'place' })));
      searchService.search.onCall(2).resolves(Array.from({ length: 100 }).map(() => ({ _id: 'place' })));
      searchService.search.onCall(3).resolves(Array.from({ length: 16 }).map(() => ({ _id: 'place' })));

      const result = await service.getAggregates();

      expect(result.length).to.equal(1);
      expect(result[0].id).to.equal('target');
      expect(searchService.search.callCount).to.equal(4);
      expect(searchService.search.args[0]).to.deep.equal([
        'contacts',
        { types: { selected: ['type1', 'type2', 'type3'] } },
        { limit: 100, skip: 0 },
      ]);
      expect(searchService.search.args[1]).to.deep.equal([
        'contacts',
        { types: { selected: ['type1', 'type2', 'type3'] } },
        { limit: 100, skip: 100 },
      ]);
      expect(searchService.search.args[2]).to.deep.equal([
        'contacts',
        { types: { selected: ['type1', 'type2', 'type3'] } },
        { limit: 100, skip: 200 },
      ]);
      expect(searchService.search.args[3]).to.deep.equal([
        'contacts',
        { types: { selected: ['type1', 'type2', 'type3'] } },
        { limit: 100, skip: 300 },
      ]);
    });

    it('should get the primary contacts of the places directly under the users home place and sort ' +
      'them alphabetically', async () => {
      settingsService.get.resolves({
        tasks: { targets: { items: [{ id: 'target', aggregate: true, type: 'count' }] } }
      });
      userSettingsService.get.resolves({ facility_id: 'home' });
      getDataRecordsService.get.withArgs('home').resolves({ _id: 'home' });
      contactTypesService.getTypeId.returns('home_type');
      contactTypesService.getChildren.resolves([{ id: 'type1' }, { id: 'type2' }]);

      const places = Array.from({ length: 224 }).map((a, i) => ({ lineage: ['home'], contact: `contact${i}` }));
      const contacts = places.map(place => ({ _id: place.contact, name: randomString() }));
      searchService.search.onCall(0).resolves(places.slice(0, 100));
      searchService.search.onCall(1).resolves(places.slice(100, 200));
      searchService.search.onCall(2).resolves(places.slice(200, 300));
      getDataRecordsService.get.withArgs(sinon.match.array).onCall(0).resolves(contacts.slice(0, 100));
      getDataRecordsService.get.withArgs(sinon.match.array).onCall(1).resolves(contacts.slice(100, 200));
      getDataRecordsService.get.withArgs(sinon.match.array).onCall(2).resolves(contacts.slice(200, 300));

      const targetDocs = contacts.map(contact => ({
        owner: contact._id,
        targets: [
          { id: 'target', value: { pass: 0, total: 0 } },
        ],
      }));
      dbService.allDocs.resolves({ rows: targetDocs.map(doc => ({ doc })) });

      const result = await service.getAggregates();

      expect(result.length).to.equal(1);
      expect(result[0].id).to.equal('target');
      expect(result[0].values.length).to.equal(contacts.length);

      const alphabeticalContacts = contacts.sort((a, b) => a.name > b.name ? 1 : -1);
      expect(result[0].values).to.deep.equal(
        alphabeticalContacts.map(contact => ({ contact, value: { pass: 0, total: 0, percent: 0 } }))
      );

      expect(searchService.search.callCount).to.equal(3);
      expect(searchService.search.args[0]).to.deep.equal([
        'contacts',
        { types: { selected: ['type1', 'type2'] } },
        { limit: 100, skip: 0 },
      ]);
      expect(searchService.search.args[1]).to.deep.equal([
        'contacts',
        { types: { selected: ['type1', 'type2'] } },
        { limit: 100, skip: 100 },
      ]);
      expect(searchService.search.args[2]).to.deep.equal([
        'contacts',
        { types: { selected: ['type1', 'type2'] } },
        { limit: 100, skip: 200 },
      ]);

      expect(getDataRecordsService.get.callCount).to.equal(4);
      expect(getDataRecordsService.get.args[0]).to.deep.equal(['home']);
      expect(getDataRecordsService.get.args[1]).to.deep.equal([places.slice(0, 100).map(place => place.contact)]);
      expect(getDataRecordsService.get.args[2]).to.deep.equal([places.slice(100, 200).map(place => place.contact)]);
      expect(getDataRecordsService.get.args[3]).to.deep.equal([places.slice(200, 300).map(place => place.contact)]);
    });

    it('should discard contacts that are not under the parent place or that have no contact', async () => {
      settingsService.get.resolves({
        tasks: { targets: { items: [{ id: 'target', aggregate: true, type: 'count' }] } }
      });
      userSettingsService.get.resolves({ facility_id: 'home' });
      getDataRecordsService.get.withArgs('home').resolves({ _id: 'home' });
      contactTypesService.getTypeId.returns('home_type');
      contactTypesService.getChildren.resolves([{ id: 'type1' }]);

      const randomBoolean = () => Math.random() < 0.5;
      const genPlace = (idx) => ({
        contact: randomBoolean() ? `contact${idx}`: '',
        lineage: [randomBoolean() ? 'home': 'other'],
      });
      const oneDifferentPlace = { contact: '', lineage: [] };
      const genContact = (id) => ({ _id: id, name: randomString() });
      // at least one place will be discarded
      const places = Array.from({ length: 265 }).map((a, i) => i && genPlace(i) || oneDifferentPlace);
      const contacts: { _id: any; name: string }[] = [];
      getDataRecordsService.get.withArgs(sinon.match.array).callsFake(contactIds => {
        const responseContacts = contactIds.map(genContact);
        contacts.push(...responseContacts);
        return Promise.resolve(responseContacts);
      });
      dbService.allDocs.resolves({ rows: [] });

      searchService.search.onCall(0).resolves(places.slice(0, 100));
      searchService.search.onCall(1).resolves(places.slice(100, 200));
      searchService.search.onCall(2).resolves(places.slice(200, 300));

      const isRelevantPlace = place => place.lineage[0] === 'home' && place.contact;

      const result = await service.getAggregates();

      expect(result.length).to.equal(1);
      expect(result[0].id).to.equal('target');
      expect(result[0].values.length).to.equal(contacts.length);
      expect(result[0].values.length).not.to.equal(places.length); // we always have at least one place skipped

      const sortedContacts = contacts.sort((a, b) => a.name > b.name ? 1 : -1);
      expect(result[0].values).to.deep.equal(
        sortedContacts.map(contact => ({ contact, value: { pass: 0, total: 0, percent: 0, placeholder: true } }))
      );

      const relevantPlaces = places.filter(isRelevantPlace);
      // target contacts correspond to relevant places retrieved with Search
      expect(result[0].values.map(v => v.contact._id)).to.have.members(relevantPlaces.map(p => p.contact));

      expect(searchService.search.callCount).to.equal(3);
      expect(searchService.search.args[0]).to.deep.equal([
        'contacts',
        { types: { selected: ['type1'] } },
        { limit: 100, skip: 0 },
      ]);
      expect(searchService.search.args[1]).to.deep.equal([
        'contacts',
        { types: { selected: ['type1'] } },
        { limit: 100, skip: 100 },
      ]);
      expect(searchService.search.args[2]).to.deep.equal([
        'contacts',
        { types: { selected: ['type1'] } },
        { limit: 100, skip: 200 },
      ]);

      expect(getDataRecordsService.get.callCount).to.equal(4);
      expect(getDataRecordsService.get.args[0]).to.deep.equal(['home']);
      expect(getDataRecordsService.get.args[1]).to.deep.equal([
        places.slice(0, 100).filter(isRelevantPlace).map(place => place.contact)
      ]);
      expect(getDataRecordsService.get.args[2]).to.deep.equal([
        places.slice(100, 200).filter(isRelevantPlace).map(place => place.contact)
      ]);
      expect(getDataRecordsService.get.args[3]).to.deep.equal([
        places.slice(200, 300).filter(isRelevantPlace).map(place => place.contact)
      ]);
    });

    it('should exclude person types from places search', async () => {
      settingsService.get.resolves({
        tasks: { targets: { items: [{ id: 'target', aggregate: true, type: 'count' }] } }
      });
      userSettingsService.get.resolves({ facility_id: 'home' });
      getDataRecordsService.get.withArgs('home').resolves({ _id: 'home' });
      contactTypesService.getTypeId.returns('home_type');
      contactTypesService.getChildren.resolves([{ id: 'type1' }, { id: 'person' }, { id: 'person2' }, { id: 'type2' }]);
      contactTypesService.isPersonType.callsFake(type => type.id.startsWith('person'));

      searchService.search.resolves([]);
      getDataRecordsService.get.withArgs(sinon.match.array).resolves([]);
      dbService.allDocs.resolves({ rows: [] });

      const result = await service.getAggregates();

      expect(result.length).to.equal(1);
      expect(result[0].id).to.equal('target');
      expect(result[0].values.length).to.equal(0);
      expect(contactTypesService.isPersonType.callCount).to.equal(4);
      expect(contactTypesService.isPersonType.args).to.deep.equal([
        [{ id: 'type1' }],
        [{ id: 'person' }],
        [{ id: 'person2' }],
        [{ id: 'type2' }],
      ]);
      expect(searchService.search.callCount).to.equal(1);
      expect(searchService.search.args[0]).to.deep.equal([
        'contacts',
        { types: { selected: ['type1', 'type2'] } },
        { limit: 100, skip: 0 },
      ]);
      expect(getDataRecordsService.get.callCount).to.equal(2);
      expect(getDataRecordsService.get.args[0]).to.deep.equal(['home']);
      expect(getDataRecordsService.get.args[1]).to.deep.equal([[]]);
    });

    it('should not run search is there are no available types', async () => {
      settingsService.get.resolves({
        tasks: { targets: { items: [{ id: 'target', aggregate: true, type: 'count' }] } }
      });
      userSettingsService.get.resolves({ facility_id: 'home' });
      getDataRecordsService.get.withArgs('home').resolves({ _id: 'home' });
      contactTypesService.getTypeId.returns('home_type');
      contactTypesService.getChildren.resolves([{ id: 'person' }, { id: 'person2' }]);
      contactTypesService.isPersonType.callsFake(type => type.id.startsWith('person'));

      dbService.allDocs.resolves({ rows: [] });

      const result = await service.getAggregates();

      expect(result.length).to.equal(1);
      expect(result[0].id).to.equal('target');
      expect(result[0].values.length).to.equal(0);
      expect(contactTypesService.isPersonType.callCount).to.equal(2);
      expect(contactTypesService.isPersonType.args).to.deep.equal([
        [{ id: 'person' }],
        [{ id: 'person2' }],
      ]);
      expect(searchService.search.callCount).to.equal(0);
      expect(getDataRecordsService.get.callCount).to.equal(1);
      expect(getDataRecordsService.get.args[0]).to.deep.equal(['home']);
    });

    it('should fetch correct latest target docs', async () => {
      const config = { tasks: { targets: { items: [{ id: 'target', aggregate: true, type: 'count' }] } }};
      settingsService.get.resolves(config);

      userSettingsService.get.resolves({ facility_id: 'home' });
      getDataRecordsService.get.withArgs('home').resolves({ _id: 'home' });
      contactTypesService.getTypeId.returns('home_type');
      contactTypesService.getChildren.resolves([{ id: 'type1' }]);
      getDataRecordsService.get.withArgs(sinon.match.array).resolves([]);
      searchService.search.resolves([]);

      dbService.allDocs.resolves({ rows: [] });

      uhcSettingsService.getMonthStartDate.returns(12);
      calendarIntervalService.getCurrent.returns({
        start: moment('2019-05-12').valueOf(),
        end: moment('2019-06-11').valueOf(),
      });

      const result = await service.getAggregates();

      expect(result.length).to.equal(1);
      expect(result[0].id).to.equal('target');
      expect(result[0].values.length).to.equal(0);

      expect(dbService.allDocs.callCount).to.equal(1);
      expect(dbService.allDocs.args[0]).to.deep.equal([{
        start_key: 'target~2019-06~',
        end_key: 'target~2019-06~\ufff0',
        include_docs: true
      }]);
      expect(uhcSettingsService.getMonthStartDate.callCount).to.equal(1);
      expect(uhcSettingsService.getMonthStartDate.args[0]).to.deep.equal([config]);
      expect(calendarIntervalService.getCurrent.callCount).to.equal(1);
      expect(calendarIntervalService.getCurrent.args[0]).to.deep.equal([12]);
    });

    it('should exclude non-aggregable targets and hydrate aggregates', async () => {
      const config = { tasks: { targets: { items: [
        { id: 'target1', aggregate: true, type: 'count', title: 'target1' },
        { id: 'target2', aggregate: false, type: 'count', translation_key: 'target2' },
        { id: 'target3', aggregate: true, type: 'count', goal: 20, title: 'target3' },
        { id: 'target4', aggregate: true, type: 'percent', goal: -1, translation_key: 'target4' },
        { id: 'target5', aggregate: true, type: 'percent', goal: 80, title: 'target5' },
      ] } }};
      translateService.instant = sinon.stub().returnsArg(0);
      settingsService.get.resolves(config);
      userSettingsService.get.resolves({ facility_id: 'home' });
      getDataRecordsService.get.withArgs('home').resolves({ _id: 'home' });
      contactTypesService.getTypeId.returns('home_type');
      contactTypesService.getChildren.resolves([{ id: 'type1' }]);
      getDataRecordsService.get.withArgs(sinon.match.array).resolves([]);
      searchService.search.resolves([]);
      translateFromService.get.callsFake(e => e);
      dbService.allDocs.resolves({ rows: [] });

      const result = await service.getAggregates();

      expect(result.length).to.equal(4);
      expect(result[0]).to.deep.equal({
        id: 'target1',
        aggregate: true,
        type: 'count',
        title: 'target1',
        values: [],
        hasGoal: false,
        isPercent: false,
        progressBar: false,
        heading: 'target1',
        aggregateValue: { pass:0, total: 0, hasGoal: false, summary: 0 },
      });
      expect(result[1]).to.deep.equal({
        id: 'target3',
        aggregate: true,
        type: 'count',
        title: 'target3',
        goal: 20,
        values: [],
        hasGoal: true,
        isPercent: false,
        progressBar: true,
        heading: 'target3',
        // goalMet is true because 0 out of 0 chws have achieved the goal
        aggregateValue: { pass:0, total: 0, goalMet: true, hasGoal: true, summary: ratioTranslationKey },
      });
      expect(result[2]).to.deep.equal({
        id: 'target4',
        aggregate: true,
        type: 'percent',
        translation_key: 'target4',
        goal: -1,
        values: [],
        hasGoal: false,
        isPercent: true,
        progressBar: true,
        heading: 'target4',
        aggregateValue: { pass:0, total: 0, percent: 0, hasGoal: false, summary: '0%' },
      });
      expect(result[3]).to.deep.equal({
        id: 'target5',
        aggregate: true,
        type: 'percent',
        goal: 80,
        title: 'target5',
        values: [],
        hasGoal: true,
        isPercent: true,
        progressBar: true,
        heading: 'target5',
        aggregateValue: { pass:0, total: 0, goalMet: true, hasGoal: true, summary: ratioTranslationKey },
      });
    });

    it('should calculate every type of target aggregate correctly', async () => {
      const config = { tasks: { targets: { items: [
        { id: 'target1', aggregate: true, type: 'count', title: 'target1' },
        { id: 'target2', aggregate: true, type: 'count', goal: 20, translation_key: 'target2' },
        { id: 'target3', aggregate: true, type: 'percent', goal: -1, title: 'target3' },
        { id: 'target4', aggregate: true, type: 'percent', goal: 80, translation_key: 'target4' },
        { id: 'target5', aggregate: true, type: 'count', goal: 2, translation_key: 'target5' },
      ] } }};

      const targetDocs = [
        {
          id: 'target~2019-06~user1',
          owner: 'user1',
          targets: [
            { id: 'target1', value: { pass: 10, total: 10 } },
            { id: 'target2', value: { pass: 12, total: 12 } },
            { id: 'target3', value: { pass: 15, total: 30 } },
            { id: 'target4', value: { pass: 16, total: 21 } },
            { id: 'target5', value: { pass: 3, total: 3 } },
          ],
        },
        {
          id: 'target~2019-06~user2',
          owner: 'user2',
          targets: [
            { id: 'target1', value: { pass: 16, total: 16 } },
            { id: 'target2', value: { pass: 5, total: 5 } },
            { id: 'target3', value: { pass: 5, total: 21 } },
            { id: 'target4', value: { pass: 18, total: 20 } },
            { id: 'target5', value: { pass: 4, total: 4 } },
          ],
        },
        {
          id: 'target~2019-06~user3',
          owner: 'user3',
          targets: [
            { id: 'target1', value: { pass: 0, total: 0 } },
            { id: 'target2', value: { pass: 22, total: 22 } },
            { id: 'target3', value: { pass: 0, total: 0 } },
            { id: 'target4', value: { pass: 0, total: 0 } },
            { id: 'target5', value: { pass: 7, total: 7 } },
          ],
        },
      ];

      const contacts = [
        { _id: 'user1', name: 'user1' },
        { _id: 'user2', name: 'user2' },
        { _id: 'user3', name: 'user3' },
      ];

      settingsService.get.resolves(config);
      userSettingsService.get.resolves({ facility_id: 'home' });
      getDataRecordsService.get.withArgs('home').resolves({ _id: 'home' });
      contactTypesService.getTypeId.returns('home_type');
      contactTypesService.getChildren.resolves([{ id: 'type1' }]);
      getDataRecordsService.get.withArgs(sinon.match.array).resolves(contacts);
      searchService.search.resolves([]);
      dbService.allDocs.resolves({ rows: targetDocs.map(doc => ({ doc })) });
      translateService.instant = sinon.stub().returnsArg(0);
      translateFromService.get.returnsArg(0);

      const result = await service.getAggregates();

      expect(result.length).to.equal(5);
      expect(translateService.instant.callCount).to.equal(6);
      expect(translateService.instant.withArgs('target2').callCount).to.equal(1);
      expect(translateService.instant.withArgs('target4').callCount).to.equal(1);
      expect(translateService.instant.withArgs('target5').callCount).to.equal(1);
      expect(translateService.instant.withArgs(ratioTranslationKey).callCount).to.equal(3);
      expect(translateService.instant.withArgs(ratioTranslationKey)
        .args[0][1]).to.deep.include({ pass: 1, total: 3 });
      expect(translateService.instant.withArgs(ratioTranslationKey)
        .args[1][1]).to.deep.include({ pass: 1, total: 3 });
      expect(translateFromService.get.callCount).to.equal(2);
      expect(translateFromService.get.args).to.deep.equal([['target1'], ['target3']]);

      expect(result[0]).to.deep.equal({
        id: 'target1',
        aggregate: true,
        type: 'count',
        title: 'target1',
        aggregateValue: { pass: 26, total: 26, hasGoal: false, summary: 26 },
        heading: 'target1',
        hasGoal: false,
        isPercent: false,
        progressBar: false,
        values: [
          { contact: contacts[0], value: { pass: 10, total: 10, percent: 0 } },
          { contact: contacts[1], value: { pass: 16, total: 16, percent: 0 } },
          { contact: contacts[2], value: { pass: 0, total: 0, percent: 0 } },
        ]
      });
      expect(result[1]).to.deep.equal({
        id: 'target2',
        aggregate: true,
        type: 'count',
        goal: 20,
        translation_key: 'target2',
        aggregateValue: { pass: 1, total: 3, goalMet: false, hasGoal: true, summary: ratioTranslationKey },
        heading: 'target2',
        hasGoal: true,
        isPercent: false,
        progressBar: true,
        values: [
          { contact: contacts[0], value: { pass: 12, total: 12, percent: 60, goalMet: false } },
          { contact: contacts[1], value: { pass: 5, total: 5, percent: 25, goalMet: false } },
          { contact: contacts[2], value: { pass: 22, total: 22, percent: 110, goalMet: true } },
        ],
      });
      expect(result[2]).to.deep.equal({
        id: 'target3',
        aggregate: true,
        type: 'percent',
        goal: -1,
        title: 'target3',
        aggregateValue: { pass: 20, total: 51, percent: 39, hasGoal: false, summary: '39%' },
        heading: 'target3',
        hasGoal: false,
        isPercent: true,
        progressBar: true,
        values: [
          { contact: contacts[0], value: { pass: 15, total: 30, percent: 50 } },
          { contact: contacts[1], value: { pass: 5, total: 21, percent: 24 } },
          { contact: contacts[2], value: { pass: 0, total: 0, percent: 0 } },
        ],
      });
      expect(result[3]).to.deep.equal({
        id: 'target4',
        aggregate: true,
        type: 'percent',
        translation_key: 'target4',
        goal: 80,
        aggregateValue: { pass: 1, total: 3, goalMet: false, hasGoal: true, summary: ratioTranslationKey },
        heading: 'target4',
        hasGoal: true,
        isPercent: true,
        progressBar: true,
        values: [
          { contact: contacts[0], value: { pass: 16, total: 21, percent: 76, goalMet: false } },
          { contact: contacts[1], value: { pass: 18, total: 20, percent: 90, goalMet: true } },
          { contact: contacts[2], value: { pass: 0, total: 0, percent: 0, goalMet: false } },
        ],
      });
      expect(result[4]).to.deep.equal({
        id: 'target5',
        aggregate: true,
        type: 'count',
        goal: 2,
        translation_key: 'target5',
        aggregateValue: { pass: 3, total: 3, goalMet: true, hasGoal: true, summary: ratioTranslationKey },
        heading: 'target5',
        hasGoal: true,
        isPercent: false,
        progressBar: true,
        values: [
          { contact: contacts[0], value: { pass: 3, total: 3, percent: 150, goalMet: true } },
          { contact: contacts[1], value: { pass: 4, total: 4, percent: 200, goalMet: true } },
          { contact: contacts[2], value: { pass: 7, total: 7, percent: 350, goalMet: true } },
        ],
      });
    });

    it('should exclude targets from other contacts', async () => {
      const config = { tasks: { targets: { items: [ { id: 'target1', aggregate: true, type: 'count' } ] } }};

      const targetDocs = [
        {
          id: 'target~2019-06~user1',
          owner: 'user1',
          targets: [ { id: 'target1', value: { pass: 10, total: 10 } } ],
        },
        {
          id: 'target~2019-06~user2',
          owner: 'user2',
          targets: [ { id: 'target1', value: { pass: 16, total: 16 } } ],
        },
        {
          id: 'target~2019-06~user3',
          owner: 'user3',
          targets: [ { id: 'target1', value: { pass: 9, total: 9 } } ],
        },
      ];

      const contacts = [
        { _id: 'user1', name: 'user1' },
        { _id: 'user3', name: 'user3' },
      ];

      settingsService.get.resolves(config);
      userSettingsService.get.resolves({ facility_id: 'home' });
      getDataRecordsService.get.withArgs('home').resolves({ _id: 'home' });
      contactTypesService.getTypeId.returns('home_type');
      contactTypesService.getChildren.resolves([{ id: 'type1' }]);
      getDataRecordsService.get.withArgs(sinon.match.array).resolves(contacts);
      searchService.search.resolves([]);

      dbService.allDocs.resolves({ rows: targetDocs.map(doc => ({ doc })) });

      const result = await service.getAggregates();

      expect(result.length).to.equal(1);
      expect(result[0]).to.deep.equal({
        id: 'target1',
        aggregate: true,
        type: 'count',
        aggregateValue: { pass: 19, total: 19, hasGoal: false, summary: 19 },
        heading: undefined,
        hasGoal: false,
        isPercent: false,
        progressBar: false,
        values: [
          { contact: contacts[0], value: { pass: 10, total: 10, percent: 0 } },
          { contact: contacts[1], value: { pass: 9, total: 9, percent: 0 } },
        ]
      });
    });

    it('should create placeholders for missing targets and missing target values', async () => {
      const config = { tasks: { targets: { items: [
        { id: 'target1', aggregate: true, type: 'count' },
        { id: 'target2', aggregate: true, type: 'percent' },
      ] } }};

      const targetDocs = [
        {
          id: 'target~2019-06~user1',
          owner: 'user1',
          targets: [
            { id: 'target1', value: { pass: 10, total: 10 } }
          ],
        },
        {
          id: 'target~2019-06~user3',
          owner: 'user3',
          targets: [
            { id: 'target1', value: { pass: 17, total: 17 } },
            { id: 'target2', value: { pass: 10, total: 15 } },
          ],
        },
      ];

      const contacts = [
        { _id: 'user1', name: 'user1' },
        { _id: 'user2', name: 'user2' },
        { _id: 'user3', name: 'user3' },
      ];

      settingsService.get.resolves(config);
      userSettingsService.get.resolves({ facility_id: 'home' });
      getDataRecordsService.get.withArgs('home').resolves({ _id: 'home' });
      contactTypesService.getTypeId.returns('home_type');
      contactTypesService.getChildren.resolves([{ id: 'type1' }]);
      getDataRecordsService.get.withArgs(sinon.match.array).resolves(contacts);
      searchService.search.resolves([]);

      dbService.allDocs.resolves({ rows: targetDocs.map(doc => ({ doc })) });

      const result = await service.getAggregates();

      expect(result.length).to.equal(2);
      expect(result[0]).to.deep.equal({
        id: 'target1',
        aggregate: true,
        type: 'count',
        aggregateValue: { pass: 27, total: 27, hasGoal: false, summary: 27 },
        heading: undefined,
        hasGoal: false,
        isPercent: false,
        progressBar: false,
        values: [
          { contact: contacts[0], value: { pass: 10, total: 10, percent: 0 } },
          { contact: contacts[1], value: { pass: 0, total: 0, percent: 0, placeholder: true } },
          { contact: contacts[2], value: { pass: 17, total: 17, percent: 0 } },
        ]
      });

      expect(result[1]).to.deep.equal({
        id: 'target2',
        aggregate: true,
        type: 'percent',
        aggregateValue: { pass: 10, total: 15, percent: 67, hasGoal: false, summary: '67%' },
        heading: undefined,
        hasGoal: false,
        isPercent: true,
        progressBar: true,
        values: [
          { contact: contacts[0], value: { pass: 0, total: 0, percent: 0, placeholder: true } },
          { contact: contacts[1], value: { pass: 0, total: 0, percent: 0, placeholder: true } },
          { contact: contacts[2], value: { pass: 10, total: 15, percent: 67 } },
        ]
      });
    });

    it('should only process one target doc per contact', async () => {
      const config = { tasks: { targets: { items: [
        { id: 'target1', aggregate: true, type: 'count' },
        { id: 'target2', aggregate: true, type: 'percent' },
      ] } }};

      const targetDocs = [
        {
          id: 'target~2019-06~user1',
          owner: 'user1',
          targets: [
            { id: 'target1', value: { pass: 10, total: 10 } }
          ],
        },
        {
          id: 'target~2019-06~user1',
          owner: 'user1',
          targets: [
            { id: 'target1', value: { pass: 17, total: 17 } },
            { id: 'target2', value: { pass: 10, total: 15 } },
          ],
        },
        {
          id: 'target~2019-06~user1',
          owner: 'user1',
          targets: [
            { id: 'target1', value: { pass: 21, total: 21 } },
            { id: 'target2', value: { pass: 11, total: 22 } },
          ],
        },
      ];

      const contacts = [
        { _id: 'user1', name: 'user1' },
      ];

      settingsService.get.resolves(config);
      userSettingsService.get.resolves({ facility_id: 'home' });
      getDataRecordsService.get.withArgs('home').resolves({ _id: 'home' });
      contactTypesService.getTypeId.returns('home_type');
      contactTypesService.getChildren.resolves([{ id: 'type1' }]);
      getDataRecordsService.get.withArgs(sinon.match.array).resolves(contacts);
      searchService.search.resolves([]);

      dbService.allDocs.resolves({ rows: targetDocs.map(doc => ({ doc })) });

      const result = await service.getAggregates();

      expect(result.length).to.equal(2);
      expect(result[0]).to.deep.equal({
        id: 'target1',
        aggregate: true,
        type: 'count',
        aggregateValue: { pass: 10, total: 10, hasGoal: false, summary: 10 },
        heading: undefined,
        hasGoal: false,
        isPercent: false,
        progressBar: false,
        values: [
          { contact: contacts[0], value: { pass: 10, total: 10, percent: 0 } },
        ]
      });

      expect(result[1]).to.deep.equal({
        id: 'target2',
        aggregate: true,
        type: 'percent',
        aggregateValue: { pass: 0, total: 0, percent: 0, hasGoal: false, summary: '0%' },
        heading: undefined,
        hasGoal: false,
        isPercent: true,
        progressBar: true,
        values: [
          { contact: contacts[0], value: { pass: 0, total: 0, percent: 0, placeholder: true } },
        ]
      });
    });

    it('should discard additional target values from target docs', async () => {
      const config = { tasks: { targets: { items: [
        { id: 'target1', aggregate: true, type: 'count' },
        { id: 'target2', aggregate: true, type: 'percent' },
      ] } }};

      const targetDocs = [
        {
          id: 'target~2019-06~user2',
          owner: 'user1',
          targets: [
            { id: 'target1', value: { pass: 10, total: 10 } },
            { id: 'target2', value: { pass: 10, total: 10 } },
            { id: 'target3', value: { pass: 13, total: 13 } }, // not an aggregate
            { id: 'target4', value: { pass: 22, total: 33 } }, // removed target
          ],
        },
        {
          id: 'target~2019-06~user2',
          owner: 'user2',
          targets: [
            { id: 'target1', value: { pass: 15, total: 15 } },
            { id: 'target2', value: { pass: 7, total: 7 } },
            { id: 'target3', value: { pass: 13, total: 22 } }, // not an aggregate
            { id: 'target4', value: { pass: 22, total: 23 } }, // removed target
          ],
        },
      ];

      const contacts = [
        { _id: 'user1', name: 'user1' },
        { _id: 'user2', name: 'user2' },
      ];

      settingsService.get.resolves(config);
      userSettingsService.get.resolves({ facility_id: 'home' });
      getDataRecordsService.get.withArgs('home').resolves({ _id: 'home' });
      contactTypesService.getTypeId.returns('home_type');
      contactTypesService.getChildren.resolves([{ id: 'type1' }]);
      getDataRecordsService.get.withArgs(sinon.match.array).resolves(contacts);
      searchService.search.resolves([]);

      dbService.allDocs.resolves({ rows: targetDocs.map(doc => ({ doc })) });

      const result = await service.getAggregates();

      expect(result.length).to.equal(2);
      expect(result[0]).to.deep.equal({
        id: 'target1',
        aggregate: true,
        type: 'count',
        aggregateValue: { pass: 25, total: 25, hasGoal: false, summary: 25 },
        heading: undefined,
        hasGoal: false,
        isPercent: false,
        progressBar: false,
        values: [
          { contact: contacts[0], value: { pass: 10, total: 10, percent: 0 } },
          { contact: contacts[1], value: { pass: 15, total: 15, percent: 0 } },
        ]
      });

      expect(result[1]).to.deep.equal({
        id: 'target2',
        aggregate: true,
        type: 'percent',
        aggregateValue: { pass: 17, total: 17, percent: 100, hasGoal: false, summary: '100%' },
        heading: undefined,
        hasGoal: false,
        isPercent: true,
        progressBar: true,
        values: [
          { contact: contacts[0], value: { pass: 10, total: 10, percent: 100 } },
          { contact: contacts[1], value: { pass: 7, total: 7, percent: 100 } },
        ]
      });
    });
  });

  describe('getAggregateDetails', () => {
    it('should return nothing when no targetId or aggregates provided', () => {
      expect(service.getAggregateDetails()).to.equal(undefined);
      expect(service.getAggregateDetails(false, [])).to.equal(undefined);
      expect(service.getAggregateDetails('id')).to.equal(undefined);
    });

    it('should return nothing when target not found', () => {
      const aggregates = [
        { id: 'a', values: [], type: 'percent' },
        { id: 'b', values: [], type: 'count', goal: 2 },
        { id: 'c', values: [] },
      ];

      expect(service.getAggregateDetails('o', aggregates)).to.equal(undefined);
    });

    it('should return the correct aggregate', () => {
      const aggregates = [
        { id: 'a', values: [], type: 'percent' },
        { id: 'b', values: [], type: 'count', goal: 2 },
        { id: 'c', values: [] },
      ];

      expect(service.getAggregateDetails('b', aggregates))
        .to.deep.equal({ id: 'b', values: [], type: 'count', goal: 2 });
    });
  });

  describe('getCurrentTargetDoc', () => {
    it('should do nothing when no contact uuid', () => {
      return Promise
        .all([
          service.getCurrentTargetDoc(),
          service.getCurrentTargetDoc({}),
          service.getCurrentTargetDoc(''),
        ])
        .then(results => {
          expect(results).to.deep.equal([undefined, undefined, undefined]);
        });
    });

    it('should throw when getting settings fails', () => {
      settingsService.get.rejects({ some: 'err' });

      return service
        .getCurrentTargetDoc('uuid')
        .then(() => assert.isFalse('Should have thrown'))
        .catch(err => expect(err).to.deep.equal({ some: 'err' }));
    });

    it('should fetch latest target doc ', async () => {
      const config = { tasks: { targets: { items: [
        { id: 'target1', aggregate: true, type: 'count' },
        { id: 'target2', aggregate: false, type: 'percent' },
        { id: 'target3', type: 'count', goal: 22, translation_key: 'my target' },
      ] } } };
      settingsService.get.resolves(config);
      uhcSettingsService.getMonthStartDate.returns(20);
      calendarIntervalService.getCurrent.returns({
        start: moment('2020-01-20').valueOf(),
        end: moment('2020-02-20').valueOf(),
      });

      const targetDoc = {
        _id: 'target~2020-02~uuid~username',
        owner: 'uuid',
        updated_date: 100,
        reporting_period: '2020-02',
        targets: [
          { id: 'target1', value: { pass: 5, total: 5 } },
          { id: 'target2', value: { pass: 12, total: 21 } },
          { id: 'target3', value: { pass: 8, total: 8 } },
        ]
      };

      dbService.allDocs.resolves({ rows: [{ doc: targetDoc }] });

      const result = await service.getCurrentTargetDoc('uuid');

      expect(result).to.deep.equal({
        _id: 'target~2020-02~uuid~username',
        owner: 'uuid',
        updated_date: 100,
        reporting_period: '2020-02',
        targets: [
          { id: 'target1', value: { pass: 5, total: 5 }, aggregate: true, type: 'count' },
          { id: 'target2', value: { pass: 12, total: 21 }, aggregate: false, type: 'percent' },
          { id: 'target3', value: { pass: 8, total: 8 }, type: 'count', goal: 22, translation_key: 'my target' },
        ]
      });

      expect(uhcSettingsService.getMonthStartDate.callCount).to.equal(1);
      expect(uhcSettingsService.getMonthStartDate.args[0]).to.deep.equal([config]);
      expect(calendarIntervalService.getCurrent.callCount).to.equal(1);
      expect(calendarIntervalService.getCurrent.args[0]).to.deep.equal([20]);

      expect(dbService.allDocs.callCount).to.equal(1);
      expect(dbService.allDocs.args[0]).to.deep.equal([{
        start_key: 'target~2020-02~uuid~',
        end_key: 'target~2020-02~uuid~\ufff0',
        include_docs: true,
      }]);
    });

    it('should discard additional target docs', async () => {
      const config = { tasks: { targets: { items: [
        { id: 'target1', aggregate: true, type: 'count' },
      ] } } };
      settingsService.get.resolves(config);

      const targetDocs = [
        {
          _id: 'target~2020-02~uuid~username1',
          owner: 'uuid',
          targets: [ { id: 'target1', value: { pass: 5, total: 5 } } ]
        },
        {
          _id: 'target~2020-02~uuid~username2',
          owner: 'uuid',
          targets: [ { id: 'target1', value: { pass: 15, total: 15 } } ]
        },
        {
          _id: 'target~2020-02~uuid~username3',
          owner: 'uuid',
          targets: [ { id: 'target1', value: { pass: 25, total: 25 } } ]
        },
      ];

      dbService.allDocs.resolves({ rows: targetDocs.map(doc => ({ doc })) });

      const result = await service.getCurrentTargetDoc('uuid');

      expect(result).to.deep.equal({
        _id: 'target~2020-02~uuid~username1',
        owner: 'uuid',
        targets: [ { id: 'target1', value: { pass: 5, total: 5 }, aggregate: true, type: 'count' }]
      });
    });

    it('should ignore targets that are not configured', async () => {
      const config = { tasks: { targets: { items: [
        { id: 'target1', aggregate: true, type: 'count' },
        { id: 'target2', aggregate: false, type: 'percent' },
      ] } } };
      settingsService.get.resolves(config);

      const targetDocs = [
        {
          _id: 'target~2020-02~uuid~username1',
          owner: 'uuid',
          targets: [
            { id: 'target1', value: { pass: 5, total: 5 } },
            { id: 'target2', value: { pass: 10, total: 10 } },
            { id: 'target3', value: { pass: 12, total: 12 } },
            { id: 'target4', value: { pass: 18, total: 18 } },
          ]
        },
      ];

      dbService.allDocs.resolves({ rows: targetDocs.map(doc => ({ doc })) });

      const result = await service.getCurrentTargetDoc('uuid');

      expect(result).to.deep.equal({
        _id: 'target~2020-02~uuid~username1',
        owner: 'uuid',
        targets: [
          { id: 'target1', value: { pass: 5, total: 5 }, aggregate: true, type: 'count' },
          { id: 'target2', value: { pass: 10, total: 10 }, aggregate: false, type: 'percent' },
          { id: 'target3', value: { pass: 12, total: 12 } },
          { id: 'target4', value: { pass: 18, total: 18 } },
        ]
      });
    });
  });

});
