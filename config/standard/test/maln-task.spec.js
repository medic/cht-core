const assert = require('chai').assert;
const NootilsManager = require('medic-nootils/src/node/test-wrapper');
const _ = require('lodash');
const freshCloneOf = o => () => _.cloneDeep(o);

const now = NootilsManager.BASE_DATE;

const fixtures = {
  contact: freshCloneOf({
    type: 'person',
    name: 'Zoe',
    date_of_birth: '1990-09-01',
    reported_date: now,
    _id: 'contact-1'
  }),
  reports: {
    cw: freshCloneOf({
      _id: 'cw-1',
      fields: {},
      form: 'CW',
      reported_date: now,
    }),
    malnutrition_screening: freshCloneOf({
      _id: 'ms-report-1',
      fields:{
        zscore: { treatment: 'yes'}
      },
      form: 'malnutrition_screening',
      reported_date: now,
    }),
    g: freshCloneOf({
      _id: 'ms-report-1',
      fields:{
        severity: 2
      },
      form: 'G',
      reported_date: now,
    }),
    dr: freshCloneOf({
      _id: 'dr-report-1',
      fields: {},
      form: 'DR',
      reported_date: now,
    }),
  },
};


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

describe('Nutrition Tests', function(){

  it('should raise nutrition screening task', function(){

    session.assert(contactWith(fixtures.reports.g()));

    return session.emitTasks()
      .then(tasks => {

        const task = tasks[0];

        assertTitle(task, 'task.malnutrition_screening.title');
        assertIcon(task, 'child');
        assertNotResolved(task);
        assert.include(task.actions[0], {form: 'malnutrition_screening'});
      });
  });

  it('should raise treatment enrollment task', function(){

    session.assert(contactWith(fixtures.reports.malnutrition_screening()));

    return session.emitTasks()
      .then(tasks => {

        const task = tasks[0];

        assertTitle(task, 'task.treatment_enrollment.title');
        assertIcon(task, 'child');
        assertNotResolved(task);
        assert.include(task.actions[0], {form: 'treatment_enrollment'});
      });
  });


  it('should raise death confirmation task', function(){

    session.assert(contactWith(fixtures.reports.dr()));

    return session.emitTasks()
      .then(tasks => {

        const task = tasks[0];

        assertTitle(task, 'task.death_confirmation.title');
        assertIcon(task, 'risk');
        assertNotResolved(task);
        assert.include(task.actions[0], {form: 'death_confirmation'});
      });
  });

});

function contactWith(...reports) {
  // TODO: Investigate how timezone affect showing task.
  // Tests pass vs fail with task window being off by one at 11pm vs 12:15am on GMT+2.
  return new Contact({ contact:fixtures.contact(), reports });
}

function assertIcon(task, expectedIcon) {
  assert.equal(task.icon, expectedIcon);
}

function assertTitle(task, expectedTitle) {
  assert.equal(task.title, expectedTitle);
}

function assertNotResolved(task) {
  assert.isFalse(task.resolved);
}
