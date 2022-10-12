const moment = require('moment');
const assert = require('chai').assert;
const schedules = require('../../src/lib/schedules');
const config = require('../../src/config');
const sinon = require('sinon');
const messageUtils = require('@medic/message-utils');
const utils = require('../../src/lib/utils');

describe('schedules', () => {
  beforeEach(() => config.init({ getAll: sinon.stub().returns({}), }));

  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });

  it('getOffset returns false for bad syntax', () => {
    assert.equal(schedules.getOffset('x'), false);
    assert.equal(schedules.getOffset('2 muppets'), false);
    assert.equal(schedules.getOffset('one week'), false);
  });

  it('getOffset returns durations for good syntax', () => {
    assert.equal(schedules.getOffset('2 weeks').asDays(), 14);
    assert.equal(schedules.getOffset('81 days').asDays(), 81);
  });

  it('assignSchedule returns false if already has scheduled_task for that name', () => {

    const doc = {
      form: 'x',
      lmp_date: moment().valueOf(),
      scheduled_tasks: [
        {
          name: 'duckland'
        }
      ]
    };

    const added = schedules.assignSchedule(doc, {
      name: 'duckland',
      start_from: 'lmp_date',
      messages: [
        {
          group: 1,
          offset: '1 week',
          message: [{
            content: 'This is for serial number {{serial_number}}.',
            locale: 'en'
          }]
        },
        {
          group: 4,
          offset: '81 days',
          message: [{
            content: 'This is for serial number {{serial_number}}.',
            locale: 'en'
          }]
        }
      ]
    });

    assert.equal(added, false);
    assert.equal(doc.scheduled_tasks.length, 1);
  });

  it('schedule generates two messages', () => {

    const doc = {
      form: 'x',
      serial_number: 'abc',
      reported_date: moment().valueOf()
    };

    const added = schedules.assignSchedule(doc, {
      name: 'duckland',
      start_from: 'reported_date',
      messages: [
        {
          group: 1,
          offset: '1 week',
          message: [{
            content: 'This is for serial number {{serial_number}}.',
            locale: 'en'
          }]
        },
        {
          group: 4,
          offset: '81 days',
          message: [{
            content: 'This is for serial number {{serial_number}}.',
            locale: 'en'
          }]
        }
      ]
    });

    assert.equal(added, true);
    assert(doc.scheduled_tasks);
    assert.equal(doc.scheduled_tasks.length, 2);
    assert.equal(moment(doc.scheduled_tasks[1].due).diff(doc.reported_date, 'days'), 81);
  });

  it('scheduled due timestamp respects timezone', () => {
    const doc = {
      form: 'x',
      reported_date: '2050-03-13T13:06:22.002Z'
    };
    const added = schedules.assignSchedule(doc, {
      name: 'duckland',
      start_from: 'reported_date',
      messages: [
        {
          group: 1,
          offset: '1 day',
          send_time: '08:00 +00:00',
          message: [{
            content: 'This is for serial number {{serial_number}}.',
            locale: 'en'
          }]
        }
      ]
    });
    assert.equal(added, true);
    assert.equal(doc.scheduled_tasks.length, 1);
    assert.equal(
      moment(doc.scheduled_tasks[0].due).toISOString(),
      '2050-03-14T08:00:00.000Z'
    );
  });

  it('scheduled due timestamp respects send_day Monday', () => {
    const doc = {
      form: 'x',
      reported_date: '2050-03-13T13:06:22.002Z'
    };
    const added = schedules.assignSchedule(doc, {
      name: 'duckland',
      start_from: 'reported_date',
      messages: [
        {
          group: 1,
          offset: '2 weeks',
          send_day: 'Monday',
          message: [{
            content: 'Woot',
            locale: 'en'
          }]
        }
      ]
    });
    assert.equal(added, true);
    assert.equal(doc.scheduled_tasks.length, 1);
    assert.equal(
      moment(doc.scheduled_tasks[0].due).format('dddd'),
      'Monday'
    );
  });

  it('scheduled due timestamp respects send_day Wednesday', () => {
    const doc = {
      form: 'x',
      reported_date: '2050-03-13T13:06:22.002Z'
    };
    const added = schedules.assignSchedule(doc, {
      name: 'duckland',
      start_from: 'reported_date',
      messages: [
        {
          group: 1,
          offset: '2 weeks',
          send_day: 'Wednesday',
          message: [{
            content: 'Woot',
            locale: 'en'
          }]
        }
      ]
    });
    assert.equal(added, true);
    assert.equal(doc.scheduled_tasks.length, 1);
    assert.equal(
      moment(doc.scheduled_tasks[0].due).format('dddd'),
      'Wednesday'
    );
  });

  it('scheduled due timestamp respects send_day and send_time', () => {
    const doc = {
      form: 'x',
      reported_date: '2050-03-13T13:06:22.002Z'
    };
    const added = schedules.assignSchedule(doc, {
      name: 'duckland',
      start_from: 'reported_date',
      messages: [
        {
          group: 1,
          offset: '2 weeks',
          send_day: 'Wednesday',
          send_time: '08:00 +0000',
          message: [{
            content: 'Woot',
            locale: 'en'
          }]
        }
      ]
    });
    assert.equal(added, true);
    assert.equal(doc.scheduled_tasks.length, 1);
    assert.equal(
      moment(doc.scheduled_tasks[0].due).toISOString(),
      '2050-03-30T08:00:00.000Z'
    );
    assert.equal(
      moment(doc.scheduled_tasks[0].due).format('dddd'),
      'Wednesday'
    );
  });

  it('scheduled item without message is skipped', () => {
    const doc = {
      form: 'x',
      reported_date: '2050-03-13T13:06:22.002Z'
    };
    const added = schedules.assignSchedule(doc, {
      name: 'duckland',
      start_from: 'reported_date',
      messages: [
        {
          group: 1,
          offset: '1 day',
          send_time: '08:00 +00:00',
          message: ''
        }
      ]
    });
    assert.equal(added, false);
    assert(!doc.scheduled_tasks);
  });

  it('scheduled item with only spaces message is skipped', () => {
    const doc = {
      form: 'x',
      reported_date: '2050-03-13T13:06:22.002Z'
    };
    const added = schedules.assignSchedule(doc, {
      name: 'duckland',
      start_from: 'reported_date',
      messages: [
        {
          group: 1,
          offset: '1 day',
          send_time: '08:00 +00:00',
          message: [{
            content: '  ',
            locale: 'en'
          }]
        }
      ]
    });
    assert.equal(added, false);
    assert(!doc.scheduled_tasks);
  });

  it('schedule does not generate messages in past', () => {
    const doc = {
      form: 'x',
      serial_number: 'abc',
      some_date: moment().subtract(12, 'weeks').toISOString()
    };

    const added = schedules.assignSchedule(doc, {
      name: 'duckland',
      start_from: 'some_date',
      messages: [
        {
          group: 1,
          offset: '1 week',
          message: [{
            content: 'This is for serial number {{serial_number}}.',
            locale: 'en'
          }]
        },
        {
          group: 4,
          offset: '20 weeks',
          message: [{
            content: 'This is for serial number {{serial_number}}.',
            locale: 'en'
          }]
        }
      ]
    });

    assert.equal(added, true);
    assert(doc.scheduled_tasks);
    assert.equal(doc.scheduled_tasks.length, 1);
    assert.equal(moment(doc.scheduled_tasks[0].due).diff(doc.some_date, 'weeks'), 20);
  });

  it('when start from is null skip schedule creation', () => {
    const doc = {
      form: 'x',
      reported_date: null
    };

    const added = schedules.assignSchedule(doc, {
      name: 'duckland',
      start_from: 'reported_date',
      messages: [
        {
          group: 1,
          offset: '1 week',
          message: [{
            content: 'This is for serial number {{serial_number}}.',
            locale: 'en'
          }]
        },
        {
          group: 4,
          offset: '81 days',
          message: [{
            content: 'This is for serial number {{serial_number}}.',
            locale: 'en'
          }]
        }
      ]
    });

    assert.equal(added, true);
    assert(!doc.scheduled_tasks);
  });

  it('alreadyRun validation', () => {
    assert.equal(schedules.alreadyRun({}, 'x'), false);
    assert.equal(schedules.alreadyRun({
      scheduled_tasks: [
        {
          name: 'y'
        }
      ]
    }, 'x'), false);
    assert.equal(schedules.alreadyRun({
      scheduled_tasks: [
        {
          name: 'x'
        }
      ]
    }, 'x'), true);
    assert.equal(schedules.alreadyRun({
      tasks: [
        {
          name: 'y'
        }
      ],
      scheduled_tasks: [
        {
          name: 'y'
        }
      ]
    }, 'x'), false);
    assert.equal(schedules.alreadyRun({
      tasks: [
        {
          name: 'x'
        }
      ],
      scheduled_tasks: [
        {
          name: 'y'
        }
      ]
    }, 'x'), true);
  });

  it('assignSchedule sends correct config to messageUtils', () => {
    const doc = {
      form: 'x',
      serial_number: 'abc',
      reported_date: moment().valueOf(),
      fields: {
        some_date: moment().add(10, 'days').valueOf(),
      }
    };

    const configuration = {
      locale_outgoing: 'sw',
      date_format: 'dddd, Do MMMM YYYY'
    };
    config.getAll.returns(configuration);

    schedules.assignSchedule(doc, {
      name: 'duckland',
      start_from: 'reported_date',
      messages: [
        {
          group: 1,
          offset: '1 week',
          message: [{
            content: '{{#date}}{{some_date}}{{/date}}',
            locale: 'en'
          }]
        }
      ]
    });

    assert.equal(
      doc.scheduled_tasks[0].messages[0].message,
      moment(doc.fields.some_date).locale('sw').format('dddd, Do MMMM YYYY')
    );
    assert.equal(config.getAll.callCount, 2);
  });

  it('skips a group when starting mid-group by default', () => {
    const doc = {
      form: 'x',
      lmp_date: moment().valueOf()
    };

    const added = schedules.assignSchedule(doc, {
      name: 'duckland',
      start_from: 'lmp_date',
      start_mid_group: false,
      messages: [
        {
          group: 1,
          offset: '-12 weeks',
          message: [{
            content: 'Past message.',
            locale: 'en'
          }]
        },
        {
          group: 1,
          offset: '13 weeks',
          message: [{
            content: 'Future message.',
            locale: 'en'
          }]
        }
      ]
    });

    assert.equal(added, false);
    assert(!doc.scheduled_tasks);
  });

  it('does not skip a group when starting mid-group and flag start_mid_group is true', () => {
    const doc = {
      form: 'x',
      lmp_date: moment().valueOf()
    };

    const added = schedules.assignSchedule(doc, {
      name: 'duckland',
      start_from: 'lmp_date',
      start_mid_group: true,
      messages: [
        {
          group: 1,
          offset: '-12 weeks',
          message: [{
            content: 'Past message.',
            locale: 'en'
          }]
        },
        {
          group: 1,
          offset: '13 weeks',
          message: [{
            content: 'Future message.',
            locale: 'en'
          }]
        }
      ]
    });

    assert.equal(added, true);
    assert.equal(doc.scheduled_tasks.length, 1);
  });

  describe('should pass correct context to messageUtils', () => {
    it('with patient', () => {
      const schedule = {
        name: 'for patient',
        start_from: 'reported_date',
        messages: [{
          recipient: 'reporting_unit',
          group: 1,
          offset: '1 day',
          message: [{
            content: '{{name}} {{age}} {{reg_field}}',
            locale: 'en',
          }]
        }]
      };
      const doc = {
        form: 'x',
        reported_date: moment().valueOf(),
      };
      const patient = { _id: 'patient', name: 'patients name', age: '42' };
      const patientRegistrations = [{ _id: 'registration_1', reg_field: 'some reg field' }];

      sinon.spy(messageUtils, 'generate');

      schedules.assignSchedule(doc, schedule, { patient, patientRegistrations });

      assert.equal(messageUtils.generate.callCount, 1);
      assert.deepEqual(messageUtils.generate.args[0], [
        {},
        utils.translate,
        doc,
        schedule.messages[0],
        schedule.messages[0].recipient,
        {
          patient,
          registrations: patientRegistrations,
          place: undefined,
          placeRegistrations: undefined,
        },
      ]);

      assert.equal(doc.scheduled_tasks.length, 1);
      assert.equal(doc.scheduled_tasks[0].messages[0].message, 'patients name 42 some reg field');
    });

    it('with place', () => {
      const schedule = {
        name: 'for patient',
        start_from: 'reported_date',
        messages: [{
          recipient: 'reporting_unit',
          group: 1,
          offset: '1 day',
          message: [{
            content: '{{name}} {{code}} {{municipality}}',
            locale: 'en',
          }]
        }]
      };
      const doc = {
        form: 'x',
        reported_date: moment().valueOf(),
      };
      const place = { _id: 'place', name: 'the place', code: '1984' };
      const placeRegistrations = [{ _id: 'registration_1', municipality: 'Theraria' }];

      sinon.spy(messageUtils, 'generate');

      schedules.assignSchedule(doc, schedule, { place, placeRegistrations });

      assert.equal(messageUtils.generate.callCount, 1);
      assert.deepEqual(messageUtils.generate.args[0], [
        {},
        utils.translate,
        doc,
        schedule.messages[0],
        schedule.messages[0].recipient,
        {
          patient: undefined,
          registrations: undefined,
          place: place,
          placeRegistrations: placeRegistrations,
        },
      ]);

      assert.equal(doc.scheduled_tasks.length, 1);
      assert.equal(doc.scheduled_tasks[0].messages[0].message, 'the place 1984 Theraria');
    });

    it('with patient and place', () => {
      const schedule = {
        name: 'for patient',
        start_from: 'reported_date',
        messages: [{
          recipient: 'reporting_unit',
          group: 1,
          offset: '1 day',
          message: [{
            content: '{{age}} {{parent_name}} {{code}} {{municipality}}',
            locale: 'en',
          }]
        }]
      };
      const doc = {
        form: 'x',
        reported_date: moment().valueOf(),
      };
      const patient = { _id: 'patient', age: '32' };
      const patientRegistrations = [{ _id: 'reg', parent_name: 'hector' }];
      const place = { _id: 'place', code: '1984' };
      const placeRegistrations = [{ _id: 'registration_1', municipality: 'Theraria' }];

      sinon.spy(messageUtils, 'generate');

      schedules.assignSchedule(doc, schedule, { place, placeRegistrations, patient, patientRegistrations });

      assert.equal(messageUtils.generate.callCount, 1);
      assert.deepEqual(messageUtils.generate.args[0], [
        {},
        utils.translate,
        doc,
        schedule.messages[0],
        schedule.messages[0].recipient,
        {
          patient: patient,
          registrations: patientRegistrations,
          place: place,
          placeRegistrations: placeRegistrations,
        },
      ]);

      assert.equal(doc.scheduled_tasks.length, 1);
      assert.equal(doc.scheduled_tasks[0].messages[0].message, '32 hector 1984 Theraria');
    });

    it('with neither patient nor place', () => {
      const schedule = {
        name: 'for patient',
        start_from: 'reported_date',
        messages: [{
          recipient: 'reporting_unit',
          group: 1,
          offset: '1 day',
          message: [{
            content: '{{field}}',
            locale: 'en',
          }]
        }]
      };
      const doc = {
        form: 'x',
        reported_date: moment().valueOf(),
        field: 'hello kitty',
      };

      sinon.spy(messageUtils, 'generate');

      schedules.assignSchedule(doc, schedule);

      assert.equal(messageUtils.generate.callCount, 1);
      assert.deepEqual(messageUtils.generate.args[0], [
        {},
        utils.translate,
        doc,
        schedule.messages[0],
        schedule.messages[0].recipient,
        {
          patient: undefined,
          registrations: undefined,
          place: undefined,
          placeRegistrations: undefined,
        },
      ]);

      assert.equal(doc.scheduled_tasks.length, 1);
      assert.equal(doc.scheduled_tasks[0].messages[0].message, 'hello kitty');
    });
  });
});
