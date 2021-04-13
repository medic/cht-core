const chai = require('chai');
const sinon = require('sinon');
const runNoolsLib = require('../run-nools-lib');
const {
  TEST_DAY,
  reset,
  aReportBasedTask,
  aPersonBasedTask,
  aPlaceBasedTask,
  aScheduledTaskBasedTask,
  aReport,
  aReportWithScheduledTasks,
  personWithoutReports,
  configurableHierarchyPersonWithReports,
  unknownContactWithReports,
  personWithReports,
  placeWithoutReports,
} = require('./mocks');

const { assert, expect } = chai;
chai.use(require('chai-shallow-deep-equal'));

describe('task-emitter', () => {
  beforeEach(() => reset());

  describe('tasks', () => {
    describe('person-based', () => {

      it('should emit once for a person based task', () => {
        // given
        const config = {
          c: personWithoutReports(),
          targets: [],
          tasks: [ aPersonBasedTask() ],
        };

        // when
        const { emitted } = runNoolsLib(config);

        // then
        assert.shallowDeepEqual(emitted, [
          {
            _type: 'task',
            date: TEST_DAY,
            resolved: false,
            actions:[ { form:'example-form' } ]
          },
        ]);
      });

      it('appliesToType filters by type', () => {
        // given
        const config = {
          c: personWithReports(aReport()),
          targets: [],
          tasks: [ aPersonBasedTask() ],
        };
        config.tasks[0].appliesToType = ['dne'];

        // when
        const { emitted } = runNoolsLib(config);

        // then
        expect(emitted).to.have.length(1);
      });

      it('appliesToType is not required', () => {
        // given
        const config = {
          c: personWithReports(aReport()),
          targets: [],
          tasks: [ aPersonBasedTask() ],
        };
        delete config.tasks[0].appliesToType;

        // when
        const { emitted } = runNoolsLib(config);

        // then
        expect(emitted[0]).to.nested.include({
          'actions[0].content.source_id': 'c-2',
          resolved: false,
        });
      });

      it('appliesToType should filter configurable hierarchy contact', () => {
        // given
        const config = {
          c: configurableHierarchyPersonWithReports(),
          targets: [],
          tasks: [ aPersonBasedTask() ],
        };

        // when
        const emitted = runNoolsLib(config).emitted;

        // then
        assert.shallowDeepEqual(emitted, [
          { _type:'_complete', _id: true },
        ]);
      });

      it('emitted task for configurable hierarchy contact', () => {
        // given
        const config = {
          c: configurableHierarchyPersonWithReports(),
          targets: [],
          tasks: [ aPersonBasedTask() ],
        };
        config.tasks[0].appliesToType = 'custom';

        // when
        const emitted = runNoolsLib(config).emitted;

        // then
        assert.shallowDeepEqual(emitted, [
          {
            _type: 'task',
            date: TEST_DAY,
            resolved: false,
            actions:[ { form: 'example-form' } ]
          },
          { _type:'_complete', _id: true },
        ]);
      });
    });

    describe('place-based', () => {

      it('should emit once for a place based task', () => {
        // given
        const config = {
          c: placeWithoutReports(),
          targets: [],
          tasks: [ aPlaceBasedTask() ],
        };

        // when
        const { emitted } = runNoolsLib(config);

        // then
        assert.shallowDeepEqual(emitted, [
          { _type:'task', date:TEST_DAY },
          { _type:'_complete', _id: true },
        ]);
      });
    });

    describe('report-based', () => {

      it('should not emit if contact has no reports', () => {
        // given
        const config = {
          c: personWithoutReports(),
          targets: [],
          tasks: [ aReportBasedTask() ],
        };

        // when
        const { emitted } = runNoolsLib(config);

        // then
        assert.deepEqual(emitted, [
          { _type:'_complete', _id: true },
        ]);
      });

      it('should not emit unknown contact', () => {
        // given
        const config = {
          c: unknownContactWithReports(aReport()),
          targets: [],
          tasks: [ aReportBasedTask() ],
        };
        config.tasks[0].appliesToType = 'custom';

        // when
        const emitted = runNoolsLib(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _type:'_complete', _id: true },
        ]);
      });

      describe('contactLabel attribute', () => {
        const mockHeading = sinon.stub().returns('foo');
        const scenarios = [
          {
            name: 'as function returning string',
            contactValue: mockHeading,
            expectations: (config, emitted) => {
              expect(emitted[0]).to.nested.include({
                'contact.name': 'foo',
              });
              expect(mockHeading.calledOnce).to.be.true;
              expect(mockHeading.args[0]).to.deep.eq([config.c, config.c.reports[0]]);
            }
          },

          {
            name: 'as string',
            contactValue: 'foo',
            expectations: (config, emitted) => expect(emitted[0]).to.nested.include({ 'contact.name': 'foo' }),
          },

          {
            name: 'undefined',
            contactValue: undefined,
            expectations: (config, emitted) => expect(emitted[0]).to.nested.include({ 'contact.type': 'person' }),
          },
        ];

        for (let scenario of scenarios) {
          it(scenario.name, () => {
            // given
            const config = {
              c: personWithReports(aReport()),
              targets: [],
              tasks: [ aReportBasedTask() ],
            };
            config.tasks[0].contactLabel = scenario.contactValue;
            
            // when
            const { emitted } = runNoolsLib(config);

            // then
            expect(emitted[0]).to.nested.include({
              _type: 'task',
              'actions[0].content.contact._id': 'c-2',
            });
            scenario.expectations(config, emitted);
          });
        }
      });

      it('should emit once for a single report', () => {
        // given
        const config = {
          c: personWithReports(aReport()),
          targets: [],
          tasks: [ aReportBasedTask() ],
        };

        // when
        const { emitted } = runNoolsLib(config);

        // then
        assert.shallowDeepEqual(emitted, [
          { _type:'task', date:TEST_DAY },
          { _type:'_complete', _id: true },
        ]);
      });

      it('appliesToType filters by form', () => {
        // given
        const config = {
          c: personWithReports(aReport()),
          targets: [],
          tasks: [ aReportBasedTask() ],
        };
        config.tasks[0].appliesToType = ['dne'];

        // when
        const { emitted } = runNoolsLib(config);

        // then
        expect(emitted).to.have.length(1);
      });

      it('appliesToType is not required', () => {
        // given
        const config = {
          c: personWithReports(aReport()),
          targets: [],
          tasks: [ aReportBasedTask() ],
        };
        delete config.tasks[0].appliesToType;

        // when
        const { emitted } = runNoolsLib(config);

        // then
        expect(emitted[0]).to.nested.include({
          'actions[0].content.source_id': 'r-1',
          resolved: false,
        });
      });

      it('should emit once per report', () => {
        // given
        const config = {
          c: personWithReports(aReport(), aReport(), aReport()),
          targets: [],
          tasks: [ aReportBasedTask() ],
        };

        // when
        const { emitted } = runNoolsLib(config);

        // then
        assert.shallowDeepEqual(emitted, [
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'_complete', _id: true },
        ]);

        expectAllToHaveUniqueIds(emitted);
      });

      it('should emit once per report per task', () => {
        // given
        const config = {
          c: personWithReports(aReport(), aReport(), aReport()),
          targets: [],
          tasks: [ aReportBasedTask(), aReportBasedTask() ],
        };

        // when
        const { emitted } = runNoolsLib(config);

        // then
        assert.shallowDeepEqual(emitted, [
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'_complete', _id: true },
        ]);

        expectAllToHaveUniqueIds(emitted); // even with undefined name, the resulting ids are unique
      });

      it('emitted events from tasks without name or id should be unique', () => {
        // given
        const config = {
          c: personWithReports(aReport()),
          targets: [],
          tasks: [ aReportBasedTask(), aReportBasedTask() ],
        };

        config.tasks.forEach(task => delete task.name);

        const [event] = config.tasks[0].events;
        delete event.id;
        config.tasks[0].events = [event, event];

        // when
        const { emitted } = runNoolsLib(config);

        // then
        expect(emitted).to.have.property('length', 4);
        expectAllToHaveUniqueIds(emitted);
      });

      it('given contact without reported_date, dueDate defaults to now', () => {
        sinon.useFakeTimers();

        // given
        const config = {
          c: personWithReports(aReport()),
          targets: [],
          tasks: [ aPersonBasedTask() ],
        };
        delete config.c.contact.reported_date;

        // when
        const { emitted } = runNoolsLib(config);

        // then
        const expected = new Date();
        expected.setHours(0, 0, 0, 0);
        expect(emitted[0].date.getTime()).to.eq(expected.getTime());
      });

      it('dueDate function is invoked with expected data', () => {
        // given
        const config = {
          c: personWithReports(aReport()),
          targets: [],
          tasks: [ aReportBasedTask() ],
        };

        const [event] = config.tasks[0].events;
        delete event.days;
        const spy = sinon.spy();
        event.dueDate = spy;

        // when
        const { emitted } = runNoolsLib(config);

        // then
        expect(emitted).to.have.property('length', 2);
        const [eventArg, c] = spy.args[0];
        expect(eventArg).to.include({ id: 'task' });
        expect(c).to.nested.include({
          'contact._id': 'c-2',
          'reports[0]._id': 'r-1',
        });
      });

      it('should allow custom action content', () => {
        // given
        const task = aReportBasedTask();
        task.actions[0].modifyContent =
            (content, c, r) => { content.report_id = r._id; };
        // and
        const config = {
          c: personWithReports(aReport()),
          targets: [],
          tasks: [ task ],
        };

        // when
        const { emitted } = runNoolsLib(config);

        // then
        assert.shallowDeepEqual(emitted, [
          {
            actions:[
              {
                type: 'report',
                form: 'example-form',
                label: 'Follow up',
                content: {
                  source: 'task',
                  source_id: 'r-2',
                  contact: {
                    _id: 'c-3',
                  },
                  report_id: 'r-2',
                },
              },
            ]
          },
        ]);
      });

      it('modifyContent for appliesTo contacts', () => {
        // given
        const task = aPersonBasedTask();
        task.actions[0].modifyContent = (content, c) => { content.report_id = c.contact._id; };
        // and
        const config = {
          c: personWithReports(aReport()),
          targets: [],
          tasks: [ task ],
        };

        // when
        const { emitted } = runNoolsLib(config);

        // then
        assert.shallowDeepEqual(emitted, [
          {
            actions:[
              {
                type: 'report',
                form: 'example-form',
                label: 'Follow up',
                content: {
                  source: 'task',
                  source_id: 'c-3',
                  contact: {
                    _id: 'c-3',
                  },
                  report_id: 'c-3',
                },
              },
            ]
          },
        ]);
      });
    });

    it('functions have access to "this"', () => {
      // given
      const config = {
        c: personWithReports(aReport()),
        targets: [],
        tasks: [ aReportBasedTask() ],
      };

      let invoked = false;
      config.tasks[0].appliesIf = function() {
        expect(this).to.nested.include({
          'definition.appliesTo': 'reports',
          'definition.name': 'task-3',  
        });

        invoked = true;
        return false;
      };

      // when
      const { emitted } = runNoolsLib(config);

      // then
      expect(emitted).to.have.property('length', 1);
      expect(invoked).to.be.true;
    });

    it('functions in "this.definition" have access to "this"', () => {
      // given
      const config = {
        c: personWithReports(aReport()),
        targets: [],
        tasks: [ aReportBasedTask() ],
      };

      let invoked = false;
      config.tasks[0].appliesIf = function(isFirst) {
        if (isFirst) {
          return this.definition.appliesIf();
        }

        invoked = true;
        expect(this).to.nested.include({
          'definition.appliesTo': 'reports',
          'definition.name': 'task-3',  
        });
        return false;
      };

      // when
      const { emitted } = runNoolsLib(config);

      // then
      expect(emitted).to.have.property('length', 1);
      expect(invoked).to.be.true;
    });

    describe('scheduled-task based', () => {
      it('???', () => { // FIXME this test needs a proper name
        // given
        const config = {
          c: personWithReports(aReportWithScheduledTasks(5)),
          targets: [],
          tasks: [ aScheduledTaskBasedTask() ],
        };

        // when
        const { emitted } = runNoolsLib(config);

        // then
        assert.shallowDeepEqual(emitted, [
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'task', date:TEST_DAY },
          { _type:'_complete', _id: true },
        ]);
      });
    });

    describe('invalid task type', () => {
      it('should throw error', () => {
        // given
        const invalidTask = aScheduledTaskBasedTask();
        invalidTask.appliesTo = 'unknown';
        const config = {
          c: personWithReports(aReportWithScheduledTasks(5)),
          targets: [],
          tasks: [ invalidTask ],
        };

        // should throw error
        assert.throws(() => { runNoolsLib(config); }, Error, 'Unrecognised task.appliesTo: unknown');
      });
    });

  });
});

const expectAllToHaveUniqueIds = tasks => expect(
  new Set(tasks.map(task => task._id)).size
).to.eq(tasks.length);
