describe('TargetAggregates service', () => {

  'use strict';

  let service;
  let auth;
  let calendarInterval;
  let contactTypes;
  let db;
  let getDataRecords;
  let search;
  let settings;
  let uhcSettings;
  let userSettings;
  let translateInstant;
  let translateFrom;

  const randomString = (length) => Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, length);
  const ratioTranslationKey = 'analytics.target.aggregates.ratio';

  beforeEach(() => {
    module('inboxApp');

    auth = { has: sinon.stub() };
    settings = sinon.stub();
    contactTypes = {
      getTypeId: sinon.stub(),
      getChildren: sinon.stub(),
      isPersonType: sinon.stub(),
    };
    getDataRecords = sinon.stub();
    search = sinon.stub();
    userSettings = sinon.stub();
    db = { allDocs: sinon.stub() };
    uhcSettings = { getMonthStartDate: sinon.stub() };
    calendarInterval = { getCurrent: sinon.stub().returns({ end: 100 }) };
    translateFrom = sinon.stub();

    module($provide => {
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('Auth', auth);
      $provide.value('CalendarInterval', calendarInterval);
      $provide.value('ContactTypes', contactTypes);
      $provide.value('DB', () => db);
      $provide.value('GetDataRecords', getDataRecords);
      $provide.value('Search', search);
      $provide.value('Settings', settings);
      $provide.value('TranslateFrom', translateFrom);
      $provide.value('UHCSettings', uhcSettings);
      $provide.value('UserSettings', userSettings);
    });
    inject((_TargetAggregates_, _$translate_) => {
      service = _TargetAggregates_;
      translateInstant = sinon.stub(_$translate_, 'instant');
    });
  });

  afterEach(() => sinon.restore());

  describe('isEnabled', () => {
    it('should return false when user does not have permission', () => {
      auth.has.resolves(false);
      return service.isEnabled().then(result => {
        chai.expect(result).to.equal(false);
      });
    });

    it('should return true when user has permission', () => {
      auth.has.resolves(true);
      return service.isEnabled().then(result => {
        chai.expect(result).to.equal(true);
        chai.expect(auth.has.callCount).to.equal(1);
        chai.expect(auth.has.args[0]).to.deep.equal(['can_aggregate_targets']);
      });
    });
  });

  describe('getAggregates', () => {
    it('should throw error if getting settings fails', () => {
      settings.rejects({ err: 'some' });
      userSettings.resolves({ facility_id: 'aaa' });
      return service
        .getAggregates()
        .then(result => chai.expect(result).to.equal('Should have thrown'))
        .catch(err => chai.expect(err).to.deep.equal({ err: 'some' }));
    });

    it('should throw error if getting userSettings fails', () => {
      settings.resolves({ tasks: { targets: { items: [{ id: 'target', aggregate: true, type: 'count' }] } }});
      userSettings.rejects({ err: 'some' });
      db.allDocs.resolves({ rows: [] });
      return service
        .getAggregates()
        .then(result => chai.expect(result).to.equal('Should have thrown'))
        .catch(err => chai.expect(err).to.deep.equal({ err: 'some' }));
    });

    it('should throw if no facility_id', () => {
      settings.resolves({ tasks: { targets: { items: [{ id: 'target', aggregate: true, type: 'count' }] } }});
      userSettings.resolves({});
      db.allDocs.resolves({ rows: [] });
      return service
        .getAggregates()
        .then(result => chai.expect(result).to.equal('Should have thrown'))
        .catch(err => chai.expect(err.translationKey).to.equal('analytics.target.aggregates.error.no.contact'));
    });

    it('should throw when no home place', () => {
      settings.resolves({ tasks: { targets: { items: [{ id: 'target', aggregate: true, type: 'count' }] } }});
      userSettings.resolves({ facility_id: 'home' });
      getDataRecords.withArgs('home').resolves();
      db.allDocs.resolves({ rows: [] });

      return service
        .getAggregates()
        .then(result => chai.expect(result).to.equal('Should have thrown'))
        .catch(err => chai.expect(err.translationKey).to.equal('analytics.target.aggregates.error.no.contact'));
    });

    it('should not search when there are no targets to aggregate', () => {
      settings.resolves({});
      return service.getAggregates().then(result => {
        chai.expect(result.length).to.equal(0);
        chai.expect(search.callCount).to.equal(0);
        chai.expect(db.allDocs.callCount).to.equal(0);
      });
    });

    it('should search for contacts by type', () => {
      settings.resolves({ tasks: { targets: { items: [{ id: 'target', aggregate: true, type: 'count' }] } }});
      userSettings.resolves({ facility_id: 'home' });
      getDataRecords.resolves([]);
      getDataRecords.withArgs('home').resolves({ _id: 'home' });
      contactTypes.getTypeId.returns('home_type');
      contactTypes.getChildren.resolves([{ id: 'type1' }, { id: 'type2' }, { id: 'type3' }]);
      search.resolves([]);
      db.allDocs.resolves({ rows: [] });

      return service.getAggregates().then(result => {
        chai.expect(result.length).to.equal(1);
        chai.expect(result[0].id).to.equal('target');
        chai.expect(settings.callCount).to.equal(1);
        chai.expect(userSettings.callCount).to.equal(1);
        chai.expect(getDataRecords.callCount).to.equal(2);
        chai.expect(getDataRecords.args[0]).to.deep.equal(['home']);
        chai.expect(getDataRecords.args[1]).to.deep.equal([[]]);
        chai.expect(contactTypes.getTypeId.callCount).to.equal(1);
        chai.expect(contactTypes.getTypeId.args[0]).to.deep.equal([{ _id: 'home' }]);
        chai.expect(contactTypes.getChildren.callCount).to.equal(1);
        chai.expect(contactTypes.getChildren.args[0]).to.deep.equal(['home_type']);
        chai.expect(search.callCount).to.equal(1);
        chai.expect(search.args[0]).to.deep.equal([
          'contacts',
          { types: { selected: ['type1', 'type2', 'type3'] } },
          { limit: 100, skip: 0 },
        ]);
      });
    });

    it('should repeat search until all contacts are retrieved', () => {
      settings.resolves({ tasks: { targets: { items: [{ id: 'target', aggregate: true, type: 'count' }] } }});
      userSettings.resolves({ facility_id: 'home' });
      getDataRecords.resolves([]);
      getDataRecords.withArgs('home').resolves({ _id: 'home' });
      contactTypes.getTypeId.returns('home_type');
      contactTypes.getChildren.resolves([{ id: 'type1' }, { id: 'type2' }, { id: 'type3' }]);
      db.allDocs.resolves({ rows: [] });

      search.onCall(0).resolves(Array.from({ length: 100 }).map(() => ({ _id: 'place' })));
      search.onCall(1).resolves(Array.from({ length: 100 }).map(() => ({ _id: 'place' })));
      search.onCall(2).resolves(Array.from({ length: 100 }).map(() => ({ _id: 'place' })));
      search.onCall(3).resolves(Array.from({ length: 16 }).map(() => ({ _id: 'place' })));

      return service.getAggregates().then(result => {
        chai.expect(result.length).to.equal(1);
        chai.expect(result[0].id).to.equal('target');
        chai.expect(search.callCount).to.equal(4);
        chai.expect(search.args[0]).to.deep.equal([
          'contacts',
          { types: { selected: ['type1', 'type2', 'type3'] } },
          { limit: 100, skip: 0 },
        ]);
        chai.expect(search.args[1]).to.deep.equal([
          'contacts',
          { types: { selected: ['type1', 'type2', 'type3'] } },
          { limit: 100, skip: 100 },
        ]);
        chai.expect(search.args[2]).to.deep.equal([
          'contacts',
          { types: { selected: ['type1', 'type2', 'type3'] } },
          { limit: 100, skip: 200 },
        ]);
        chai.expect(search.args[3]).to.deep.equal([
          'contacts',
          { types: { selected: ['type1', 'type2', 'type3'] } },
          { limit: 100, skip: 300 },
        ]);
      });
    });

    it('should get the primary contacts of the places directly under the users home place and sort ' +
       'them alphabetically', () => {
      settings.resolves({
        tasks: { targets: { items: [{ id: 'target', aggregate: true, type: 'count' }] } }
      });
      userSettings.resolves({ facility_id: 'home' });
      getDataRecords.withArgs('home').resolves({ _id: 'home' });
      contactTypes.getTypeId.returns('home_type');
      contactTypes.getChildren.resolves([{ id: 'type1' }, { id: 'type2' }]);

      const places = Array.from({ length: 224 }).map((a, i) => ({ lineage: ['home'], contact: `contact${i}` }));
      const contacts = places.map(place => ({ _id: place.contact, name: randomString() }));
      search.onCall(0).resolves(places.slice(0, 100));
      search.onCall(1).resolves(places.slice(100, 200));
      search.onCall(2).resolves(places.slice(200, 300));
      getDataRecords.withArgs(sinon.match.array).onCall(0).resolves(contacts.slice(0, 100));
      getDataRecords.withArgs(sinon.match.array).onCall(1).resolves(contacts.slice(100, 200));
      getDataRecords.withArgs(sinon.match.array).onCall(2).resolves(contacts.slice(200, 300));

      const targetDocs = contacts.map(contact => ({
        owner: contact._id,
        targets: [
          { id: 'target', value: { pass: 0, total: 0 } },
        ],
      }));
      db.allDocs.resolves({ rows: targetDocs.map(doc => ({ doc })) });

      return service.getAggregates().then(result => {
        chai.expect(result.length).to.equal(1);
        chai.expect(result[0].id).to.equal('target');
        chai.expect(result[0].values.length).to.equal(contacts.length);

        const alphabeticalContacts = contacts.sort((a, b) => a.name > b.name ? 1 : -1);
        chai.expect(result[0].values).to.deep.equal(
          alphabeticalContacts.map(contact => ({ contact, value: { pass: 0, total: 0, percent: 0 } }))
        );

        chai.expect(search.callCount).to.equal(3);
        chai.expect(search.args[0]).to.deep.equal([
          'contacts',
          { types: { selected: ['type1', 'type2'] } },
          { limit: 100, skip: 0 },
        ]);
        chai.expect(search.args[1]).to.deep.equal([
          'contacts',
          { types: { selected: ['type1', 'type2'] } },
          { limit: 100, skip: 100 },
        ]);
        chai.expect(search.args[2]).to.deep.equal([
          'contacts',
          { types: { selected: ['type1', 'type2'] } },
          { limit: 100, skip: 200 },
        ]);

        chai.expect(getDataRecords.callCount).to.equal(4);
        chai.expect(getDataRecords.args[0]).to.deep.equal(['home']);
        chai.expect(getDataRecords.args[1]).to.deep.equal([places.slice(0, 100).map(place => place.contact)]);
        chai.expect(getDataRecords.args[2]).to.deep.equal([places.slice(100, 200).map(place => place.contact)]);
        chai.expect(getDataRecords.args[3]).to.deep.equal([places.slice(200, 300).map(place => place.contact)]);
      });
    });

    it('should discard contacts that are not under the parent place or that have no contact', () => {
      settings.resolves({
        tasks: { targets: { items: [{ id: 'target', aggregate: true, type: 'count' }] } }
      });
      userSettings.resolves({ facility_id: 'home' });
      getDataRecords.withArgs('home').resolves({ _id: 'home' });
      contactTypes.getTypeId.returns('home_type');
      contactTypes.getChildren.resolves([{ id: 'type1' }]);

      const randomBoolean = () => Math.random() < 0.5;
      const genPlace = (idx) => ({
        contact: randomBoolean() ? `contact${idx}`: '',
        lineage: [randomBoolean() ? 'home': 'other'],
      });
      const oneDifferentPlace = { contact: '', lineage: [] };
      const genContact = (id) => ({ _id: id, name: randomString() });
      // at least one place will be discarded
      const places = Array.from({ length: 265 }).map((a, i) => i && genPlace(i) || oneDifferentPlace);
      const contacts = [];
      getDataRecords.withArgs(sinon.match.array).callsFake(contactIds => {
        const responseContacts = contactIds.map(genContact);
        contacts.push(...responseContacts);
        return Promise.resolve(responseContacts);
      });
      db.allDocs.resolves({ rows: [] });

      search.onCall(0).resolves(places.slice(0, 100));
      search.onCall(1).resolves(places.slice(100, 200));
      search.onCall(2).resolves(places.slice(200, 300));

      const isRelevantPlace = place => place.lineage[0] === 'home' && place.contact;

      return service.getAggregates().then(result => {
        chai.expect(result.length).to.equal(1);
        chai.expect(result[0].id).to.equal('target');
        chai.expect(result[0].values.length).to.equal(contacts.length);
        chai.expect(result[0].values.length).not.to.equal(places.length); // we always have at least one place skipped

        const sortedContacts = contacts.sort((a, b) => a.name > b.name ? 1 : -1);
        chai.expect(result[0].values).to.deep.equal(
          sortedContacts.map(contact => ({ contact, value: { pass: 0, total: 0, percent: 0, placeholder: true } }))
        );

        const relevantPlaces = places.filter(isRelevantPlace);
        // target contacts correspond to relevant places retrieved with Search
        chai.expect(result[0].values.map(v => v.contact._id)).to.have.members(relevantPlaces.map(p => p.contact));

        chai.expect(search.callCount).to.equal(3);
        chai.expect(search.args[0]).to.deep.equal([
          'contacts',
          { types: { selected: ['type1'] } },
          { limit: 100, skip: 0 },
        ]);
        chai.expect(search.args[1]).to.deep.equal([
          'contacts',
          { types: { selected: ['type1'] } },
          { limit: 100, skip: 100 },
        ]);
        chai.expect(search.args[2]).to.deep.equal([
          'contacts',
          { types: { selected: ['type1'] } },
          { limit: 100, skip: 200 },
        ]);

        chai.expect(getDataRecords.callCount).to.equal(4);
        chai.expect(getDataRecords.args[0]).to.deep.equal(['home']);
        chai.expect(getDataRecords.args[1]).to.deep.equal([
          places.slice(0, 100).filter(isRelevantPlace).map(place => place.contact)
        ]);
        chai.expect(getDataRecords.args[2]).to.deep.equal([
          places.slice(100, 200).filter(isRelevantPlace).map(place => place.contact)
        ]);
        chai.expect(getDataRecords.args[3]).to.deep.equal([
          places.slice(200, 300).filter(isRelevantPlace).map(place => place.contact)
        ]);
      });
    });

    it('should exclude person types from places search', () => {
      settings.resolves({
        tasks: { targets: { items: [{ id: 'target', aggregate: true, type: 'count' }] } }
      });
      userSettings.resolves({ facility_id: 'home' });
      getDataRecords.withArgs('home').resolves({ _id: 'home' });
      contactTypes.getTypeId.returns('home_type');
      contactTypes.getChildren.resolves([{ id: 'type1' }, { id: 'person' }, { id: 'person2' }, { id: 'type2' }]);
      contactTypes.isPersonType.callsFake(type => type.id.startsWith('person'));

      search.resolves([]);
      getDataRecords.withArgs(sinon.match.array).resolves([]);
      db.allDocs.resolves({ rows: [] });

      return service.getAggregates().then(result => {
        chai.expect(result.length).to.equal(1);
        chai.expect(result[0].id).to.equal('target');
        chai.expect(result[0].values.length).to.equal(0);

        chai.expect(contactTypes.isPersonType.callCount).to.equal(4);
        chai.expect(contactTypes.isPersonType.args).to.deep.equal([
          [{ id: 'type1' }],
          [{ id: 'person' }],
          [{ id: 'person2' }],
          [{ id: 'type2' }],
        ]);
        chai.expect(search.callCount).to.equal(1);
        chai.expect(search.args[0]).to.deep.equal([
          'contacts',
          { types: { selected: ['type1', 'type2'] } },
          { limit: 100, skip: 0 },
        ]);
        chai.expect(getDataRecords.callCount).to.equal(2);
        chai.expect(getDataRecords.args[0]).to.deep.equal(['home']);
        chai.expect(getDataRecords.args[1]).to.deep.equal([[]]);
      });
    });

    it('should not run search is there are no available types', () => {
      settings.resolves({
        tasks: { targets: { items: [{ id: 'target', aggregate: true, type: 'count' }] } }
      });
      userSettings.resolves({ facility_id: 'home' });
      getDataRecords.withArgs('home').resolves({ _id: 'home' });
      contactTypes.getTypeId.returns('home_type');
      contactTypes.getChildren.resolves([{ id: 'person' }, { id: 'person2' }]);
      contactTypes.isPersonType.callsFake(type => type.id.startsWith('person'));

      db.allDocs.resolves({ rows: [] });

      return service.getAggregates().then(result => {
        chai.expect(result.length).to.equal(1);
        chai.expect(result[0].id).to.equal('target');
        chai.expect(result[0].values.length).to.equal(0);

        chai.expect(contactTypes.isPersonType.callCount).to.equal(2);
        chai.expect(contactTypes.isPersonType.args).to.deep.equal([
          [{ id: 'person' }],
          [{ id: 'person2' }],
        ]);
        chai.expect(search.callCount).to.equal(0);
        chai.expect(getDataRecords.callCount).to.equal(1);
        chai.expect(getDataRecords.args[0]).to.deep.equal(['home']);
      });
    });

    it('should fetch correct latest target docs', () => {
      const config = { tasks: { targets: { items: [{ id: 'target', aggregate: true, type: 'count' }] } }};
      settings.resolves(config);

      userSettings.resolves({ facility_id: 'home' });
      getDataRecords.withArgs('home').resolves({ _id: 'home' });
      contactTypes.getTypeId.returns('home_type');
      contactTypes.getChildren.resolves([{ id: 'type1' }]);
      getDataRecords.withArgs(sinon.match.array).resolves([]);
      search.resolves([]);

      db.allDocs.resolves({ rows: [] });

      uhcSettings.getMonthStartDate.returns(12);
      calendarInterval.getCurrent.returns({
        start: moment('2019-05-12').valueOf(),
        end: moment('2019-06-11').valueOf(),
      });

      return service.getAggregates().then(result => {
        chai.expect(result.length).to.equal(1);
        chai.expect(result[0].id).to.equal('target');
        chai.expect(result[0].values.length).to.equal(0);

        chai.expect(db.allDocs.callCount).to.equal(1);
        chai.expect(db.allDocs.args[0]).to.deep.equal([{
          start_key: 'target~2019-06~',
          end_key: 'target~2019-06~\ufff0',
          include_docs: true
        }]);
        chai.expect(uhcSettings.getMonthStartDate.callCount).to.equal(1);
        chai.expect(uhcSettings.getMonthStartDate.args[0]).to.deep.equal([config]);
        chai.expect(calendarInterval.getCurrent.callCount).to.equal(1);
        chai.expect(calendarInterval.getCurrent.args[0]).to.deep.equal([12]);
      });
    });

    it('should exclude non-aggregable targets and hydrate aggregates', () => {
      const config = { tasks: { targets: { items: [
        { id: 'target1', aggregate: true, type: 'count', title: 'target1' },
        { id: 'target2', aggregate: false, type: 'count', translation_key: 'target2' },
        { id: 'target3', aggregate: true, type: 'count', goal: 20, title: 'target3' },
        { id: 'target4', aggregate: true, type: 'percent', goal: -1, translation_key: 'target4' },
        { id: 'target5', aggregate: true, type: 'percent', goal: 80, title: 'target5' },
      ] } }};

      settings.resolves(config);
      userSettings.resolves({ facility_id: 'home' });
      getDataRecords.withArgs('home').resolves({ _id: 'home' });
      contactTypes.getTypeId.returns('home_type');
      contactTypes.getChildren.resolves([{ id: 'type1' }]);
      getDataRecords.withArgs(sinon.match.array).resolves([]);
      search.resolves([]);
      translateInstant.callsFake(e => e);
      translateFrom.callsFake(e => e);

      db.allDocs.resolves({ rows: [] });

      return service.getAggregates().then(result => {
        chai.expect(result.length).to.equal(4);
        chai.expect(result[0]).to.deep.equal({
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

        chai.expect(result[1]).to.deep.equal({
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

        chai.expect(result[2]).to.deep.equal({
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

        chai.expect(result[3]).to.deep.equal({
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
    });

    it('should calculate every type of target aggregate correctly', () => {
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

      settings.resolves(config);
      userSettings.resolves({ facility_id: 'home' });
      getDataRecords.withArgs('home').resolves({ _id: 'home' });
      contactTypes.getTypeId.returns('home_type');
      contactTypes.getChildren.resolves([{ id: 'type1' }]);
      getDataRecords.withArgs(sinon.match.array).resolves(contacts);
      search.resolves([]);

      db.allDocs.resolves({ rows: targetDocs.map(doc => ({ doc })) });

      translateInstant.callsFake(echo => echo);
      translateFrom.callsFake(echo => echo);

      return service.getAggregates().then(result => {
        chai.expect(result.length).to.equal(5);

        chai.expect(translateInstant.callCount).to.equal(6);
        chai.expect(translateInstant.withArgs('target2').callCount).to.equal(1);
        chai.expect(translateInstant.withArgs('target4').callCount).to.equal(1);
        chai.expect(translateInstant.withArgs('target5').callCount).to.equal(1);
        chai.expect(translateInstant.withArgs(ratioTranslationKey).callCount).to.equal(3);
        chai.expect(translateInstant.withArgs(ratioTranslationKey).args[0][1]).to.deep.include({ pass: 1, total: 3 });
        chai.expect(translateInstant.withArgs(ratioTranslationKey).args[1][1]).to.deep.include({ pass: 1, total: 3 });

        chai.expect(translateFrom.callCount).to.equal(2);
        chai.expect(translateFrom.args).to.deep.equal([['target1'], ['target3']]);

        chai.expect(result[0]).to.deep.equal({
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
        chai.expect(result[1]).to.deep.equal({
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
        chai.expect(result[2]).to.deep.equal({
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
        chai.expect(result[3]).to.deep.equal({
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
        chai.expect(result[4]).to.deep.equal({
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
    });

    it('should exclude targets from other contacts', () => {
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

      settings.resolves(config);
      userSettings.resolves({ facility_id: 'home' });
      getDataRecords.withArgs('home').resolves({ _id: 'home' });
      contactTypes.getTypeId.returns('home_type');
      contactTypes.getChildren.resolves([{ id: 'type1' }]);
      getDataRecords.withArgs(sinon.match.array).resolves(contacts);
      search.resolves([]);

      db.allDocs.resolves({ rows: targetDocs.map(doc => ({ doc })) });

      return service.getAggregates().then(result => {
        chai.expect(result.length).to.equal(1);
        chai.expect(result[0]).to.deep.equal({
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
    });

    it('should create placeholders for missing targets and missing target values', () => {
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

      settings.resolves(config);
      userSettings.resolves({ facility_id: 'home' });
      getDataRecords.withArgs('home').resolves({ _id: 'home' });
      contactTypes.getTypeId.returns('home_type');
      contactTypes.getChildren.resolves([{ id: 'type1' }]);
      getDataRecords.withArgs(sinon.match.array).resolves(contacts);
      search.resolves([]);

      db.allDocs.resolves({ rows: targetDocs.map(doc => ({ doc })) });

      return service.getAggregates().then(result => {
        chai.expect(result.length).to.equal(2);
        chai.expect(result[0]).to.deep.equal({
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

        chai.expect(result[1]).to.deep.equal({
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
    });

    it('should only process one target doc per contact', () => {
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

      settings.resolves(config);
      userSettings.resolves({ facility_id: 'home' });
      getDataRecords.withArgs('home').resolves({ _id: 'home' });
      contactTypes.getTypeId.returns('home_type');
      contactTypes.getChildren.resolves([{ id: 'type1' }]);
      getDataRecords.withArgs(sinon.match.array).resolves(contacts);
      search.resolves([]);

      db.allDocs.resolves({ rows: targetDocs.map(doc => ({ doc })) });

      return service.getAggregates().then(result => {
        chai.expect(result.length).to.equal(2);
        chai.expect(result[0]).to.deep.equal({
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

        chai.expect(result[1]).to.deep.equal({
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
    });

    it('should discard additional target values from target docs', () => {
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

      settings.resolves(config);
      userSettings.resolves({ facility_id: 'home' });
      getDataRecords.withArgs('home').resolves({ _id: 'home' });
      contactTypes.getTypeId.returns('home_type');
      contactTypes.getChildren.resolves([{ id: 'type1' }]);
      getDataRecords.withArgs(sinon.match.array).resolves(contacts);
      search.resolves([]);

      db.allDocs.resolves({ rows: targetDocs.map(doc => ({ doc })) });

      return service.getAggregates().then(result => {
        chai.expect(result.length).to.equal(2);
        chai.expect(result[0]).to.deep.equal({
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

        chai.expect(result[1]).to.deep.equal({
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
  });

  describe('getAggregateDetails', () => {
    it('should return nothing when no targetId or aggregates provided', () => {
      chai.expect(service.getAggregateDetails()).to.equal(undefined);
      chai.expect(service.getAggregateDetails(false, [])).to.equal(undefined);
      chai.expect(service.getAggregateDetails('id')).to.equal(undefined);
    });

    it('should return nothing when target not found', () => {
      const aggregates = [
        { id: 'a', values: [], type: 'percent' },
        { id: 'b', values: [], type: 'count', goal: 2 },
        { id: 'c', values: [] },
      ];

      chai.expect(service.getAggregateDetails('o', aggregates)).to.equal(undefined);
    });

    it('should return the correct aggregate', () => {
      const aggregates = [
        { id: 'a', values: [], type: 'percent' },
        { id: 'b', values: [], type: 'count', goal: 2 },
        { id: 'c', values: [] },
      ];

      chai.expect(service.getAggregateDetails('b', aggregates))
        .to.deep.equal({ id: 'b', values: [], type: 'count', goal: 2 });
    });
  });

  describe('getCurrentTargetDoc', () => {
    it('should do nothing when no contact uuid', () => {
      chai.expect(service.getCurrentTargetDoc()).to.equal(undefined);
      chai.expect(service.getCurrentTargetDoc({})).to.equal(undefined);
      chai.expect(service.getCurrentTargetDoc('')).to.equal(undefined);
    });

    it('should throw when getting settings fails', () => {
      settings.rejects({ some: 'err' });
      return service
        .getCurrentTargetDoc('uuid')
        .then(() => chai.expect().to.equal('Should have thrown'))
        .catch(err => chai.expect(err).to.deep.equal({ some: 'err' }));
    });

    it('should fetch latest target doc ', () => {
      const config = { tasks: { targets: { items: [
        { id: 'target1', aggregate: true, type: 'count' },
        { id: 'target2', aggregate: false, type: 'percent' },
        { id: 'target3', type: 'count', goal: 22, translation_key: 'my target' },
      ] } }};
      settings.resolves(config);
      uhcSettings.getMonthStartDate.returns(20);
      calendarInterval.getCurrent.returns({
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

      db.allDocs.resolves({ rows: [{ doc: targetDoc }] });

      return service.getCurrentTargetDoc('uuid').then(result => {
        chai.expect(result).to.deep.equal({
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

        chai.expect(uhcSettings.getMonthStartDate.callCount).to.equal(1);
        chai.expect(uhcSettings.getMonthStartDate.args[0]).to.deep.equal([config]);
        chai.expect(calendarInterval.getCurrent.callCount).to.equal(1);
        chai.expect(calendarInterval.getCurrent.args[0]).to.deep.equal([20]);

        chai.expect(db.allDocs.callCount).to.equal(1);
        chai.expect(db.allDocs.args[0]).to.deep.equal([{
          start_key: 'target~2020-02~uuid~',
          end_key: 'target~2020-02~uuid~\ufff0',
          include_docs: true,
        }]);
      });
    });

    it('should discard additional target docs', () => {
      const config = { tasks: { targets: { items: [
        { id: 'target1', aggregate: true, type: 'count' },
      ] } }};
      settings.resolves(config);

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

      db.allDocs.resolves({ rows: targetDocs.map(doc => ({ doc })) });

      return service.getCurrentTargetDoc('uuid').then(result => {
        chai.expect(result).to.deep.equal({
          _id: 'target~2020-02~uuid~username1',
          owner: 'uuid',
          targets: [ { id: 'target1', value: { pass: 5, total: 5 }, aggregate: true, type: 'count' }]
        });
      });
    });

    it('should ignore targets that are not configured', () => {
      const config = { tasks: { targets: { items: [
        { id: 'target1', aggregate: true, type: 'count' },
        { id: 'target2', aggregate: false, type: 'percent' },
      ] } }};
      settings.resolves(config);

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

      db.allDocs.resolves({ rows: targetDocs.map(doc => ({ doc })) });

      return service.getCurrentTargetDoc('uuid').then(result => {
        chai.expect(result).to.deep.equal({
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
});
