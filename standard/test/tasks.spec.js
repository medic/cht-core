const assert = require('chai').assert;
const fs = require('fs');
const NootilsManager = require('medic-nootils/src/node/test-wrapper');

const now = NootilsManager.BASE_DATE;
const MS_IN_DAY = 24*60*60*1000;  // 1 day in ms
const MAX_DAYS_IN_PREGNANCY = 44*7;  // 44 weeks
const IMMUNIZATION_PERIOD = 2*365;
const DAYS_IN_PNC = 42;

const D_REPORT = require('./data/d-form.report.json');
const P_REPORT = require('./data/p-form.report.json');
const CW_REPORT = require('./data/cw-form.report.json');

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
      const c = contactWith(deliveryReport);
      session.assert(c);

      // when
      return session.emitTasks()
        .then(tasks => {

          // then
          assert.equal(tasks.length, 1);

          const task = tasks[0];
          assertPriority(task, 'high', 'Home Birth');
          assertIcon(task, 'mother-child');
          assertTitle(task, 'Postnatal visit needed');
          assertNotResolved(task);
          assert.deepInclude(task.actions[0].content, {
            "source": "task",
            "source_id": "report-1",
            contact
          });
        });
    });
    it('should have first visit task completed when PNC app form is submitted', function() {
      // given
      const c = contactWith(deliveryReport, pncVisitAppReport);
      session.assert(c);

      // when
      return session.emitTasks()
        .then(tasks => {

          // then
          assert.equal(tasks.length, 1);

          const task = tasks[0];
          assertPriority(task, 'high', 'Home Birth');
          assertIcon(task, 'mother-child');
          assertTitle(task, 'Postnatal visit needed');
          assertResolved(task);
        });
    });
    it('should have first visit task completed when PNC SMS form is submitted', function() {
      // given
      const c = contactWith(deliveryReport, pncVisitSMSReport);
      session.assert(c);

      // when
      return session.emitTasks()
        .then(tasks => {

          // then
          assert.equal(tasks.length, 1);

          const task = tasks[0];
          assertPriority(task, 'high', 'Home Birth');
          assertIcon(task, 'mother-child');
          assertTitle(task, 'Postnatal visit needed');
          assertResolved(task);
        });
    });
    it(`should have a 'postnatal-danger-sign' task if a flag is sent during PNC period`, function() {
      // given
      // FIXME don't modify shared data
      setDate(deliveryReport, daysAgo(25));
      flagReport.reported_date = daysAgo(4);

      const c = contactWith(deliveryReport, flagReport);
      session.assert(c);

      // when
      return session.emitTasks()
        .then(tasks => {

          // then
          assert.equal(tasks.length, 1);

          const task = tasks[0];
          assertPriority(task, 'high', 'Danger Signs');
          assertIcon(task, 'mother-child');
          assertTitle(task, 'Postnatal visit needed');
          assertType(task, 'postnatal-danger-sign');
        });
    });

    describe('Postnatal visit schedule', function() {
      const postnatalTaskDays = [ 5, 6, 7, 8, 9, 10, 11, 12, 44, 45, 46, 47 ];
      const ageInDaysWhenRegistered = 1;

      range(ageInDaysWhenRegistered, DAYS_IN_PNC+10).forEach(day => {

        describe(`Postnatal period: day ${day}:`, function() {
          if (postnatalTaskDays.includes(day)) {
            it(`should have 'postnatal-missing-visit' visit task`, function() {
              // given
              const reports = setupReports([ D_REPORT ], day-ageInDaysWhenRegistered);
              const c = contactWith(...reports);
              session.assert(c);

              // when
              return session.emitTasks()
                .then(tasks => {

                  // then
                  assert.equal(tasks.length, 1);

                  const task = tasks[0];
                  assertNoPriority(task);
                  assertIcon(task, 'mother-child');
                  assertTitle(task, 'Missing postnatal visit');
                  assertType(task, 'postnatal-missing-visit');
                });
            });
          } else {
            it(`should not have 'postnatal-missing-visit' visit task`, function() {
              // given
              var reports = setupReports([ D_REPORT ], day-ageInDaysWhenRegistered);
              const c = contactWith(...reports);
              session.assert(c);


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
      // FIXME don't modify shared data
      pregnancyReport.reported_date = daysAgo(6);
      flagReport.reported_date = daysAgo(4);

      const c = contactWith(pregnancyReport, flagReport);
      session.assert(c);

      // when
      return session.emitTasks()
        .then(tasks => {

          // then
          assert.equal(tasks.length, 1);

          const task = tasks[0];
          assertPriority(task, 'high', 'Danger Signs');
          assertIcon(task, 'mother-child');
          assertTitle(task, 'Pregnancy visit needed');
          assertType(task, 'pregnancy-danger-sign');
        });
    });

    it(`should not have a 'pregnancy-danger-sign' task if a flag is sent before pregnancy`, function() {
      // given
      pregnancyReport.reported_date = daysAgo(2);
      flagReport.reported_date = daysAgo(4);

      var reports = [
        pregnancyReport,
        flagReport,
      ];
      const c = contactWith(...reports);
      session.assert(c);

      // when
      return session.emitTasks()
        .then(tasks => {

          // then
          assert.equal(tasks.length, 0);
        });
    });

    it(`should not have a 'pregnancy-danger-sign' task if a flag is sent after pregnancy`, function() {
      // given
      pregnancyReport.reported_date = daysAgo(8);
      deliveryReport.reported_date = daysAgo(6);
      flagReport.reported_date = daysAgo(4);

      var reports = [
        pregnancyReport,
        deliveryReport,
        flagReport,
      ];

      const c = contactWith(...reports);
      session.assert(c);

      // when
      return session.emitTasks()
        .then(tasks => {

          // then
          // should have an unresolved postnatal task and a resolved pregnancy task
          assert.equal(tasks.length, 2);

          const task = tasks[0];
          assertPriority(task, 'high', 'Danger Signs');
          assertIcon(task, 'mother-child');
          assertTitle(task, 'Pregnancy visit needed');
          assertType(task, 'pregnancy-danger-sign');
          assertResolved(task);
        });
    });

    range(weekdayOffset, MAX_DAYS_IN_PREGNANCY).forEach(day => {

      describe(`Pregnancy without LMP: day ${day}:`, function() {

        if (pregnancyTaskDays.includes(day)) {
          it(`should have 'pregnancy-missing-visit' visit task`, function() {
            // given
            var reports = setupReports([ P_REPORT ], day);
            const c = contactWith(...reports);
            session.assert(c);

            // when
            return session.emitTasks()
              .then(tasks => {

                // then
                assert.equal(tasks.length, 1);

                const task = tasks[0];
                assertNoPriority(task);
                assertIcon(task, 'pregnancy-1');
                assertTitle(task, 'Missing pregnancy visit');
                assertType(task, 'pregnancy-missing-visit');
              });
          });
        } else {
          it(`should not have 'pregnancy-missing-visit' visit task`, function() {
            // given
            var reports = setupReports([ P_REPORT ], day);
            const c = contactWith(...reports);
            session.assert(c);

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
            var reports = setupReports([ P_REPORT ], day);
            const c = contactWith(...reports);
            session.assert(c);

            // when
            return session.emitTasks()
              .then(tasks => {

                // then
                assert.equal(tasks.length, 1);

                const task = tasks[0];
                assertNoPriority(task);
                assertIcon(task, 'mother-child');
                assertTitle(task, 'Missing birth report');
                assertType(task, 'pregnancy-missing-birth');
              });
          });
        } else {
          it(`should not have 'pregnancy-missing-birth' visit task`, function() {
            // given
            var reports = setupReports([ P_REPORT ], day);
            const c = contactWith(...reports);
            session.assert(c);

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
    var ageInDaysWhenRegistered = Math.floor((CW_REPORT.reported_date - (new Date(CW_REPORT.birth_date).getTime()))/MS_IN_DAY);

    // Test for 10 days beyond the immunization period
    range(ageInDaysWhenRegistered, IMMUNIZATION_PERIOD + 10).forEach(day => {
      describe(`Immunization: day ${day}:`, function() {

        if (immunizationTaskDays.includes(day)) {
          it(`should have 'immunization-missing-visit' visit task`, function() {
            // given
            var reports = setupReports([CW_REPORT], day - ageInDaysWhenRegistered);
            const c = contactWith(...reports);
            session.assert(c);

            // when
            return session.emitTasks()
              .then(tasks => {

                // then
                assert.equal(tasks.length, 1);

                const task = tasks[0];
                assertNoPriority(task);
                assertIcon(task, 'immunization');
                assertTitle(task, 'Missing immunization visit');
                assertType(task, 'immunization-missing-visit');
                assertNotResolved(task);
              });
          });
          it(`should have a cleared visit task if received a visit`, function() {
            // given
            var reports = setupReports([CW_REPORT, immVisitSMSReport], day - ageInDaysWhenRegistered);
            reports[1].reported_date = now;  // make sure the immuniztion report was sent today
            const c = contactWith(...reports);
            session.assert(c);

            // when
            return session.emitTasks()
              .then(tasks => {

                // then
                assert.equal(tasks.length, 1);

                const task = tasks[0];
                assertNoPriority(task);
                assertIcon(task, 'immunization');
                assertTitle(task, 'Missing immunization visit');
                assertType(task, 'immunization-missing-visit');
                assertResolved(task);
              });
          });

        } else {
          it(`should not have 'immunization-missing-visit' visit task`, function() {
            // given
            var reports = setupReports([CW_REPORT], day - ageInDaysWhenRegistered);
            const c = contactWith(...reports);
            session.assert(c);

            // when
            return session.emitTasks()

              // then
              .then(tasks => assert.equal(tasks.length, 0));
          });
        }
      });
    });
  });

  const contact = {
    type: 'person',
    name: 'Zoe',
    date_of_birth: '1990-09-01',
    reported_date: now,
    _id: 'contact-1'
  };

  function contactWith(...reports) {
    // TODO: Investigate how timezone affect showing task.
    // Tests pass vs fail with task window being off by one at 11pm vs 12:15am on GMT+2.
    return new Contact({ contact, reports });
  }

  const tomorrow = daysAgo(-1);

  // form id must be upper case
  const pregnancyReport = {
    "_id":"pregnancy-1",
    "fields": { },
    "form": "P",
    "reported_date": now
  };
  const flagReport = {
    "_id":"flag-1",
    "fields": {
      "notes": ""
    },
    "form": "F",
    "reported_date": now
  };
  const deliveryReport = {
    "_id":"report-1",
    "fields": {
      "delivery_code": "NS"
    },
    "birth_date": iso(daysAgo(3)),
    "form": "delivery",
    "reported_date": now
  };
  const pncVisitAppReport = {
    "_id": "report-2",
    "fields": {},
    "form": "postnatal_visit",
    "reported_date": tomorrow,
  };
  const pncVisitSMSReport = {
    "_id": "report-3",
    "fields": {},
    "form": "M",
    "reported_date": tomorrow,
  };
  const immVisitSMSReport = {
    "_id": "report-imm",
    "fields": {},
    "form": "IMM",
    "reported_date": tomorrow,
  };

  function setupReports(reports, day) {
    //  reports:   array of reports
    //  day:       number of days to push back all the dates in reports

    if (day !== undefined && reports) {
      // Sets up the tasks by using the doc and reports
      reports.forEach(r => {
        var noonToday = new Date(now).setHours(12,0,0,0);
        // FIXME don't modify shared data
        setDate(r, noonToday-(day*MS_IN_DAY));
      });
    }
    return reports;
  }
});

function range(a, b) {
  return Array.apply(null, { length:b-a+1 }).map((_, i) => i+a);
}

function getDayRanges(startDays, duration, offset) {
  const a = startDays.map(day => {
    var startVal = day + offset;
    var endVal = startVal + duration - 1;
    return range(startVal, endVal);
  });

  // return the flattened 1D array
  return [].concat.apply([], a);
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

function getRange(startDay, durationInDays, offset) {
  return range(startDay+offset, startDay+durationInDays+offset);
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
  assert.equal(task.priorityLabel.find(label => label.locale === 'en').content, expectedLabel);
}

function assertIcon(task, expectedIcon) {
  assert.equal(task.icon, expectedIcon);
}

function assertTitle(task, expectedTitle) {
  assert.equal(task.title.find(label => label.locale === 'en').content, expectedTitle);
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
