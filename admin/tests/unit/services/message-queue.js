describe('MessageQueue service', function() {

  'use strict';

  let service;
  let Settings;
  let Languages;
  let utils;
  let query;
  let translate;
  let clock;

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

    inject(($injector) => {
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
        .then(() => chai.assert.fail('Should have thrown'))
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
        chai.expect(query.args[0])
          .to.deep.equal(['medic-admin/message_queue', { limit: 5, skip: 10, reduce: false, include_docs: true }]);
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
        chai.expect(query.args[0])
          .to.deep.equal(['medic-admin/message_queue', { limit: 25, skip: 0, reduce: false, include_docs: true }]);
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
          {
            limit: 25,
            skip: 0,
            reduce: false,
            include_docs: true,
            start_key: ['scheduled', 0],
            end_key: ['scheduled', {}]
          }
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
          {
            limit: 25,
            skip: 0,
            reduce: false,
            include_docs: true,
            start_key: ['due', {}],
            end_key: ['due', 0], descending: true
          }
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
          {
            limit: 25,
            skip: 0,
            reduce: false,
            include_docs: true,
            start_key: ['muted', 150000],
            end_key: ['muted', {}]
          }
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
          {
            limit: 25,
            skip: 0,
            reduce: false,
            include_docs: true,
            start_key: ['muted', 150000],
            end_key: ['muted', 0],
            descending: true
          }
        ]);
        chai.expect(query.args[1]).to.deep.equal([
          'medic-admin/message_queue',
          { reduce: true, group_level: 1, start_key: ['muted', 150000], end_key: ['muted', 0], descending: true }
        ]);
      });
    });

    it('should handle empty results', () => {
      query
        .withArgs('medic-admin/message_queue', sinon.match({ reduce: true }))
        .resolves({ rows: [] });
      query
        .withArgs('medic-admin/message_queue', sinon.match({ reduce: false }))
        .resolves({ rows: [] });

      return service.query('due').then(result => {
        chai.expect(result.total).to.equal(0);
        chai.expect(query.callCount).to.equal(2);
        chai.expect(translate.instant.callCount).to.equal(0);
        chai.expect(result.messages.length).to.equal(0);
      });
    });

    it('should format results', () => {
      const messages = [
        {
          doc: {
            _id: 'report_id1',
            reported_date: 100,
            form: 'form_name',
            type: 'data_record',
          },
          value: {
            sms: {
              message: 'this is the sms content', to: 'phone1'
            },
            task: {
              translation_key: 'task1',
              group: 1,
              state: 'pending',
              state_history: {
                state: 'pending', timestamp: 200
              }
            }, due: 300
          }
        },
        {
          doc: {
            _id: 'report_id2',
            reported_date: 120,
          },
          value: {
            sms: {
              message: 'second sms content',
              to: 'phone2'
            },
            task: {
              type: 'task2',
              group: 2,
              state: 'delivered',
              state_history: {
                state: 'delivered',
                timestamp: 100
              }
            },
            due: 200
          }
        }
      ];

      query.withArgs('medic-admin/message_queue', sinon.match({ reduce: true })).resolves({ rows: [{ value: 2 }] });
      query
        .withArgs('medic-admin/message_queue', sinon.match({ reduce: false }))
        .resolves({ rows: messages });

      query.withArgs('medic-client/contacts_by_phone').resolves({
        rows: [{ id: 'contact1', value: 'contact1', key: 'phone1' }]
      });

      query.withArgs('medic/doc_summaries_by_id').resolves({
        rows: [{ id: 'contact1', value: { name: 'James', phone: 'phone1' } }]
      });

      translate.instant.withArgs('task1').returns('task 1 translation');

      utils.messages.generate.callsFake((settings, translate, doc, content, recipient) => ([{
        message: content.translationKey || content.message,
        to: recipient,
        error: doc.error
      }]));

      return service.query('due').then(result => {
        chai.expect(result.total).to.equal(2);
        chai.expect(query.callCount).to.equal(4);

        chai.expect(query.args[2]).to.deep.equal([
          'medic-client/contacts_by_phone',
          { keys: ['phone1', 'phone2'] }
        ]);

        chai.expect(query.args[3]).to.deep.equal([
          'medic/doc_summaries_by_id',
          { keys: ['contact1'] }
        ]);

        chai.expect(translate.instant.callCount).to.equal(1);
        chai.expect(translate.instant.args[0]).to.deep.equal([ 'task1', { group: 1 } ]);

        chai.expect(result.messages).to.deep.equal([{
          record: { id: 'report_id1', reportedDate: 100 },
          recipient: 'James',
          task: 'task 1 translation',
          state: 'pending',
          content: 'this is the sms content',
          stateHistory: { state: 'pending', timestamp: 200 },
          due: 300,
          link: true,
          error: false
        }, {
          record: { id: 'report_id2', reportedDate: 120 },
          recipient: 'phone2',
          task: 'task2:2',
          state: 'delivered',
          content: 'second sms content',
          stateHistory: { state: 'delivered', timestamp: 100 },
          due: 200,
          link: false,
          error: false
        }]);
      });
    });

    it('should query for unique recipients', () => {
      const messages = [{
        doc: { _id: 'report_id1', reported_date: 100 },
        value: {
          sms: { message: 'sms1', to: 'phone1' },
          task: { translation_key: 'task1', state: 'pending' },
          due: 300
        }
      }, {
        doc: { _id: 'report_id2', reported_date: 200 },
        value: {
          sms: { message: 'sms1', to: 'phone1' },
          task: { translation_key: 'task2', state: 'pending' },
          due: 300
        }
      }, {
        doc: { _id: 'report_id2', reported_date: 200 },
        value: {
          sms: { message: 'sms2', to: 'phone2' },
          task: { translation_key: 'task3', state: 'pending' },
          due: 300
        }
      }, {
        doc: { _id: 'report_id3', reported_date: 200 },
        value: {
          sms: { message: 'sms2', to: 'phone2' },
          task: { translation_key: 'task3', state: 'pending' },
          due: 300
        }
      }, {
        doc: { _id: 'report_id3', reported_date: 200 },
        value: {
          sms: { message: 'sms2', to: 'phone2' },
          task: { translation_key: 'task3', state: 'pending' },
          due: 300
        }
      }, {
        doc: { _id: 'report_id4', reported_date: 200 },
        value: {
          sms: { message: 'sms2', to: 'phone2' },
          task: { translation_key: 'task3', state: 'pending' },
          due: 300
        }
      }, {
        doc: { _id: 'report_id4', reported_date: 200 },
        value: {
          sms: { message: 'sms2', to: false },
          task: { translation_key: 'task3', state: 'pending' },
          due: 300
        }
      }, {
        doc: { _id: 'report_id4', reported_date: 200 },
        value: {
          sms: { message: 'sms2', to: undefined },
          task: { translation_key: 'task3', state: 'pending' },
          due: 300
        }
      }];

      translate.instant.callsFake(t => t);

      query.withArgs('medic-admin/message_queue', sinon.match({ reduce: true })).resolves({ rows: [{ value: 8 }] });
      query
        .withArgs('medic-admin/message_queue', sinon.match({ reduce: false }))
        .resolves({ rows: messages });

      query
        .withArgs('medic-client/contacts_by_phone')
        .resolves({ rows: [ { value: 'contact1', key: 'phone1' }, { value: 'contact2', key: 'phone2' } ] });

      query
        .withArgs('medic/doc_summaries_by_id')
        .resolves({
          rows: [
            { value: { id: 'contact1', name: 'contact one', phone: 'phone1' } },
            { value: { id: 'contact2', name: 'contact two', phone: 'phone2' } },
          ]
        });

      return service.query('due').then(result => {
        chai.expect(query.callCount).to.equal(4);
        chai.expect(query.args[2]).to.deep.equal([
          'medic-client/contacts_by_phone', { keys: [ 'phone1', 'phone2' ]}
        ]);

        chai.expect(result.messages[0].recipient).to.equal('contact one');
        chai.expect(result.messages[1].recipient).to.equal('contact one');

        chai.expect(result.messages[2].recipient).to.equal('contact two');
        chai.expect(result.messages[3].recipient).to.equal('contact two');
        chai.expect(result.messages[4].recipient).to.equal('contact two');
        chai.expect(result.messages[5].recipient).to.equal('contact two');

        chai.expect(result.messages[6].recipient).to.equal(false);
        chai.expect(result.messages[7].recipient).to.equal(undefined);
      });
    });

    it('should query for unique patient ids, place ids and contacts', () => {
      const messages = [{
        doc: { _id: 'report_id1', reported_date: 100, patient_id: '1111' },
        value: {
          scheduled_sms: { translation_key: 'sms1', recipient: 'recipient' },
          task: { translation_key: 'task1', state: 'pending' },
          due: 300
        }
      }, {
        doc: { _id: 'report_id2', reported_date: 200, fields: { patient_id: '1111' }},
        value: {
          scheduled_sms: { translation_key: 'sms2', recipient: 'recipient' },
          task: { translation_key: 'task2', state: 'pending' },
          due: 300
        }
      }, {
        doc: { _id: 'report_id3', reported_date: 200, fields: { patient_id: '2222' } },
        value: {
          scheduled_sms: { translation_key: 'sms3', recipient: 'recipient' },
          task: { translation_key: 'task3', state: 'pending' },
          due: 300
        }
      }, {
        doc: { _id: 'report_id4', reported_date: 200, patient_id: '1111' },
        value: {
          scheduled_sms: { translation_key: 'sms4', recipient: 'recipient' },
          task: { translation_key: 'task3', state: 'pending' },
          due: 300
        }
      }, {
        doc: { _id: 'report_id5', reported_date: 200, patient_id: '2222' },
        value: {
          scheduled_sms: { translation_key: 'sms5', recipient: 'recipient' },
          task: { translation_key: 'task3', state: 'pending' },
          due: 300
        }
      }, {
        doc: { _id: 'report_id6', reported_date: 200, patient_uuid: 'patient1' },
        value: {
          scheduled_sms: { translation_key: 'sms6', recipient: 'recipient' },
          task: { translation_key: 'task3', state: 'pending' },
          due: 300
        }
      }, {
        doc: {
          _id: 'report_id7', reported_date: 200,
          fields: { patient_uuid: 'patient1' }, contact: { _id: 'patient2' }
        },
        value: {
          scheduled_sms: { translation_key: 'sms7', recipient: 'recipient' },
          task: { translation_key: 'task3', state: 'pending' },
          due: 300
        }
      }, {
        doc: { _id: 'report_id8', reported_date: 200, contact: { _id: 'patient1' } },
        value: {
          scheduled_sms: { translation_key: 'sms8', recipient: 'recipient' },
          task: { translation_key: 'task3', state: 'pending' },
          due: 300
        }
      }, {
        doc: { _id: 'report_id9', reported_date: 200, contact: { _id: 'patient3' }, patient_id: '3333' },
        value: {
          scheduled_sms: { translation_key: 'sms9', recipient: 'recipient' },
          task: { translation_key: 'task3', state: 'pending' },
          due: 300
        }
      }, {
        doc: { _id: 'report_id10', reported_date: 100, patient_id: '3333', place_id: 'place1111' },
        value: {
          scheduled_sms: { translation_key: 'sms10', recipient: 'recipient' },
          task: { translation_key: 'task3', state: 'pending' },
          due: 300
        }
      }, {
        doc: { _id: 'report_id11', reported_date: 100, fields: { patient_id: '2222', place_id: 'place2222' } },
        value: {
          scheduled_sms: { translation_key: 'sms11', recipient: 'recipient' },
          task: { translation_key: 'task3', state: 'pending' },
          due: 300
        }
      }, {
        doc: { _id: 'report_id12', reported_date: 100, fields: { patient_id: '3333', place_id: 'place1111' } },
        value: {
          scheduled_sms: { translation_key: 'sms12', recipient: 'recipient' },
          task: { translation_key: 'task3', state: 'pending' },
          due: 300
        }
      }, {
        doc: { _id: 'report_id13', reported_date: 100, fields: { place_id: 'place3333' } },
        value: {
          scheduled_sms: { translation_key: 'sms13', recipient: 'recipient' },
          task: { translation_key: 'task3', state: 'pending' },
          due: 300
        }
      }, {
        doc: { _id: 'report_id14', reported_date: 100, place_id: 'place3333' },
        value: {
          scheduled_sms: { translation_key: 'sms13', recipient: 'recipient' },
          task: { translation_key: 'task3', state: 'pending' },
          due: 300
        }
      }, {
        doc: { _id: 'report_id15', reported_date: 100, place_id: 'place4444' },
        value: {
          scheduled_sms: { translation_key: 'sms14', recipient: 'recipient' },
          task: { translation_key: 'task3', state: 'pending' },
          due: 300
        }
      }, ];

      translate.instant.callsFake(t => t);

      query
        .withArgs('medic-admin/message_queue', sinon.match({ reduce: true }))
        .resolves({ rows: [{ value: 22 }] })
        .withArgs('medic-admin/message_queue', sinon.match({ reduce: false }))
        .resolves({ rows: messages });

      query
        .withArgs('medic-client/contacts_by_reference')
        .resolves({
          rows: [
            { key: ['shortcode', '1111'], id: 'patient1' },
            { key: ['shortcode', '2222'], id: 'patient2' },
            { key: ['shortcode', 'place1111'], id: 'place1' },
            { key: ['shortcode', 'place2222'], id: 'place2' },
            { key: ['shortcode', 'place3333'], id: 'place3' },
          ],
        });

      query.withArgs('medic-client/registered_patients').resolves({ rows: [] });

      utils.lineage.fetchLineageByIds.resolves([
        [{ _id: 'patient1', patient_id: '1111', name: 'patient one' }],
        [{ _id: 'patient2', patient_id: '2222', name: 'patient two' }],
        [{ _id: 'place1', place_id: 'place1111', name: 'place one' }],
        [{ _id: 'place2', place_id: 'place2222', name: 'place two' }],
        [{ _id: 'place3', place_id: 'place3333', name: 'place three' }],
      ]);
      utils.lineage.fillParentsInDocs.callsFake(doc => doc);

      utils.messages.generate.callsFake((settings, translate, doc, content, recipient) => ([{
        message: content.translation_key,
        to: recipient
      }]));

      query
        .withArgs('medic-client/contacts_by_phone')
        .resolves({ rows: [{ key: 'recipient_id', value: 'recipient' }]});
      query
        .withArgs('medic/doc_summaries_by_id')
        .resolves({ rows: [{ key: 'recipient_id', value: { phone: 'recipient' }}]});

      return service.query('tab').then(result => {
        chai.expect(result.messages.length).to.equal(15);
        chai.expect(query.callCount).to.equal(6);
        chai.expect(query.args[2]).to.deep.equal([
          'medic-client/contacts_by_reference',
          {
            keys: [
              ['shortcode', '1111'], ['shortcode', '2222'], ['shortcode', '3333'],
              ['shortcode', 'place1111'], ['shortcode', 'place2222'], ['shortcode', 'place3333'],
              ['shortcode', 'place4444'],
            ],
          },
        ]);
        chai.expect(query.args[3]).to.deep.equal([
          'medic-client/registered_patients',
          {
            keys: ['1111', '2222', '3333', 'place1111', 'place2222', 'place3333', 'place4444'],
            include_docs: true
          }
        ]);

        chai.expect(utils.lineage.fetchLineageByIds.callCount).to.equal(1);
        chai.expect(utils.lineage.fetchLineageByIds.args[0]).to.deep.equal([
          [ 'patient1', 'patient2', 'patient3', 'place1', 'place2', 'place3' ],
        ]);

        chai.expect(query.args[4]).to.deep.equal([
          'medic-client/contacts_by_phone',
          { keys: [ 'recipient' ]}
        ]);
      });
    });

    it('filters correct registrations and calls messageUtils with correct parameters', () => {
      const messages = [{
        doc: {
          _id: 'report_id1',
          reported_date: 100,
          patient_id: '1111',
          contact: { _id: 'contact1' }
        },
        value: {
          scheduled_sms: { translation_key: 'sms1', recipient: 'recipient1', content: 'sms1_content' },
          task: { translation_key: 'task1', state: 'pending' },
          due: 300
        }
      }, {
        doc: {
          _id: 'report_id2',
          reported_date: 200,
          fields: { patient_id: '2222' },
          contact: { _id: 'contact2' }
        },
        value: {
          scheduled_sms: { translation_key: 'sms2', recipient: 'recipient2' },
          task: { translation_key: 'task2', state: 'pending' },
          due: 300
        }
      }, {
        doc: {
          _id: 'report_id3',
          reported_date: 200,
          patient_id: '3333'
        },
        value: {
          scheduled_sms: { translation_key: 'sms3', recipient: 'recipient3' },
          task: { translation_key: 'task3', state: 'pending' },
          due: 300
        }
      }, {
        doc: {
          _id: 'report_id4',
          reported_date: 200,
          place_id: 'place1111'
        },
        value: {
          scheduled_sms: { translation_key: 'sms4', recipient: 'recipient3' },
          task: { translation_key: 'task3', state: 'pending' },
          due: 300
        }
      }, {
        doc: {
          _id: 'report_id5',
          reported_date: 200,
          fields: { patient_id: '2222', place_id: 'place2222' }
        },
        value: {
          scheduled_sms: { translation_key: 'sms4', recipient: 'recipient3' },
          task: { translation_key: 'task3', state: 'pending' },
          due: 300
        }
      }, {
        doc: {
          _id: 'report_id6',
          reported_date: 200,
          fields: { place_id: 'place2222' }
        },
        value: {
          scheduled_sms: { translation_key: 'sms4', recipient: 'recipient3' },
          task: { translation_key: 'task3', state: 'pending' },
          due: 300
        }
      }];

      translate.instant.callsFake(t => t);

      query
        .withArgs('medic-admin/message_queue', sinon.match({ reduce: true }))
        .resolves({ rows: [{ value: 22 }] })
        .withArgs('medic-admin/message_queue', sinon.match({ reduce: false }))
        .resolves({ rows: messages });

      query
        .withArgs('medic-client/contacts_by_reference')
        .resolves({
          rows: [
            { key: ['shortcode', '1111'], id: 'patient1' },
            { key: ['shortcode', '2222'], id: 'patient2' },
            { key: ['shortcode', '3333'], id: 'patient3' },
            { key: ['shortcode', 'place1111'], id: 'place1' },
            { key: ['shortcode', 'place2222'], id: 'place2' },
          ]
        });

      query.withArgs('medic-client/registered_patients').resolves({ rows: [
        { key: '1111', doc: { type: 'valid', patient_id: '1111' } },
        { key: '1111', doc: { type: 'valid', patient_id: '1111' } },
        { key: '1111', doc: { type: 'invalid', patient_id: '1111' } },
        { key: '1111', doc: { type: 'valid', patient_id: '1111' } },
        { key: '2222', doc: { type: 'valid', patient_id: '2222' } },
        { key: '2222', doc: { type: 'invalid', patient_id: '2222' } },
        { key: '3333', doc: { type: 'invalid', patient_id: '3333' } },
        { key: '3333', doc: { type: 'invalid', patient_id: '3333' } },
        { key: 'place1111', doc: { type: 'invalid', place_id: 'place1111' } },
        { key: 'place1111', doc: { type: 'valid', place_id: 'place1111' } },
        { key: 'place2222', doc: { type: 'valid', place_id: 'place2222' } },
        { key: 'place2222', doc: { type: 'valid', place_id: 'place2222' } },
        { key: 'place2222', doc: { type: 'invalid', place_id: 'place2222' } },
      ]});

      utils.lineage.fetchLineageByIds.resolves([
        [{ _id: 'patient1', patient_id: '1111', name: 'patient one' }],
        [{ _id: 'patient2', patient_id: '2222', name: 'patient two' }],
        [{ _id: 'patient3', patient_id: '3333', name: 'patient three' }],
        [{ _id: 'contact1', patient_id: 'c1', name: 'contact one' }],
        [{ _id: 'contact2', patient_id: 'c2', name: 'contact two' }],
        [{ _id: 'place1', place_id: 'place1111', name: 'place one' }],
        [{ _id: 'place2', place_id: 'place2222', name: 'place two' }],
      ]);
      utils.lineage.fillParentsInDocs.callsFake(doc => doc);

      utils.messages.generate.callsFake((settings, translate, doc, content, recipient) => ([{
        message: content.translationKey || content.message,
        to: recipient
      }]));

      utils.registrations.isValidRegistration
        .withArgs(sinon.match({ type: 'valid' })).returns(true)
        .withArgs(sinon.match({ type: 'invalid' })).returns(false);

      query
        .withArgs('medic-client/contacts_by_phone')
        .resolves({ rows: [
          { key: 'recipient1', id: 'recipient1_id' },
          { key: 'recipient2', id: 'recipient2_id' },
          { key: 'recipient3', id: 'recipient3_id' }
        ]});
      query
        .withArgs('medic/doc_summaries_by_id')
        .resolves({ rows: [
          { key: 'recipient1_id', value: { phone: 'recipient1', name: 'recipient 1' }},
          { key: 'recipient2_id', value: { phone: 'recipient2', name: 'recipient 2' }},
          { key: 'recipient3_id', value: { phone: 'recipient3', name: 'recipient 3' }}
        ]});

      return service.query('tab').then((result) => {
        chai.expect(utils.registrations.isValidRegistration.callCount).to.equal(13);
        chai.expect(utils.messages.generate.callCount).to.equal(6);

        chai.expect(utils.messages.generate.args[0].slice(2)).to.deep.equal([
          {
            _id: 'report_id1',
            reported_date: 100,
            patient_id: '1111',
            contact: { _id: 'contact1', patient_id: 'c1', name: 'contact one' },
          },
          {
            translationKey: 'sms1',
            message: 'sms1_content'
          },
          'recipient1',
          {
            patient_id: '1111',
            patient: { _id: 'patient1', patient_id: '1111', name: 'patient one' },
            patient_uuid: 'patient1',
            registrations: [
              { type: 'valid', patient_id: '1111' },
              { type: 'valid', patient_id: '1111' },
              { type: 'valid', patient_id: '1111' }
            ],
            place_id: undefined,
            place_uuid: undefined,
            placeRegistrations: [],
            place: undefined,
          }
        ]);

        chai.expect(utils.messages.generate.args[1].slice(2)).to.deep.equal([
          {
            _id: 'report_id2',
            reported_date: 200,
            fields: { patient_id: '2222' },
            contact: { _id: 'contact2', patient_id: 'c2', name: 'contact two' },
          },
          {
            translationKey: 'sms2',
            message: undefined
          },
          'recipient2',
          {
            patient_id: '2222',
            patient: { _id: 'patient2', patient_id: '2222', name: 'patient two' },
            patient_uuid: 'patient2',
            registrations: [{ type: 'valid', patient_id: '2222' }],
            place_id: undefined,
            place_uuid: undefined,
            placeRegistrations: [],
            place: undefined,
          }
        ]);

        chai.expect(utils.messages.generate.args[2].slice(2)).to.deep.equal([
          {
            _id: 'report_id3',
            reported_date: 200,
            patient_id: '3333',
            contact: undefined
          },
          {
            translationKey: 'sms3',
            message: undefined
          },
          'recipient3',
          {
            patient_id: '3333',
            patient: { _id: 'patient3', patient_id: '3333', name: 'patient three' },
            patient_uuid: 'patient3',
            registrations: [],
            place_id: undefined,
            place_uuid: undefined,
            placeRegistrations: [],
            place: undefined,
          }
        ]);

        chai.expect(utils.messages.generate.args[3].slice(2)).to.deep.equal([
          {
            _id: 'report_id4',
            reported_date: 200,
            place_id: 'place1111',
            contact: undefined
          },
          {
            translationKey: 'sms4',
            message: undefined
          },
          'recipient3',
          {
            patient_id: undefined,
            patient_uuid: undefined,
            patient: undefined,
            place_id: 'place1111',
            place: { _id: 'place1', place_id: 'place1111', name: 'place one' },
            place_uuid: 'place1',
            registrations: [],
            placeRegistrations: [
              { type: 'valid', place_id: 'place1111' },
            ],
          }
        ]);

        chai.expect(utils.messages.generate.args[4].slice(2)).to.deep.equal([
          {
            _id: 'report_id5',
            reported_date: 200,
            fields: { patient_id: '2222', place_id: 'place2222' },
            contact: undefined,
          },
          {
            translationKey: 'sms4',
            message: undefined
          },
          'recipient3',
          {
            patient_id: '2222',
            patient_uuid: 'patient2',
            patient: { _id: 'patient2', patient_id: '2222', name: 'patient two' },
            place_id: 'place2222',
            place: { _id: 'place2', place_id: 'place2222', name: 'place two' },
            place_uuid: 'place2',
            registrations: [
              { type: 'valid', patient_id: '2222' },
            ],
            placeRegistrations: [
              { type: 'valid', place_id: 'place2222' },
              { type: 'valid', place_id: 'place2222' },
            ],
          }
        ]);

        chai.expect(utils.messages.generate.args[5].slice(2)).to.deep.equal([
          {
            _id: 'report_id6',
            reported_date: 200,
            fields: { place_id: 'place2222' },
            contact: undefined,
          },
          {
            translationKey: 'sms4',
            message: undefined
          },
          'recipient3',
          {
            patient_id: undefined,
            patient_uuid: undefined,
            patient: undefined,
            place_id: 'place2222',
            place: { _id: 'place2', place_id: 'place2222', name: 'place two' },
            place_uuid: 'place2',
            registrations: [],
            placeRegistrations: [
              { type: 'valid', place_id: 'place2222' },
              { type: 'valid', place_id: 'place2222' },
            ],
          }
        ]);

        chai.expect(query.withArgs('medic-client/contacts_by_phone').callCount).to.equal(1);
        chai.expect(query.withArgs('medic-client/contacts_by_phone').args[0][1]).to.deep.equal({
          keys: ['recipient1', 'recipient2', 'recipient3']
        });

        chai.expect(result.messages).to.deep.equal([
          {
            record: { id: 'report_id1', reportedDate: 100 },
            recipient: 'recipient 1',
            task: 'task1',
            state: 'pending',
            stateHistory: undefined,
            content: 'sms1',
            due: 300,
            link: false,
            error: false
          },
          {
            record: { id: 'report_id2', reportedDate: 200 },
            recipient: 'recipient 2',
            task: 'task2',
            state: 'pending',
            stateHistory: undefined,
            content: 'sms2',
            due: 300,
            link: false,
            error: false
          },
          {
            record: { id: 'report_id3', reportedDate: 200 },
            recipient: 'recipient 3',
            task: 'task3',
            state: 'pending',
            stateHistory: undefined,
            content: 'sms3',
            due: 300,
            link: false,
            error: false
          },
          {
            record: { id: 'report_id4', reportedDate: 200 },
            recipient: 'recipient 3',
            task: 'task3',
            state: 'pending',
            stateHistory: undefined,
            content: 'sms4',
            due: 300,
            link: false,
            error: false
          },
          {
            record: { id: 'report_id5', reportedDate: 200 },
            recipient: 'recipient 3',
            task: 'task3',
            state: 'pending',
            stateHistory: undefined,
            content: 'sms4',
            due: 300,
            link: false,
            error: false
          },
          {
            record: { id: 'report_id6', reportedDate: 200 },
            recipient: 'recipient 3',
            task: 'task3',
            state: 'pending',
            stateHistory: undefined,
            content: 'sms4',
            due: 300,
            link: false,
            error: false
          },
        ]);
      });
    });

    it('should format message errors', () => {
      const messages = [{
        doc: {
          _id: 'report_id1',
          reported_date: 100,
          patient_id: '1111',
          contact: { _id: 'contact1' },
          error: 'some error'
        },
        value: {
          scheduled_sms: { translation_key: 'sms1', recipient: 'recipient1', content: 'sms1_content' },
          task: { translation_key: 'task1', state: 'pending' },
          due: 300
        }
      }, {
        doc: {
          _id: 'report_id2',
          reported_date: 200,
          fields: { patient_id: '2222' },
          contact: { _id: 'contact2' },
          error: 'some other error'
        },
        value: {
          scheduled_sms: { translation_key: 'sms2', recipient: 'recipient1' },
          task: { translation_key: 'task2', state: 'pending' },
          due: 300
        }
      }];

      translate.instant.callsFake(t => t);

      query
        .withArgs('medic-admin/message_queue', sinon.match({ reduce: true }))
        .resolves({ rows: [{ value: 22 }] })
        .withArgs('medic-admin/message_queue', sinon.match({ reduce: false }))
        .resolves({ rows: messages });

      query
        .withArgs('medic-client/contacts_by_reference')
        .resolves({ rows: [
          { key: ['shortcode', '1111'], id: 'patient1' },
          { key: ['shortcode', '2222'], id: 'patient2' }
        ] });

      query.withArgs('medic-client/registered_patients').resolves({ rows: [
        { key: '1111', doc: { type: 'valid', patient_id: '1111' } },
        { key: '1111', doc: { type: 'valid', patient_id: '1111' } },
        { key: '2222', doc: { type: 'valid', patient_id: '2222' } },
        { key: '2222', doc: { type: 'invalid', patient_id: '2222' } }
      ]});

      utils.lineage.fetchLineageByIds.resolves([
        [{ _id: 'patient1', patient_id: '1111', name: 'patient one' }],
        [{ _id: 'patient2', patient_id: '2222', name: 'patient two' }],
        [{ _id: 'contact1', patient_id: 'c1', name: 'contact one' }],
        [{ _id: 'contact2', patient_id: 'c2', name: 'contact two' }],
      ]);
      utils.lineage.fillParentsInDocs.callsFake(doc => doc);

      utils.messages.generate.callsFake((settings, translate, doc, content, recipient) => ([{
        message: content.translationKey || content.message,
        to: recipient,
        error: doc.error
      }]));

      utils.registrations.isValidRegistration
        .withArgs(sinon.match({ type: 'valid' })).returns(true)
        .withArgs(sinon.match({ type: 'invalid' })).returns(false);

      query
        .withArgs('medic-client/contacts_by_phone')
        .resolves({ rows: [{ key: 'recipient1', id: 'recipien_id' }]});
      query
        .withArgs('medic/doc_summaries_by_id')
        .resolves({ rows: [{ key: 'recipient_id', value: { phone: 'recipient1', name: 'recipient' }}]});

      return service.query('tab').then((result) => {
        chai.expect(utils.registrations.isValidRegistration.callCount).to.equal(4);
        chai.expect(utils.messages.generate.callCount).to.equal(2);

        chai.expect(result.messages).to.deep.equal([
          {
            record: { id: 'report_id1', reportedDate: 100 },
            recipient: 'recipient',
            task: 'task1',
            state: 'pending',
            stateHistory: undefined,
            content: 'sms1',
            due: 300,
            link: false,
            error: 'some error'
          },
          {
            record: { id: 'report_id2', reportedDate: 200 },
            recipient: 'recipient',
            task: 'task2',
            state: 'pending',
            stateHistory: undefined,
            content: 'sms2',
            due: 300,
            link: false,
            error: 'some other error'
          }
        ]);
      });
    });
  });
});
