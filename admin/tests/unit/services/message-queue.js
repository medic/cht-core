describe('MessageQueue service', function() {

  'use strict';

  let service,
      Settings,
      Languages,
      utils,
      query,
      translate,
      rootScope,
      clock;

  beforeEach(() => {
    Settings = sinon.stub();
    Languages = sinon.stub();
    query = sinon.stub();
    translate = sinon.stub();
    translate.instant = sinon.stub();
    translate.storageKey = sinon.stub();
    translate.storage = sinon.stub();
    translate.preferredLanguage = sinon.stub();
    clock = sinon.useFakeTimers();
    utils = {
      messages: {
        generate: sinon.stub()
      },
      registrations: {
        isValidRegistration: sinon.stub()
      },
      lineage: {
        fetchLineageByIds: sinon.stub(),
        fillParentsInDocs: sinon.stub()
      }
    };


    module('adminApp');
    module(($provide) => {
      $provide.value('$translate', translate);
      $provide.value('$q', Q);
      $provide.value('Settings', Settings);
      $provide.value('Languages', Languages);
      $provide.value('MessageQueueUtils', utils);
      $provide.factory('DB', KarmaUtils.mockDB({ query: query }));
    });

    inject(($injector, $rootScope) => {
      rootScope = $rootScope;
      service = $injector.get('MessageQueue');
    });
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  describe('loadTranslations', () => {
    it('requests languages and requests a translation for each, except english', () => {
      Languages.resolves([ { code: 'en' }, { code: 'ro' }, { code: 'de' }, { code: 'nl' }, {}, false ]);

      return service.loadTranslations().then(() => {
        chai.expect(Languages.callCount).to.equal(1);
        chai.expect(translate.callCount).to.equal(3);
        chai.expect(translate.args[0][4]).to.deep.equal('ro');
        chai.expect(translate.args[1][4]).to.deep.equal('de');
        chai.expect(translate.args[2][4]).to.deep.equal('nl');
      });
    });

    it('throws error on language error', () => {
      Languages.rejects({ some: 'err' });

      return service
        .loadTranslations()
        .then(() => {
          chai.expect(0).to.equal('Should have thrown');
        })
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'err' });
        });
    });
  });

  describe('query', () => {
    it('should query the message_queue view with correct params', () => {
      query
        .withArgs('medic-admin/message_queue', sinon.match({ reduce: false })).resolves({ rows: [] })
        .withArgs('medic-admin/message_queue', sinon.match({ reduce: true })).resolves({ rows: [{ value: 0 }] });

      return service.query('tab', 10, 5, false).then(result => {
        chai.expect(result).to.deep.equal({ messages: [], total: 0 });
        chai.expect(query.callCount).to.equal(2);
        chai.expect(query.args[0]).to.deep.equal(['medic-admin/message_queue', { limit: 5, skip: 10, reduce: false }]);
        chai.expect(query.args[1]).to.deep.equal(['medic-admin/message_queue', { reduce: true, group_level: 1 }]);
      });
    });

    it('should query the message_queue view with correct default params', () => {
      query
        .withArgs('medic-admin/message_queue', sinon.match({ reduce: false })).resolves({ rows: [] })
        .withArgs('medic-admin/message_queue', sinon.match({ reduce: true })).resolves({ rows: [{ value: 0 }] });

      return service.query('tab').then(result => {
        chai.expect(result).to.deep.equal({ messages: [], total: 0 });
        chai.expect(query.callCount).to.equal(2);
        chai.expect(query.args[0]).to.deep.equal(['medic-admin/message_queue', { limit: 25, skip: 0, reduce: false }]);
        chai.expect(query.args[1]).to.deep.equal(['medic-admin/message_queue', { reduce: true, group_level: 1 }]);
      });
    });

    it('should query the message queue view with correct params for scheduled tab', () => {
      query
        .withArgs('medic-admin/message_queue', sinon.match({ reduce: false })).resolves({ rows: [] })
        .withArgs('medic-admin/message_queue', sinon.match({ reduce: true })).resolves({ rows: [{ value: 0 }] });

      return service.query('scheduled').then(result => {
        chai.expect(result).to.deep.equal({ messages: [], total: 0 });
        chai.expect(query.callCount).to.equal(2);
        chai.expect(query.args[0]).to.deep.equal([
          'medic-admin/message_queue',
          { limit: 25, skip: 0, reduce: false, start_key: ['scheduled', 0], end_key: ['scheduled', {}] }
        ]);
        chai.expect(query.args[1]).to.deep.equal([
          'medic-admin/message_queue',
          { reduce: true, group_level: 1, start_key: ['scheduled', 0], end_key: ['scheduled', {}] }
        ]);
      });
    });

    it('should query the message queue view with correct params for due tab', () => {
      query
        .withArgs('medic-admin/message_queue', sinon.match({ reduce: false })).resolves({ rows: [] })
        .withArgs('medic-admin/message_queue', sinon.match({ reduce: true })).resolves({ rows: [{ value: 0 }] });

      return service.query('due').then(result => {
        chai.expect(result).to.deep.equal({ messages: [], total: 0 });
        chai.expect(query.callCount).to.equal(2);
        chai.expect(query.args[0]).to.deep.equal([
          'medic-admin/message_queue',
          { limit: 25, skip: 0, reduce: false, start_key: ['due', {}], end_key: ['due', 0], descending: true }
        ]);
        chai.expect(query.args[1]).to.deep.equal([
          'medic-admin/message_queue',
          { reduce: true, group_level: 1, start_key: ['due', {}], end_key: ['due', 0], descending: true }
        ]);
      });
    });

    it('should query the message queue view with correct params for muted (ascending) tab', () => {
      clock.tick(150000);
      query
        .withArgs('medic-admin/message_queue', sinon.match({ reduce: false })).resolves({ rows: [] })
        .withArgs('medic-admin/message_queue', sinon.match({ reduce: true })).resolves({ rows: [{ value: 0 }] });

      return service.query('muted').then(result => {
        chai.expect(result).to.deep.equal({ messages: [], total: 0 });
        chai.expect(query.callCount).to.equal(2);
        chai.expect(query.args[0]).to.deep.equal([
          'medic-admin/message_queue',
          { limit: 25, skip: 0, reduce: false, start_key: ['muted', 150000], end_key: ['muted', {}] }
        ]);
        chai.expect(query.args[1]).to.deep.equal([
          'medic-admin/message_queue',
          { reduce: true, group_level: 1, start_key: ['muted', 150000], end_key: ['muted', {}] }
        ]);
      });
    });

    it('should query the message queue view with correct params for muted (descending) tab', () => {
      clock.tick(150000);
      query
        .withArgs('medic-admin/message_queue', sinon.match({ reduce: false })).resolves({ rows: [] })
        .withArgs('medic-admin/message_queue', sinon.match({ reduce: true })).resolves({ rows: [{ value: 22 }] });

      return service.query('muted', undefined, undefined, true).then(result => {
        chai.expect(result).to.deep.equal({ messages: [], total: 22 });
        chai.expect(query.callCount).to.equal(2);
        chai.expect(query.args[0]).to.deep.equal([
          'medic-admin/message_queue',
          { limit: 25, skip: 0, reduce: false, start_key: ['muted', 150000], end_key: ['muted', 0], descending: true }
        ]);
        chai.expect(query.args[1]).to.deep.equal([
          'medic-admin/message_queue',
          { reduce: true, group_level: 1, start_key: ['muted', 150000], end_key: ['muted', 0], descending: true }
        ]);
      });
    });

    it('should query for recipient names and format results', () => {
      var messages = [
        {
          record: { id: 1, reported_date: 1, form: 'a' },
          sms: { message: 'a', to: '123' },
          task: { translation_key: 'task1', group: 1, state: 'pending', state_history: { some: 'history' } },
          due: 1
        },
        {
          record: { id: 2, reported_date: 2, form: false },
          sms: { message: 'b', to: '456' },
          task: { type: 'task2', group: 1, state: 'sent', state_history: {} },
          due: 2
        },
        {
          record: { id: 1, reported_date: 1, form: 'P' },
          sms: { message: 'c', to: 'clinic' },
          task: { state: 'forwarded-to-gateway' },
          due: 3
        },
        {
          record: { id: 3, reported_date: 3 },
          sms: { message: 'd', to: '' },
          task: { type: 'task3', state: 'delivered' },
          due: 3
        },
        {
          record: { id: 4, reported_date: 4 },
          sms: { message: 'e', to: '898989' },
          task: { type: 'task3', state: 'pending' },
          due: 4
        },
        {
          record: { id: 4, reported_date: 4 },
          sms: { message: 'f' },
          task: { translation_key: 'task2', state: 'pending' },
          due: 4
        },
        {
          record: { id: 5, reported_date: 6 },
          sms: { message: 'aaa', to: '123' },
          task: { type: 'task3', state: 'pending' },
          due: 5
        },
        {
          record: { id: 6, reported_date: 8 },
          sms: { message: 'bbb', to: '456' },
          task: { state: 'pending' },
          due: 6
        },
        {
          record: { id: 4, reported_date: 4 },
          sms: { message: 'eee', to: '898989' },
          task: { state: 'pending' },
          due: 7
        }
      ];
      query.withArgs('medic-admin/message_queue', sinon.match({ reduce: true })).resolves({ rows: [{ value: 5 }] });
      query
        .withArgs('medic-admin/message_queue', sinon.match({ reduce: false }))
        .resolves({ rows: messages.map(message => ({ value: message })) });
      query.withArgs('medic-client/contacts_by_phone').resolves({
        rows: [{ id: 1, value: '123' }, { id: 2, value: '456' }]
      });
      query.withArgs('medic/doc_summaries_by_id').resolves({
        rows: [{ value: { name: 'maria', phone: '123' }}, { value: { name: 'james', phone: '456' }}]
      });

      translate.instant.withArgs('task1', { group: 1 }).returns('task one translation');
      translate.instant.withArgs('task2', { group: undefined }).returns('task two translation');

      return service.query('due').then(result => {
        chai.expect(result.total).to.equal(5);
        chai.expect(query.callCount).to.equal(4);
        chai.expect(query.args[2])
          .to.deep.equal(['medic-client/contacts_by_phone', { keys: ['123', '456', 'clinic', '898989'] }]);
        chai.expect(query.args[3])
          .to.deep.equal(['medic/doc_summaries_by_id', { keys: [1, 2] }]);

        chai.expect(result.messages.length).to.equal(9);
        chai.expect(result.messages[0]).to.deep.equal({
          record: { id: 1, reportedDate: 1 },
          recipient: 'maria',
          task: 'task one translation',
          state: 'pending',
          stateHistory: { some: 'history' },
          content: 'a',
          due: 1,
          link: true
        });

        chai.expect(result.messages[1]).to.deep.equal({
          record: { id: 2, reportedDate: 2 },
          recipient: 'james',
          task: 'task2:1',
          state: 'sent',
          stateHistory: {},
          content: 'b',
          due: 2,
          link: false
        });

        chai.expect(result.messages[2]).to.deep.equal({
          record: { id: 1, reportedDate: 1 },
          recipient: 'clinic',
          task: false,
          state: 'forwarded-to-gateway',
          stateHistory: undefined,
          content: 'c',
          due: 3,
          link: true
        });

        chai.expect(result.messages[3]).to.deep.equal({
          record: { id: 3, reportedDate: 3 },
          recipient: '',
          task: 'task3',
          state: 'delivered',
          stateHistory: undefined,
          content: 'd',
          due: 3,
          link: false
        });

        chai.expect(result.messages[4]).to.deep.equal({
          record: { id: 4, reportedDate: 4 },
          recipient: '898989',
          task: 'task3',
          state: 'pending',
          stateHistory: undefined,
          content: 'e',
          due: 4,
          link: false
        });

        chai.expect(result.messages[5]).to.deep.equal({
          record: { id: 4, reportedDate: 4 },
          recipient: undefined,
          task: 'task two translation',
          state: 'pending',
          stateHistory: undefined,
          content: 'f',
          due: 4,
          link: false
        });

        chai.expect(result.messages[6]).to.deep.equal({
          record: { id: 5, reportedDate: 6 },
          recipient: 'maria',
          task: 'task3',
          state: 'pending',
          stateHistory: undefined,
          content: 'aaa',
          due: 5,
          link: false
        });

        chai.expect(result.messages[7]).to.deep.equal({
          record: { id: 6, reportedDate: 8 },
          recipient: 'james',
          task: false,
          state: 'pending',
          stateHistory: undefined,
          content: 'bbb',
          due: 6,
          link: false
        });

        chai.expect(result.messages[8]).to.deep.equal({
          record: { id: 4, reportedDate: 4 },
          recipient: '898989',
          task: false,
          state: 'pending',
          stateHistory: undefined,
          content: 'eee',
          due: 7,
          link: false
        });
      });
    });

    it('should generate scheduled messages', () => {
      const settings = { some: 'settings' };
      Settings.resolves(settings);

      const messages = [
        {
          record: {
            id: 1,
            reported_date: 1,
            form: 'a',
            patient_id: '12345',
            contact: { _id: 'c1' },
            locale: 'en',
            fields: { some: 'field' }
          },
          scheduled_sms: { translation_key: 'message1', recipient: 'clinic' },
          task: { translation_key: 'task1', group: 1, state: 'pending', state_history: { some: 'history' } },
          due: 1
        },
        {
          record: {
            id: 2,
            reported_date: 1,
            patient_id: undefined,
            patient_uuid: 'uuid1',
            contact: { _id: 'c2' },
            fields: { one: 'two' },
            locale: undefined
          },
          scheduled_sms: { translation_key: 'message2', recipient: 'reporting_unit' },
          task: { type: 'task1', group: 1, state: 'pending', state_history: {} },
          due: 2
        },
        {
          record: {
            id: 3,
            reported_date: 1,
            patient_id: 'notfound',
            patient_uuid: 'uuid2',
            contact: { _id: 'uuid1' },
            fields: undefined,
            locale: 'es'
          },
          scheduled_sms: { translation_key: 'message3', recipient: 'reporting_unit' },
          task: { type: 'task1', group: 2, state: 'pending', state_history: {} },
          due: 3
        },
        {
          record: {
            id: 4,
            reported_date: 1,
            patient_id: 'notfound',
            patient_uuid: false,
            contact: undefined,
            fields: { patient_id: 'not_found' },
            locale: 'sw'
          },
          scheduled_sms: { translation_key: 'message4', recipient: 'reporting_unit' },
          task: { type: 'task1', group: 3, state: 'pending', state_history: {} },
          due: 4
        },
      ];

      const registrations = [
        { _id: 'r1', type: 'valid', patient_id: '12345' },
        { _id: 'r2', type: 'invalid', patient_id: '12345' },
        { _id: 'r3', type: 'valid', patient_id: '12345' },
      ];

      const patient1 = { _id: 'p1', patient_id: '12345', parent: { _id: 'cl1' }},
            contact1 = { _id: 'c1', patient_id: '98745', parent: { _id: 'cl1' }},
            patient2 = { _id: 'uuid1', patient_id: '96963', parent: { _id: 'cl2' }, phone: '789'},
            contact2 = { _id: 'c2', patient_id: '96321', parent: { _id: 'cl3' }, phone: '299299'},
            patient3 = { _id: 'uuid2', patient_id: '89745', parent: { _id: 'cl3' }},
            clinic1 = { _id: 'cl1', type: 'clinic', phone: '+401234' },
            clinic2 = { _id: 'cl2', type: 'clinic' },
            clinic3 = { _id: 'cl3', type: 'clinic' };

      query.withArgs('medic-admin/message_queue', sinon.match({ reduce: true })).resolves({ rows: [{ value: 5 }] });
      query
        .withArgs('medic-admin/message_queue', sinon.match({ reduce: false }))
        .resolves({ rows: messages.map(message => ({ value: message })) });

      query
        .withArgs('medic-client/contacts_by_reference', { keys: [['shortcode', '12345'], ['shortcode', 'notfound']] })
        .resolves({ rows: [{ id: 'p1', key: ['shortcode', '12345'], value: 'p1' }] });

      query
        .withArgs('medic-client/registered_patients', { keys: ['12345', 'notfound'], include_docs: true })
        .resolves({ rows: registrations.map(registration => ({ doc: registration, key: registration.patient_id })) });

      query.withArgs('medic-client/contacts_by_phone').resolves({
        rows: [{ id: 1, value: '123' }, { id: 2, value: '456' }]
      });
      query.withArgs('medic/doc_summaries_by_id').resolves({
        rows: [{ value: { name: 'maria', phone: '123' }}, { value: { name: 'james', phone: '456' }}]
      });

      utils.registrations.isValidRegistration.withArgs(sinon.match({ type: 'valid' })).returns(true);
      utils.registrations.isValidRegistration.withArgs(sinon.match({ type: 'invalid' })).returns(false);

      utils.lineage.fetchLineageByIds
        .withArgs(['p1', 'c1', 'uuid1', 'c2', 'uuid2'])
        .resolves([
          [patient1, clinic1],
          [contact1, clinic1],
          [patient2, clinic2],
          [contact2, clinic3],
          [patient3, clinic3]
        ]);
      utils.lineage.fillParentsInDocs.callsFake((doc, parents) => Object.assign(doc, { parent: parents[0] }));
      utils.messages.generate
        .withArgs(settings, sinon.match.func, sinon.match({ _id: 1 })).returns([{
          message: 'message1 translated',
          to: clinic1.phone
        }])
        .withArgs(settings, sinon.match.func, sinon.match({ _id: 2 })).returns([{
          message: 'message2 translated',
          to: contact2.phone
        }])
        .withArgs(settings, sinon.match.func, sinon.match({ _id: 3 })).returns([{
          message: 'message3 translated',
          to: patient2.phone
        }])
        .withArgs(settings, sinon.match.func, sinon.match({ _id: 4 })).returns([{
          message: 'message4 translated',
          to: 'reporting_unit'
        }]);


      return service.query('scheduled').then(() => {
        chai.expect(utils.messages.generate.callCount).to.equal(4);

        const generate1 = utils.messages.generate.args[0];
        chai.expect(generate1[0]).to.deep.equal({ some: 'settings' });
        chai.expect(generate1[2]).to.deep.equal({
          _id: 1,
          contact: Object.assign(contact1, { parent: clinic1 }),
          fields: { some: 'field' },
          locale: 'en'
        });
        chai.expect(generate1[3]).to.deep.equal({ translationKey: 'message1', message: undefined });
        chai.expect(generate1[4]).to.equal('clinic');
        chai.expect(generate1[5]).to.deep.equal({
          patient_uuid: 'p1',
          patient: Object.assign(patient1, { parent: clinic1 }),
          registrations: [
            { _id: 'r1', type: 'valid', patient_id: '12345' },
            { _id: 'r3', type: 'valid', patient_id: '12345' }
          ]
        });

        const generate2 = utils.messages.generate.args[1];
        chai.expect(generate2[2]).to.deep.equal({
          _id: 2,
          contact: Object.assign(contact2, { parent: clinic3 }),
          fields: { one: 'two' },
          locale: undefined
        });
        chai.expect(generate2[3]).to.deep.equal({ translationKey: 'message2', message: undefined });
        chai.expect(generate2[4]).to.equal('reporting_unit');
        chai.expect(generate2[5]).to.deep.equal({
          patient_uuid: 'uuid1',
          patient: Object.assign(patient2, { parent: clinic2 }),
          registrations: []
        });
      });
    });
  });
});
