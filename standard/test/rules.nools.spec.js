var Nools = require('nools');
var assert = require('chai').assert;
const parseRules = require('medic-nootils/src/node/test-utils').parseRules;

const now = new Date();
const MS_IN_DAY = 24*60*60*1000;  // 1 day in ms
const MAX_DAYS_IN_PREGNANCY = 44*7;  // 44 weeks
const IMMUNIZATION_PERIOD = 2*365;
const DAYS_IN_PNC = 42;
const WEEKS = 7;  // days per week

// TODO instead of including calls to `Date.now()` in our test data, we should
// instead set the date at the start of a test script, and progress it during
// the script as we require.  This will require replacement of all `new Date()`
// calls in individual rulesets to use e.g. `Utils.date()`.  This refactoring is
// not complicated.

var person = {
  "type": "person",
  "name": "Zoe",
  "date_of_birth": "1990-09-01",
  "reported_date": Date.now(),
  "_id": "contact-1"
};

// form id must be upper case
var pregnancyReport = {
  "_id":"pregnancy-1",
  "fields": { },
  "form": "P",
  "reported_date": Date.now()
};
var flagReport = {
  "_id":"flag-1",
  "fields": {
    "notes": ""
  },
  "form": "F",
  "reported_date": Date.now()
};
var deliveryReport = {
  "_id":"report-1",
  "fields": {
    "delivery_code": "NS"
  },
  "birth_date": (new Date(Date.now() - 3*MS_IN_DAY)).toISOString(),
  "form": "delivery",
  "reported_date": Date.now()
};
var pncVisitAppReport = {
  "_id": "report-2",
  "fields": {},
  "form": "postnatal_visit",
  "reported_date": Date.now() + 1*MS_IN_DAY
};
var pncVisitSMSReport = {
  "_id": "report-3",
  "fields": {},
  "form": "M",
  "reported_date": Date.now() + 1*MS_IN_DAY
};
var immVisitSMSReport = {
  "_id": "report-imm",
  "fields": {},
  "form": "V",
  "reported_date": Date.now() + 1*MS_IN_DAY
};

describe('Standard Configuration', function() {
  var flow, session, Contact;
  const TEST_USER = {
    parent: {
      type: 'health_center',
      use_cases: 'anc pnc imm'
    },
  };

  beforeEach(function() {
    var rules = parseRules(
      __dirname + '/../rules.nools.js',
      __dirname + '/../tasks.json',
      { user:TEST_USER });
    flow = rules.flow;
    session = rules.session;

    Contact = flow.getDefined('Contact');
  });

  afterEach(function() {
    flow = null;
    session = null;
    Contact = null;
    Nools.deleteFlows();
  });

  describe('Birth not at facility', function() {

    it('should have a clinic visit task', function() {
      // given
      var reports = [
          deliveryReport,
      ];
      var c = setupContact(Contact, person, reports);
      session.assert(c);

      // expect
      return session.emitTasks()
        .then(function(tasks) {
          // console.log(JSON.stringify(tasks,null,2));
          assert.equal(tasks.length, 1, "Should have a single task created");
          assert.deepInclude(tasks[0], {resolved: false}, "Should have a resolved field set to false");
          assert.deepInclude(tasks[0].actions[0].content, {
            "source": "task",
            "source_id": "report-1",
            "contact": person
          });
        });
    });
    it('should have first visit task completed when PNC app form is submitted', function() {
      // given
      var reports = [
        deliveryReport,
        pncVisitAppReport
      ];
      var c = setupContact(Contact, person, reports);
      session.assert(c);

      // expect
      return session.emitTasks()
        .then(function(tasks) {
          assert.equal(tasks.length, 1, "Should have a single task created");
          assert.deepInclude(tasks[0], {resolved: true}, "Should have a resolved field set to true");
        });
    });
    it('should have first visit task completed when PNC SMS form is submitted', function() {
      // given
      var reports = [
        deliveryReport,
        pncVisitSMSReport
      ];
      var c = setupContact(Contact, person, reports);
      session.assert(c);

      // expect
      return session.emitTasks()
        .then(function(tasks) {
          assert.equal(tasks.length, 1, "Should have a single task created");
          assert.deepInclude(tasks[0], {resolved: true}, "Should have a resolved field set to true");
        });
    });
    it(`should have a 'postnatal-danger-sign' task if a flag is sent during PNC period`, function() {
      // given
      deliveryReport = setDate(deliveryReport, Date.now()-(25*MS_IN_DAY)); 
      flagReport.reported_date = Date.now()-(4*MS_IN_DAY); 

      var reports = [
        deliveryReport,
        flagReport,
      ];
      var c = setupContact(Contact, person, reports);
      session.assert(c);

      // expect
      return session.emitTasks()
        .then(function(tasks) {
          assert.equal(tasks.length, 1, "Should have a single task created");
          assert.include(tasks[0]._id, 'postnatal-danger-sign', "Task id should have correct schedule name included");
        });
    });

    describe('Postnatal visit schedule', function() {
      var postnatalTasks = {
        offset: 1,
        pre: 0,
        post: 3,
        triggers: [4, 8, 43]
      };

      var postnatalTaskDays = getRangeFromTask(pncTasks, 0);

      var d = require('./d.json');
      var ageInDaysWhenRegistered = Math.floor((d.reported_date - (new Date(d.birth_date).getTime()))/MS_IN_DAY);
      
      range(ageInDaysWhenRegistered, DAYS_IN_PNC+10).forEach(day => {

        describe(`Postnatal period: day ${day}`, function() {
          if (postnatalTaskDays.includes(day)) {
            it(`should have 'postnatal-missing-visit' visit task on day ${day}`, function() {
              // given
              var reports = [require('./d.json')];
              var c = setupContact(Contact, person, setupReports(reports, day-ageInDaysWhenRegistered));
              session.assert(c);

              // expect
              return session.emitTasks()
                .then(function(tasks) {
                  assert.equal(tasks.length, 1, "Should have a single task created");
                  assert.include(tasks[0]._id, 'postnatal-missing-visit', "Task id should have correct schedule name included");
                });
            });
          }
          else {
            it(`should not have 'postnatal-missing-visit' visit task on day ${day}`, function() {
              // given
              var reports = [require('./d.json')];
              var c = setupContact(Contact, person, setupReports(reports, day-ageInDaysWhenRegistered));
              session.assert(c);


              // expect
              return session.emitTasks()
                .then(function(tasks) {
                  tasks.forEach(t => { 
                    assert.notInclude(t._id, 'postnatal-missing-visit', "Task id should not include 'postnatal-missing-visit'");
                  });
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
        2*WEEKS, 
        6*WEEKS, 
        10*WEEKS,
        14*WEEKS,
        18*WEEKS,
        22*WEEKS,
        26*WEEKS,
        30*WEEKS,
        34*WEEKS,
      ]
    };
    var deliveryTasks = {
      offset: 7,
      pre: 1,
      post: 13,
      triggers: [39*WEEKS]
    };
    var pregnancyTaskDays = getRangeFromTask(pregancyTasks, weekdayOffset);
    var deliveryTaskDays = getRangeFromTask(deliveryTasks, weekdayOffset);


    it(`should have a 'pregnancy-danger-sign' task if a flag is sent during active pregnancy`, function() {
      // given
      pregnancyReport.reported_date = Date.now()-(6*MS_IN_DAY); 
      flagReport.reported_date = Date.now()-(4*MS_IN_DAY);

      var reports = [
        pregnancyReport,
        flagReport,
      ];

      var c = setupContact(Contact, person, reports);
      session.assert(c);

      // expect
      return session.emitTasks()
        .then(function(tasks) {
          assert.equal(tasks.length, 1, "Should have a single task created");
          assert.include(tasks[0]._id, 'pregnancy-danger-sign', "Task id should have correct schedule name included");
        });
    });

    it(`should not have a 'pregnancy-danger-sign' task if a flag is sent before pregnancy`, function() {
      // given
      pregnancyReport.reported_date = Date.now()-(2*MS_IN_DAY); 
      flagReport.reported_date = Date.now()-(4*MS_IN_DAY);

      var reports = [
        pregnancyReport,
        flagReport,
      ];
      var c = setupContact(Contact, person, reports);
      session.assert(c);

      // expect
      return session.emitTasks()
        .then(function(tasks) {
          assert.equal(tasks.length, 0, "Should have no tasks created");
        });
    });

    it(`should not have a 'pregnancy-danger-sign' task if a flag is sent after pregnancy`, function() {
      // given
      pregnancyReport.reported_date = Date.now()-(8*MS_IN_DAY);
      deliveryReport.reported_date = Date.now()-(6*MS_IN_DAY);
      flagReport.reported_date = Date.now()-(4*MS_IN_DAY);

      var reports = [
        pregnancyReport,
        deliveryReport,
        flagReport,
      ];

      var c = setupContact(Contact, person, reports);
      session.assert(c);

      // expect
      return session.emitTasks()
        .then(function(tasks) {
          // console.log(JSON.stringify(tasks,null,2));
          // should have an unresolved postnatal task and a resolved pregnancy task
          assert.equal(tasks.length, 2, "Should have two tasks created"); 
          assert.include(tasks[0]._id, 'pregnancy-danger-sign', "Task id should have correct schedule name included");
          assert.deepInclude(tasks[0], {resolved: true}, "Should have a resolved field set to true");
        });
    });

    range(weekdayOffset, MAX_DAYS_IN_PREGNANCY).forEach(day => {

      describe(`Pregnancy without LMP: day ${day}`, function() {

        if (pregnancyTaskDays.includes(day)) {
          it(`should have 'pregnancy-missing-visit' visit task on day ${day}`, function() {
            // given
            var reports = [require('./p.json')];
            var c = setupContact(Contact, person, setupReports(reports, day));
            session.assert(c);

            // expect
            return session.emitTasks()
              .then(function(tasks) {
                assert.equal(tasks.length, 1, "Should have a single task created");
                assert.include(tasks[0]._id, 'pregnancy-missing-visit', "Task id should have correct schedule name included");
              });
          });
        }
        else {
          it(`should not have 'pregnancy-missing-visit' visit task on day ${day}`, function() {
            // given
            var reports = [require('./p.json')];
            var c = setupContact(Contact, person, setupReports(reports, day));
            session.assert(c);

            // expect
            return session.emitTasks()
              .then(function(tasks) {
                tasks.forEach(t => { 
                  assert.notInclude(t._id, 'pregnancy-missing-visit', "Task id should not include 'pregnancy-missing-visit'");
                });
              });
          });
        }
        if (deliveryTaskDays.includes(day)) {
          it(`should have 'pregnancy-missing-birth' visit task on day ${day}`, function() {
            // given
            var reports = [require('./p.json')];
            var c = setupContact(Contact, person, setupReports(reports, day));
            session.assert(c);

            // expect
            return session.emitTasks()
              .then(function(tasks) {
                assert.equal(tasks.length, 1, "Should have a single task created");
                assert.include(tasks[0]._id, 'pregnancy-missing-birth', "Task id should have correct schedule name included");
              });
          });
        }
        else {
          it(`should not have 'pregnancy-missing-birth' visit task on day ${day}`, function() {
            // given
            var reports = [require('./p.json')];
            var c = setupContact(Contact, person, setupReports(reports, day));
            session.assert(c);

            // expect
            return session.emitTasks()
              .then(function(tasks) {
                tasks.forEach(t => { 
                  assert.notInclude(t._id, 'pregnancy-missing-birth', "Task id should not include 'pregnancy-missing-birth'");
                });
              });
          });
        }
      });
    });
  });
  describe('Childhood Immunizations', function() {

    var newChildReport = require('./c.json');
    
    var weekdayOffset = -5;

    var immunizationTasks = {
      offset: 7,
      pre: 0,
      post: 13,
      triggers: [
        7*WEEKS, 
        13*WEEKS, 
        19*WEEKS,
        25*WEEKS,
        36*WEEKS,
        53*WEEKS,
        65*WEEKS,
        73*WEEKS,
        90*WEEKS,
      ]
    };
    var immunizationTaskDays = getRangeFromTask(immunizationTasks, weekdayOffset);
    var ageInDaysWhenRegistered = Math.floor((newChildReport.reported_date - (new Date(newChildReport.birth_date).getTime()))/MS_IN_DAY);

    // Test for 10 days beyond the immunization period
    range(ageInDaysWhenRegistered, IMMUNIZATION_PERIOD + 10).forEach(day => {
      describe(`Immunization: day ${day}`, function() {

        if (immunizationTaskDays.includes(day)) {
          it(`should have 'immunization-missing-visit' visit task on day ${day}`, function() {
            // given
            var reports = setupReports([newChildReport], day - ageInDaysWhenRegistered);
            var c = setupContact(Contact, person, reports);
            session.assert(c);

            // expect
            return session.emitTasks()
              .then(function(tasks) {
                // console.log(JSON.stringify(tasks,null,2));
                assert.equal(tasks.length, 1, "Should have a single task created");
                assert.include(tasks[0]._id, 'immunization-missing-visit', "Task id should have correct schedule name included");
                assert.deepInclude(tasks[0], {resolved: false}, "Should have a resolved field set to false");
              });
          });
          it(`should have a cleared visit task on day ${day} if received a visit`, function() {
            // given
            var reports = setupReports([newChildReport, immVisitSMSReport], day - ageInDaysWhenRegistered);
            reports[1].reported_date = Date.now();  // make sure the immuniztion report was sent today
            var c = setupContact(Contact, person, reports);
            session.assert(c);

            // expect
            return session.emitTasks()
              .then(function(tasks) {
                assert.equal(tasks.length, 1, "Should have a single task created");
                assert.include(tasks[0]._id, 'immunization-missing-visit', "Task id should have correct schedule name included");
                assert.deepInclude(tasks[0], {resolved: true}, "Should have a resolved field set to true");
              });
          });

        }
        else {
          it(`should not have 'immunization-missing-visit' visit task on day ${day}`, function() {
            // given
            var reports = setupReports([newChildReport], day - ageInDaysWhenRegistered);
            var c = setupContact(Contact, person, reports);
            session.assert(c);

            // expect
            return session.emitTasks()
              .then(function(tasks) {
                assert.equal(tasks.length, 0, "Should have no task");
              });
          });
        }
      });
    });
  });
});

function range(a, b) {
  return Array.apply(null, { length:b-a+1 }).map((_, i) => i+a);
}

function getDayRanges(startDays, duration, offset) {
  var a = new Array();
  startDays.forEach(day => {
    var startVal = day + offset;
    var endVal = startVal + duration - 1;
    a.push(range(startVal, endVal));
  });

  // return the flattened 1D array
  return [].concat.apply([], a);
};

function getRangeFromTask(task, offset) {
  var a = new Array();
  task.triggers.forEach(t => {
    var start = t + task.offset - task.pre;
    var end = t + task.offset + task.post;
    a.push(range(start + offset, end + offset));
  });

  // return the flattened 1D array
  return [].concat.apply([], a);
};

function getRange(startDay, durationInDays, offset) {
  return range(startDay+offset, startDay+durationInDays+offset);
};

function setDate(form, newDate) {
  // Sets the newDate as the form's reported date, and modifies other dates in doc by the same offset
  var originalDate = new Date(form.reported_date);
  var diff = originalDate - newDate;
  diff = (Math.round(diff/MS_IN_DAY))*MS_IN_DAY; // to avoid changing the number of days between event get diff in days, not ms
  form.reported_date = newDate;
  traverse(form, resetDate, "birth_date", diff);
  traverse(form, resetDate, "due", diff);
  // traverse(form, logField, "due");
  return form;
}

function logField(object, key, keyToChange, offset) {
    if (key === keyToChange) {
      console.log(key + " : " + object[key]);
    }
}

function resetDate(object, key, keyToChange, offset) {
    if (key === keyToChange) {
      var date = new Date(object[key]);
      var date2 = new Date(date.getTime() - offset);
      object[key] = date2.toISOString();
      // console.log(key + " : " + object[key]);
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
var setupReports = function(reports, day) {
  //  reports:   array of reports
  //  day:       number of days to push back all the dates in reports

  if (day !== undefined && reports) {
    // Sets up the tasks by using the doc and reports 
    reports.forEach(r => {
      // r = setDate(r, Date.now()-(day*MS_IN_DAY)); 
      var noonToday = (new Date()).setHours(12,0,0,0);
      r = setDate(r, noonToday-(day*MS_IN_DAY)); 
    });
  }
  return reports;
};

var setupContact = function(Contact, person, reports) {
  // TODO: Investigate how timezone affect showing task.
  // Tests pass vs fail with task window being off by one at 11pm vs 12:15am on GMT+2.
  return new Contact({
    contact: person,
    reports: reports,
  });
};
