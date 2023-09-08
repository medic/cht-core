const moment = require('moment');
const utils = require('./utils');
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

describe('add-uuid-to-scheduled-tasks migration', function() {
  afterEach(function() {
    return utils.tearDown();
  });

  const FUTURE = moment().add(1, 'week').toISOString();
  const PAST = moment().subtract(1, 'week').toISOString();

  it('adds uuids to messages', function() {

    // given
    return utils.initDb([
      {
        _id: 'abc',
        type: 'data_record',
        form: 'R',
        scheduled_tasks: [
          {
            due: PAST,
            messages: [
              { to: '+123456' }
            ]
          },
          {
            due: FUTURE,
            messages: [
              { to: '+123456' },
              { to: '+098765' }
            ]
          },
          {
            due: FUTURE,
            messages: [
              { to: '+123456' }
            ]
          },
          {
            due: FUTURE,
            messages: [
              { to: '+123456', uuid: 'existinguuid' }
            ]
          }
        ]
      }
    ])
      .then(function() {
        return utils.initSettings({
          schedules: [{ // this is the default config
            name: 'some schedule',
            summary: '',
            description: '',
            start_from: '',
            messages: [
              {
                message: [
                  {
                    content: '',
                    locale: ''
                  }
                ],
                group: 1,
                offset: '',
                send_day: 'monday',
                send_time: '',
                recipient: ''
              }
            ]
          }]
        });
      })
      .then(function() {

        // when
        return utils.runMigration('add-uuid-to-scheduled-tasks');

      })
      .then(function() {

        // expect
        return utils.assertDb([
          {
            _id: 'abc',
            type: 'data_record',
            form: 'R',
            scheduled_tasks: [
              {
                due: PAST,
                messages: [
                  { to: '+123456' } // overdue messages should not be corrected
                ]
              },
              {
                due: FUTURE,
                messages: [
                  { to: '+123456', uuid: UUID_REGEX },
                  { to: '+098765', uuid: UUID_REGEX }
                ]
              },
              {
                due: FUTURE,
                messages: [
                  { to: '+123456', uuid: UUID_REGEX }
                ]
              },
              {
                due: FUTURE,
                messages: [
                  { to: '+123456', uuid: 'existinguuid' } // existing uuids are left
                ]
              }
            ]
          }
        ]);

      });
  });

  it('does nothing when no schedules configured', function() {

    // given
    return utils.initDb([
      {
        _id: 'abc',
        type: 'data_record',
        form: 'R',
        scheduled_tasks: [
          {
            due: FUTURE,
            messages: [
              { to: '+123456' }
            ]
          }
        ]
      }
    ])
      .then(function() {
        return utils.initSettings({
          schedules: [{ // this is the default config
            name: '',
            summary: '',
            description: '',
            start_from: '',
            messages: [
              {
                message: [
                  {
                    content: '',
                    locale: ''
                  }
                ],
                group: 1,
                offset: '',
                send_day: 'monday',
                send_time: '',
                recipient: ''
              }
            ]
          }]
        });
      })
      .then(function() {

        // when
        return utils.runMigration('add-uuid-to-scheduled-tasks');

      })
      .then(function() {

        // expect
        return utils.assertDb([
          {
            _id: 'abc',
            type: 'data_record',
            form: 'R',
            scheduled_tasks: [
              {
                due: FUTURE,
                messages: [
                  { to: '+123456' } // unchanged due to no schedules config
                ]
              }
            ]
          }
        ]);

      });
  });

});
