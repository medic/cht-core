const _ = require('lodash');
const assert = require('chai').assert;
const NootilsManager = require('medic-nootils/src/node/test-wrapper');

const now = NootilsManager.BASE_DATE;
const MS_IN_DAY = 24*60*60*1000;  // 1 day in ms
const MAX_DAYS_IN_PREGNANCY = 44*7;  // 44 weeks
const IMMUNIZATION_PERIOD = 2*365;
const DAYS_IN_PNC = 42;

const freshCloneOf = o => () => _.cloneDeep(o);

// TEST DATA
// THESE ARE FUNCTIONS TO PREVENT THEIR MODIFICATION IN-PLACE AND CHANGES MADE
// IN ONE TEST LEAKING INTO OTHERS.
const fixtures = {
  contact: freshCloneOf({
    type: 'person',
    name: 'Zoe',
    date_of_birth: '1990-09-01',
    reported_date: now,
    _id: 'contact-1'
  }),
  reports: {
    d:  freshCloneOf(require(`./data/d-form.report.json`)),
    p:  freshCloneOf(require(`./data/p-form.report.json`)),
    cw: freshCloneOf(require(`./data/cw-form.report.json`)),
    flag: freshCloneOf({
      _id: 'flag-1',
      fields:{ notes:'' },
      form: 'F',
      reported_date: now,
    }),
    pregnancy: freshCloneOf({
      _id: 'pregnancy-1',
      fields: {},
      form: 'P',
      reported_date: now,
    }),
    delivery: freshCloneOf({
      _id: 'report-1',
      fields:{ delivery_code:'NS' },
      birth_date: iso(daysAgo(3)),
      form: 'delivery',
      reported_date: now,
    }),
  },
};

describe('Standard Configuration Tasks', function() {
  const TEST_USER = {
    parent: {
      type: 'health_center',
      use_cases: 'anc pnc imm'
    },
  };

  let nootilsManager, Contact, session;

  before(() => {
    nootilsManager = NootilsManager({ user:TEST_USER });
    Contact = nootilsManager.Contact;
    session = nootilsManager.session;
  });
  afterEach(() => nootilsManager.afterEach());
  after(() => nootilsManager.after());

  describe('Birth not at facility', function() {
    // TODO Fix tests: When run late in day EDT the Tasks dates are off by one. Possibly because it is already the next day in GMT

    it('should have a clinic visit task', function() {
      // given
      session.assert(contactWith(fixtures.reports.delivery()));

      // when
      return session.emitTasks()
        .then(tasks => {

          // then
          assert.equal(tasks.length, 1);

          const task = tasks[0];
          assertPriority(task, 'high', 'task.warning.home_birth');
          assertIcon(task, 'mother-child');
          assertTitle(task, 'task.postnatal_home_birth.title');
          assertNotResolved(task);
          assert.deepInclude(task.actions[0].content, {
            "source": "task",
            "source_id": "report-1",
            contact: fixtures.contact(),
          });
        });
    });
    it('should have first visit task completed when PNC app form is submitted', function() {
      // given
      const pncVisitAppReport = {
        "_id": "report-2",
        "fields": {},
        "form": "postnatal_visit",
        "reported_date": tomorrow,
      };
      session.assert(contactWith(fixtures.reports.delivery(), pncVisitAppReport));

      // when
      return session.emitTasks()
        .then(tasks => {

          // then
          assert.equal(tasks.length, 1);

          const task = tasks[0];
          assertPriority(task, 'high', 'task.warning.home_birth');
          assertIcon(task, 'mother-child');
          assertTitle(task, 'task.postnatal_home_birth.title');
          assertResolved(task);
        });
    });
    it('should have first visit task completed when PNC SMS form is submitted', function() {
      // given
      const pncVisitSMSReport = {
        "_id": "report-3",
        "fields": {},
        "form": "M",
        "reported_date": tomorrow,
      };
      session.assert(contactWith(fixtures.reports.delivery(), pncVisitSMSReport));

      // when
      return session.emitTasks()
        .then(tasks => {

          // then
          assert.equal(tasks.length, 1);

          const task = tasks[0];
          assertPriority(task, 'high', 'task.warning.home_birth');
          assertIcon(task, 'mother-child');
          assertTitle(task, 'task.postnatal_home_birth.title');
          assertResolved(task);
        });
    });
    it(`should have a 'postnatal-danger-sign' task if a flag is sent during PNC period`, function() {
      // given
      const deliveryReport = fixtures.reports.delivery();
      setDate(deliveryReport, daysAgo(25));

      const flagReport = fixtures.reports.flag();
      flagReport.reported_date = daysAgo(4);

      session.assert(contactWith(deliveryReport, flagReport));

      // when
      return session.emitTasks()
        .then(tasks => {

          // then
          assert.equal(tasks.length, 1);

          const task = tasks[0];
          assertPriority(task, 'high', 'task.warning.danger_sign');
          assertIcon(task, 'mother-child');
          assertTitle(task, 'task.postnatal_danger_sign.title');
          assertType(task, 'postnatal-danger-sign');
        });
    });

    describe('Postnatal visit schedule', function() {
      const postnatalTaskDays = [ 5, 6, 7, 8, 9, 10, 11, 12, 44, 45, 46, 47 ];
      // Tasks are associated to the last scheduled message of each group. 
      // We won't have scheduled messages before receiving the report, so only
      // check for tasks between age in days when registered and ten days 
      // beyond end of PNC period.
      const ageInDaysWhenRegistered = 1;

      range(0, DAYS_IN_PNC+10).forEach(day => {

        describe(`Postnatal period: day ${day}:`, function() {
          if (postnatalTaskDays.includes(day)) {
            it(`should have 'postnatal-missing-visit' visit task`, function() {
              // given
              session.assert(contactWith(
                  backdatedReport('d', day-ageInDaysWhenRegistered)));

              // when
              return session.emitTasks()
                .then(tasks => {

                  // then
                  assert.equal(tasks.length, 1);

                  const task = tasks[0];
                  assertNoPriority(task);
                  assertIcon(task, 'mother-child');
                  assertTitle(task, 'task.postnatal_missing_visit.title');
                  assertType(task, 'postnatal-missing-visit');
                });
            });
          } else {
            it(`should not have 'postnatal-missing-visit' visit task`, function() {
              // given
              session.assert(contactWith(
                  backdatedReport('d', day - ageInDaysWhenRegistered)));


              // when
              return session.emitTasks()
                .then(tasks => {

                  // then
                  assert.equal(tasks.length, 0);
                });
            });
          }
        });
      });
    });
  });

  describe('Pregnancy without LMP', function() {

    // A weekday offset needed if scheduled messages are set to a specific weekday eg Monday 9am
    // In this case it is -3, since the test report on Thursday has 1 week notification going out on the first Monday.
    var weekdayOffset = -3;

    var pregancyTasks = {
      offset: 7,
      pre: 0,
      post: 6,
      triggers: [
        weeks(2),
        weeks(6),
        weeks(10),
        weeks(14),
        weeks(18),
        weeks(22),
        weeks(26),
        weeks(30),
        weeks(34),
      ],
    };
    var deliveryTasks = {
      offset: 7,
      pre: 1,
      post: 13,
      triggers: [ weeks(39) ],
    };
    var pregnancyTaskDays = getRangeFromTask(pregancyTasks, weekdayOffset);
    var deliveryTaskDays = getRangeFromTask(deliveryTasks, weekdayOffset);


    it(`should have a 'pregnancy-danger-sign' task if a flag is sent during active pregnancy`, function() {
      // given
      const pregnancyReport = fixtures.reports.pregnancy();
      pregnancyReport.reported_date = daysAgo(6);
      const flagReport = fixtures.reports.flag();
      flagReport.reported_date = daysAgo(4);

      session.assert(contactWith(pregnancyReport, flagReport));

      // when
      return session.emitTasks()
        .then(tasks => {

          // then
          assert.equal(tasks.length, 1);

          const task = tasks[0];
          assertPriority(task, 'high', 'task.warning.danger_sign');
          assertIcon(task, 'mother-child');
          assertTitle(task, 'task.pregnancy_danger_sign.title');
          assertType(task, 'pregnancy-danger-sign');
        });
    });

    it(`should not have a 'pregnancy-danger-sign' task if a flag is sent before pregnancy`, function() {
      // given
      const pregnancyReport = fixtures.reports.pregnancy();
      pregnancyReport.reported_date = daysAgo(2);
      const flagReport = fixtures.reports.flag();
      flagReport.reported_date = daysAgo(4);

      session.assert(contactWith(pregnancyReport, flagReport));

      // when
      return session.emitTasks()
        .then(tasks => {

          // then
          assert.equal(tasks.length, 0);
        });
    });

    it(`should not have a 'pregnancy-danger-sign' task if a flag is sent after pregnancy`, function() {
      // given
      const pregnancyReport = fixtures.reports.pregnancy();
      pregnancyReport.reported_date = daysAgo(8);

      const deliveryReport = fixtures.reports.delivery();
      deliveryReport.reported_date = daysAgo(6);

      const flagReport = fixtures.reports.flag();
      flagReport.reported_date = daysAgo(4);

      session.assert(contactWith(
        pregnancyReport,
        deliveryReport,
        flagReport
      ));

      // when
      return session.emitTasks()
        .then(tasks => {

          // then
          // should have an unresolved postnatal task and a resolved pregnancy task
          assert.equal(tasks.length, 2);

          const task = tasks[0];
          assertPriority(task, 'high', 'task.warning.danger_sign');
          assertIcon(task, 'mother-child');
          assertTitle(task, 'task.pregnancy_danger_sign.title');
          assertType(task, 'pregnancy-danger-sign');
          assertResolved(task);
        });
    });

    range(weekdayOffset, MAX_DAYS_IN_PREGNANCY).forEach(day => {

      describe(`Pregnancy without LMP: day ${day}:`, function() {

        if (pregnancyTaskDays.includes(day)) {
          it(`should have 'pregnancy-missing-visit' visit task`, function() {
            // given
            session.assert(contactWith(backdatedReport('p', day)));

            // when
            return session.emitTasks()
              .then(tasks => {

                // then
                assert.equal(tasks.length, 1);

                const task = tasks[0];
                assertNoPriority(task);
                assertIcon(task, 'pregnancy-1');
                assertTitle(task, 'task.pregnancy_missing_visit.title');
                assertType(task, 'pregnancy-missing-visit');
              });
          });
        } else {
          it(`should not have 'pregnancy-missing-visit' visit task`, function() {
            // given
            session.assert(contactWith(backdatedReport('p', day)));

            // when
            return session.emitTasks()
              .then(tasks =>

                // then
                tasks.every(t => assertTypeIsNot(t, 'pregnancy-missing-visit')));
          });
        }
        if (deliveryTaskDays.includes(day)) {
          it(`should have 'pregnancy-missing-birth' visit task`, function() {
            // given
            session.assert(contactWith(backdatedReport('p', day)));

            // when
            return session.emitTasks()
              .then(tasks => {

                // then
                assert.equal(tasks.length, 1);

                const task = tasks[0];
                assertNoPriority(task);
                assertIcon(task, 'mother-child');
                assertTitle(task, 'task.pregnancy_missing_birth.title');
                assertType(task, 'pregnancy-missing-birth');
              });
          });
        } else {
          it(`should not have 'pregnancy-missing-birth' visit task`, function() {
            // given
            session.assert(contactWith(backdatedReport('p', day)));

            // when
            return session.emitTasks()
              .then(tasks =>

                // then
                tasks.every(t => assertTypeIsNot(t, 'pregnancy-missing-birth')));
          });
        }
      });
    });
  });
  describe('Childhood Immunizations', function() {

    var weekdayOffset = 0;
    var immunizationTasks = {
      offset: 21,
      pre: 7,
      post: 13,
      triggers: [ // Set to differences between birth_date and scheduled_tasks[].due, excluding end date.
        30,
        58,
        93,
        184,
        240,
        366,
        485, 
        730,
      ]
    };
    var immunizationTaskDays = getRangeFromTask(immunizationTasks, weekdayOffset);
    const cwReport = fixtures.reports.cw();
    // Tasks are associated to the last scheduled message of each group. 
    // We won't have scheduled messages before receiving the report, so only
    // check for tasks between age in days when registered and ten days 
    // beyond end of PNC period.
    var ageInDaysWhenRegistered = Math.floor((cwReport.reported_date - (new Date(cwReport.birth_date).getTime()))/MS_IN_DAY);

    // Test for 10 days beyond the immunization period
    range(0, IMMUNIZATION_PERIOD + 10).forEach(day => {
      describe(`Immunization: day ${day}:`, function() {

        if (immunizationTaskDays.includes(day)) {
          it(`should have 'immunization-missing-visit' visit task`, function() {
            // given
            session.assert(contactWith(
                backdatedReport('cw', day - ageInDaysWhenRegistered)));

            // when
            return session.emitTasks()
              .then(tasks => {

                // then
                assert.equal(tasks.length, 1);

                const task = tasks[0];
                assertNoPriority(task);
                assertIcon(task, 'immunization');
                assertTitle(task, 'task.immunization_missing_visit.title');
                assertType(task, 'immunization-missing-visit');
                assertNotResolved(task);
              });
          });
          it(`should have a cleared visit task if received a visit`, function() {
            // given
            // FIXME understand what this is and then give it a descriptive name
            const dayOffset = day - ageInDaysWhenRegistered;
            const immVisitReport = {
              _id: 'report-imm',
              fields: {},
              form: 'IMM',
              reported_date: now,
            };
            session.assert(contactWith(
                backdatedReport('cw', dayOffset),
                immVisitReport));

            // when
            return session.emitTasks()
              .then(tasks => {

                // then
                assert.equal(tasks.length, 1);

                const task = tasks[0];
                assertNoPriority(task);
                assertIcon(task, 'immunization');
                assertTitle(task, 'task.immunization_missing_visit.title');
                assertType(task, 'immunization-missing-visit');
                assertResolved(task);
              });
          });

        } else {
          it(`should not have 'immunization-missing-visit' visit task`, function() {
            // given
            session.assert(contactWith(
                backdatedReport('cw', day - ageInDaysWhenRegistered)));

            // when
            return session.emitTasks()

              // then
              .then(tasks => assert.equal(tasks.length, 0));
          });
        }
      });
    });
  });

  function contactWith(...reports) {
    // TODO: Investigate how timezone affect showing task.
    // Tests pass vs fail with task window being off by one at 11pm vs 12:15am on GMT+2.
    return new Contact({ contact:fixtures.contact(), reports });
  }

  const tomorrow = daysAgo(-1);

  function backdatedReport(reportFixtureName, daysAgo) {
    const noonToday = new Date(now);
    noonToday.setHours(12,0,0,0);

    const report = fixtures.reports[reportFixtureName]();
    const msAgo = daysAgo * MS_IN_DAY;
    setDate(report, noonToday - msAgo);

    return report;
  }
});

function range(a, b) {
  return Array.apply(null, { length:b-a+1 }).map((_, i) => i+a);
}

function getRangeFromTask(task, offset) {
  const a = task.triggers.map(t => {
    var start = t + task.offset - task.pre;
    var end = t + task.offset + task.post;
    return range(start + offset, end + offset);
  });

  // return the flattened 1D array
  return [].concat.apply([], a);
}

function setDate(form, newDate) {
  // Sets the newDate as the form's reported date, and modifies other dates in doc by the same offset
  var originalDate = new Date(form.reported_date);
  var diff = originalDate - newDate;
  diff = (Math.round(diff/MS_IN_DAY))*MS_IN_DAY; // to avoid changing the number of days between event get diff in days, not ms
  form.reported_date = newDate;
  traverse(form, resetDate, "birth_date", diff);
  traverse(form, resetDate, "due", diff);
}

function resetDate(object, key, keyToChange, offset) {
    if (key === keyToChange) {
      var date = new Date(object[key]);
      var date2 = new Date(date.getTime() - offset);
      object[key] = date2.toISOString();
    }
}

function traverse(object, func, key, offset) {
    for (var i in object) {
        func.apply(this, [object, i, key, offset]);
        if (object[i] !== null && typeof(object[i])=="object") {
            //going one step down in the object tree!!
            traverse(object[i], func, key, offset);
        }
    }
}

function assertNoPriority(task) {
  assert.isNotOk(task.priority);
  assert.isNotOk(task.priorityLabel);
}

function assertPriority(task, expectedLevel, expectedLabel) {
  assert.equal(task.priority, expectedLevel);
  assert.equal(task.priorityLabel, expectedLabel);
}

function assertIcon(task, expectedIcon) {
  assert.equal(task.icon, expectedIcon);
}

function assertTitle(task, expectedTitle) {
  assert.equal(task.title, expectedTitle);
}

function assertType(task, expectedType) {
  assert.include(task._id, expectedType);
}

function assertTypeIsNot(task, expectedType) {
  assert.notInclude(task._id, expectedType);
}

function assertResolved(task) {
  assert.isTrue(task.resolved);
}

function assertNotResolved(task) {
  assert.isFalse(task.resolved);
}

function iso(timestamp) {
  return new Date(timestamp).toISOString();
}

function daysAgo(n) {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d.getTime();
}

function weeks(n) {
  return n * 7;
}
