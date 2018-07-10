describe('FormatDataRecord service', () => {

  'use strict';

  let service,
      Settings = sinon.stub(),
      Language = sinon.stub();

  beforeEach(() => {
    module('inboxApp');
    module(function($provide) {
      $provide.value('Settings', Settings);
      $provide.value('Language', Language);
      $provide.value('FormatDate', {
        relative: function() {
          return 'sometime';
        }
      });
      $provide.factory('DB', KarmaUtils.mockDB({ }));
      $provide.value('$q', Q); // bypass $q so we don't have to digest
    });
    inject(_FormatDataRecord_ => {
      service = _FormatDataRecord_;
    });
  });

  afterEach(() => sinon.restore());

  it('generates cleared messages', done => {
    const doc = {
      from: '+123456',
      scheduled_tasks: [
        {
          message_key: 'some.message',
          state: 'cleared',
          recipient: 'reporting_unit'
        }
      ]
    };
    const settings = {};
    Settings.returns(Promise.resolve(settings));
    Language.returns(Promise.resolve('en'));
    service(doc)
      .then(formatted => {
        chai.expect(formatted.scheduled_tasks_by_group.length).to.equal(1);
        chai.expect(formatted.scheduled_tasks_by_group[0].rows.length).to.equal(1);
        const row = formatted.scheduled_tasks_by_group[0].rows[0];
        chai.expect(row.messages.length).to.equal(1);
        const message = row.messages[0];
        chai.expect(message.to).to.equal('+123456');
        chai.expect(message.message).to.equal('some.message');
        done();
      })
      .catch(done);
  });

});
