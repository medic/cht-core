const transition = require('../../src/transitions/registration'),
      schedules = require('../../src/lib/schedules'),
      sinon = require('sinon'),
      assert = require('chai').assert,
      moment = require('moment'),
      utils = require('../../src/lib/utils'),
      contact = {
        phone: '+1234',
        name: 'Julie',
        parent: {
          contact: {
            phone: '+1234',
            name: 'Julie'
          }
        }
      };

const getMessage = (doc, idx) =>
  doc &&
  doc.tasks &&
  doc.tasks.length &&
  doc.tasks[idx] &&
  doc.tasks[idx].messages &&
  doc.tasks[idx].messages.length &&
  doc.tasks[idx].messages[0];

const getScheduledMessage = (doc, idx) =>
  doc &&
  doc.scheduled_tasks &&
  doc.scheduled_tasks.length &&
  doc.scheduled_tasks[idx] &&
  doc.scheduled_tasks[idx].messages &&
  doc.scheduled_tasks[idx].messages.length &&
  doc.scheduled_tasks[idx].messages[0];

describe('functional schedules', () => {
  afterEach(() => sinon.restore());

  it('registration sets up schedule', () => {

    sinon.stub(transition, 'getConfig').returns([{
      form: 'PATR',
      events: [
        {
          name: 'on_create',
          trigger: 'assign_schedule',
          params: 'group1',
          bool_expr: ''
        }
      ],
      validations: [],
      messages: [
        {
          message: [{
            content: 'thanks {{contact.name}}',
            locale: 'en'
          }],
          recipient: 'reporting_unit'
        }
      ]
    }]);
    sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, []);
    sinon.stub(schedules, 'getScheduleConfig').returns({
      name: 'group1',
      start_from: 'reported_date',
      registration_response: '',
      messages: [
        {
          message: [{
            content: 'Mustaches.  Overrated or underrated?',
            locale: 'en'
          }],
          group: 1,
          offset: '12 weeks',
          send_time: '',
          recipient: 'reporting_unit'
        }
      ]
    });

    const doc = {
      reported_date: moment().toISOString(),
      form: 'PATR',
      from: contact.phone,
      contact: contact
    };

    return transition.onMatch({ doc: doc }).then(complete => {
      assert.equal(complete, true);
      assert(doc.tasks);
      assert.equal(doc.tasks && doc.tasks.length, 1);
      assert(doc.scheduled_tasks);
      assert.equal(doc.scheduled_tasks && doc.scheduled_tasks.length, 1);

      testMessage(
          getMessage(doc, 0),
          '+1234',
          'thanks Julie');

      /*
       * Also checks that recipient using doc property value is resolved
       * correctly.
       */
      testMessage(
          getScheduledMessage(doc, 0),
          '+1234',
          'Mustaches.  Overrated or underrated?');

    });
  });

  it('registration sets up schedule using translation_key', () => {

    sinon.stub(transition, 'getConfig').returns([{
      form: 'PATR',
      events: [{
        name: 'on_create',
        trigger: 'assign_schedule',
        params: 'group1',
        bool_expr: ''
      }],
      validations: [],
      messages: [{
        translation_key: 'thanks',
        recipient: 'reporting_unit'
      }]
    }]);
    sinon.stub(schedules, 'getScheduleConfig').returns({
      name: 'group1',
      start_from: 'reported_date',
      registration_response: '',
      messages: [{
        translation_key: 'facial.hair',
        group: 1,
        offset: '12 weeks',
        send_time: '',
        recipient: 'reporting_unit'
      }]
    });
    sinon.stub(utils, 'getPatientContact').callsArgWith(1, null, {_id: 'uuid'});
    sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, []);
    sinon.stub(utils, 'translate')
      .withArgs('thanks', 'en').returns('thanks {{contact.name}}')
      .withArgs('facial.hair', 'en').returns('Mustaches.  Overrated or underrated?');

    const doc = {
      reported_date: moment().toISOString(),
      form: 'PATR',
      from: contact.phone,
      contact: contact
    };

    return transition.onMatch({ doc: doc }).then(complete => {
      assert.equal(complete, true);
      assert(doc.tasks);
      assert.equal(doc.tasks && doc.tasks.length, 1);
      assert(doc.scheduled_tasks);
      assert.equal(doc.scheduled_tasks && doc.scheduled_tasks.length, 1);

      testMessage(
          getMessage(doc, 0),
          '+1234',
          'thanks Julie');

      // check that message generation is deferred until later
      assert.equal(doc.scheduled_tasks.length, 1);
      assert.equal(doc.scheduled_tasks[0].messages, undefined);

    });
  });

  it('registration sets up schedule using bool_expr', () => {

    sinon.stub(transition, 'getConfig').returns([{
      form: 'PATR',
      events: [
        {
          name: 'on_create',
          trigger: 'assign_schedule',
          params: 'group1',
          bool_expr: 'doc.foo === "baz"'
        }
      ],
      validations: [],
      messages: [
        {
          message: [{
            content: 'thanks {{contact.name}}',
            locale: 'en'
          }],
          recipient: 'reporting_unit'
        }
      ]
    }]);
    sinon.stub(utils, 'getPatientContact').callsArgWith(1, null, {_id: 'uuid'});
    sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, []);
    sinon.stub(schedules, 'getScheduleConfig').returns({
      name: 'group1',
      start_from: 'reported_date',
      registration_response: '',
      messages: [
        {
          message: [{
            content: 'Mustaches.  Overrated or underrated?',
            locale: 'en'
          }],
          group: 1,
          offset: '12 weeks',
          send_time: '',
          recipient: 'reporting_unit'
        }
      ]
    });

    const doc = {
      reported_date: moment().toISOString(),
      form: 'PATR',
      from: contact.phone,
      contact: contact,
      foo: 'baz'
    };

    return transition.onMatch({ doc: doc }).then(complete => {
      assert.equal(complete, true);
      assert(doc.tasks);
      assert.equal(doc.tasks && doc.tasks.length, 1);
      assert(doc.scheduled_tasks);
      assert.equal(doc.scheduled_tasks && doc.scheduled_tasks.length, 1);

      testMessage(
          getMessage(doc, 0),
          '+1234',
          'thanks Julie');

      /*
       * Also checks that recipient using doc property value is resolved
       * correctly.
       */
      testMessage(
          getScheduledMessage(doc, 0),
          '+1234',
          'Mustaches.  Overrated or underrated?');
    });
  });

  it('patients chp is resolved correctly as recipient', () => {
    sinon.stub(transition, 'getConfig').returns([{
      form: 'PATR',
      events: [],
      validations: [],
      messages: [{
        translation_key: 'thanks',
        recipient: 'patient.parent.contact.phone'
      }]
    }]);
    sinon.stub(schedules, 'getScheduleConfig').returns({});
    sinon.stub(utils, 'getPatientContactUuid').callsArgWith(1, null, {_id: 'uuid'});
    sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, []);
    sinon.stub(utils, 'translate').withArgs('thanks', 'en').returns('thanks');

    const doc = {
      reported_date: moment().toISOString(),
      form: 'PATR',
      from: contact.phone,
      contact: contact,
      fields: { patient_id: '98765' },
      patient: { parent: { contact: { phone: '+5551596' } } }
    };

    return transition.onMatch({ doc: doc }).then(complete => {
      assert.equal(complete, true);
      assert(doc.tasks);
      assert.equal(doc.tasks && doc.tasks.length, 1);

      testMessage(
          getMessage(doc, 0),
          '+5551596',
          'thanks');
    });
  });

  it('two phase registration sets up schedule using bool_expr', () => {

    sinon.stub(transition, 'getConfig').returns([{
      form: 'PATR',
      events: [
        {
          name: 'on_create',
          trigger: 'assign_schedule',
          params: 'group1',
          bool_expr: 'doc.foo === "baz"'
        }
      ],
      validations: [],
      messages: [
        {
          message: [{
            content: 'thanks for registering {{patient_name}}',
            locale: 'en'
          }],
          recipient: 'reporting_unit'
        }
      ]
    }]);
    const getRegistrations = sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, [ { fields: { patient_name: 'barry' } } ]);
    sinon.stub(schedules, 'getScheduleConfig').returns({
      name: 'group1',
      start_from: 'reported_date',
      registration_response: '',
      messages: [
        {
          message: [{
            content: 'Remember to visit {{patient_name}}',
            locale: 'en'
          }],
          group: 1,
          offset: '12 weeks',
          send_time: '',
          recipient: 'reporting_unit'
        }
      ]
    });

    sinon.stub(utils, 'getPatientContactUuid').callsArgWith(1, null, {_id: 'uuid'});
    const doc = {
      reported_date: moment().toISOString(),
      form: 'PATR',
      from: contact.phone,
      contact: contact,
      foo: 'baz',
      fields: { patient_id: '123' },
      patient: {
        _id: 'uuid'
      }
    };

    return transition.onMatch({ doc: doc }).then(complete => {
      assert.equal(complete, true);
      assert(doc.tasks);
      assert.equal(doc.tasks && doc.tasks.length, 1);
      assert(doc.scheduled_tasks);
      assert.equal(doc.scheduled_tasks && doc.scheduled_tasks.length, 1);

      testMessage(
          getMessage(doc, 0),
          '+1234',
          'thanks for registering barry');

      /*
       * Also checks that recipient using doc property value is resolved
       * correctly.
       */
      testMessage(
          getScheduledMessage(doc, 0),
          '+1234',
          'Remember to visit barry');

      assert.equal(getRegistrations.callCount, 2);
      assert.equal(getRegistrations.args[0][0].id, '123');
    });
  });

  it('no schedule using false bool_expr', () => {

    sinon.stub(transition, 'getConfig').returns([{
      form: 'PATR',
      events: [
        {
          name: 'on_create',
          trigger: 'assign_schedule',
          params: 'group1',
          bool_expr: 'doc.foo === "notbaz"'
        }
      ],
      validations: [],
      messages: [
        {
          message: [{
            content: 'thanks {{contact.name}}',
            locale: 'en'
          }],
          recipient: 'reporting_unit'
        }
      ]
    }]);
    sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, []);
    sinon.stub(utils, 'getPatientContact').callsArgWith(1, null, {_id: 'uuid'});
    sinon.stub(schedules, 'getScheduleConfig').returns({
      name: 'group1',
      start_from: 'reported_date',
      registration_response: '',
      messages: [
        {
          message: [{
            content: 'Mustaches.  Overrated or underrated?',
            locale: 'en'
          }],
          group: 1,
          offset: '12 weeks',
          send_time: '',
          recipient: 'reporting_unit'
        }
      ]
    });

    const doc = {
      reported_date: moment().toISOString(),
      form: 'PATR',
      contact: contact,
      foo: 'baz'
    };

    return transition.onMatch({ doc: doc }).then(complete => {
      assert.equal(complete, true);
      assert(doc.tasks);
      assert.equal(doc.tasks && doc.tasks.length, 1);
      assert(!doc.scheduled_tasks);

      testMessage(
          getMessage(doc, 0),
          '+1234',
          'thanks Julie');
    });
  });

  it('sets correct task state when patient is muted', () => {
    sinon.stub(transition, 'getConfig').returns([{
      form: 'PATR',
      events: [{
        name: 'on_create',
        trigger: 'assign_schedule',
        params: 'group1',
        bool_expr: ''
      } ],
      validations: [],
      messages: [{
        message: [{
          content: 'thanks {{contact.name}}',
          locale: 'en'
        }],
        recipient: 'reporting_unit'
      }]
    }]);
    sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, []);
    sinon.stub(schedules, 'getScheduleConfig').returns({
      name: 'group1',
      start_from: 'reported_date',
      registration_response: '',
      messages: [{
        message: [{
          content: 'Mustaches.  Overrated or underrated?',
          locale: 'en'
        }],
        group: 1,
        offset: '12 weeks',
        send_time: '',
        recipient: 'reporting_unit'
      }]
    });

    const patient = { muted: true, parent: { contact: { phone: '+5551596' } } };
    const doc = {
      reported_date: moment().toISOString(),
      form: 'PATR',
      from: contact.phone,
      contact: contact,
      fields: { patient_id: '98765' },
      patient: patient
    };
    sinon.stub(utils, 'getPatientContact').callsArgWith(1, null, {_id: 'uuid'});
    sinon.stub(utils, 'getPatientContactUuid').callsArgWith(1, null, 'uuid');

    return transition.onMatch({ doc: doc })
      .then(complete => {
        assert.equal(complete, true);
        assert(doc.tasks);
        assert.equal(doc.tasks && doc.tasks.length, 1);
        assert(doc.scheduled_tasks);
        assert.equal(doc.scheduled_tasks && doc.scheduled_tasks.length, 1);
        assert.equal(doc.scheduled_tasks[0].state, 'muted');
      });
  });

  it('sets correct task state when patient is not muted', () => {
    sinon.stub(transition, 'getConfig').returns([{
      form: 'PATR',
      events: [{
        name: 'on_create',
        trigger: 'assign_schedule',
        params: 'group1',
        bool_expr: ''
      } ],
      validations: [],
      messages: [{
        message: [{
          content: 'thanks {{contact.name}}',
          locale: 'en'
        }],
        recipient: 'reporting_unit'
      }]
    }]);
    sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, []);
    sinon.stub(schedules, 'getScheduleConfig').returns({
      name: 'group1',
      start_from: 'reported_date',
      registration_response: '',
      messages: [{
        message: [{
          content: 'Mustaches.  Overrated or underrated?',
          locale: 'en'
        }],
        group: 1,
        offset: '12 weeks',
        send_time: '',
        recipient: 'reporting_unit'
      }]
    });

    const patient = { muted: false, parent: { contact: { phone: '+5551596' } } };
    const doc = {
      reported_date: moment().toISOString(),
      form: 'PATR',
      from: contact.phone,
      contact: contact,
      fields: { patient_id: '98765' },
      patient: patient
    };
    sinon.stub(utils, 'getPatientContact').callsArgWith(1, null, {_id: 'uuid'});
    sinon.stub(utils, 'getPatientContactUuid').callsArgWith(1, null, 'uuid');

    return transition.onMatch({ doc: doc })
      .then(complete => {
        assert.equal(complete, true);
        assert(doc.tasks);
        assert.equal(doc.tasks && doc.tasks.length, 1);
        assert(doc.scheduled_tasks);
        assert.equal(doc.scheduled_tasks && doc.scheduled_tasks.length, 1);
        assert.equal(doc.scheduled_tasks[0].state, 'scheduled');
      });
  });

  function testMessage(message, expectedTo, expectedContent) {
    assert(/^[a-z0-9-]*$/.test(message.uuid));
    assert.equal(message.to, expectedTo);
    assert.equal(message.message, expectedContent);
  }
});
