var moment = require('moment'),
    assert = require('chai').assert,
    schedules = require('../../src/lib/schedules'),
    config = require('../../src/config'),
    sinon = require('sinon');

describe('schedules', () => {
  afterEach(() => sinon.restore());

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

    var doc = {
        form: 'x',
        lmp_date: moment().valueOf(),
        scheduled_tasks: [
            {
                name: 'duckland'
            }
        ]
    };

    var added = schedules.assignSchedule(doc, {
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

      var doc = {
          form: 'x',
          serial_number: 'abc',
          reported_date: moment().valueOf()
      };

      var added = schedules.assignSchedule(doc, {
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
      var doc = {
          form: 'x',
          reported_date: '2050-03-13T13:06:22.002Z'
      };
      var added = schedules.assignSchedule(doc, {
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
      var doc = {
          form: 'x',
          reported_date: '2050-03-13T13:06:22.002Z'
      };
      var added = schedules.assignSchedule(doc, {
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
      var doc = {
          form: 'x',
          reported_date: '2050-03-13T13:06:22.002Z'
      };
      var added = schedules.assignSchedule(doc, {
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
      var doc = {
          form: 'x',
          reported_date: '2050-03-13T13:06:22.002Z'
      };
      var added = schedules.assignSchedule(doc, {
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
      var doc = {
          form: 'x',
          reported_date: '2050-03-13T13:06:22.002Z'
      };
      var added = schedules.assignSchedule(doc, {
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
      var doc = {
          form: 'x',
          reported_date: '2050-03-13T13:06:22.002Z'
      };
      var added = schedules.assignSchedule(doc, {
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
      var added,
          doc;

      doc = {
          form: 'x',
          serial_number: 'abc',
          some_date: moment().subtract(12, 'weeks').toISOString()
      };

      added = schedules.assignSchedule(doc, {
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
      var added;

      var doc = {
          form: 'x',
          reported_date: null
      };

      added = schedules.assignSchedule(doc, {
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
    sinon.stub(config, 'getAll').returns(configuration);

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
    assert.equal(config.getAll.callCount, 1);
  });
});
