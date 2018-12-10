const assert = require('chai').assert;
const NootilsManager = require('medic-nootils/src/node/test-wrapper');

let reportIdCounter;

const today = NootilsManager.BASE_DATE;


describe('Standard Configuration Targets', function() {

  let nootilsManager, Contact, session;

  before(() => {
    nootilsManager = NootilsManager({
      user: {
        parent: {
          type: 'health_center',
          use_cases: ''
        },
      },
    });
    Contact = nootilsManager.Contact;
    session = nootilsManager.session;
  });
  beforeEach(() => reportIdCounter = 0);


  afterEach(() => nootilsManager.afterEach());
  after(() => nootilsManager.after());

  describe('child screened by CHW', function() {
    it('should create a child screened target instance', function() {
      // given
      session.assert(childWithReport(
        {
          form: 'G',
          fields: {},
          reported_date: today,
        }
      ));

      // expect
      return session.emitTargets()
        .then(targets => {

          const expectedTarget = {
            _id: 'child-1-children-growth-monitoring',
            deleted: false,
            type: 'children-growth-monitoring',
            pass: true,
            date: today
          };

          assert.deepInclude(targets, expectedTarget);
        });
    });

  });

  describe('child screened for nutrition at facility', function(){

    it('should create underweight target instance', function() {

      const r = {
        form: 'malnutrition_screening',
        fields: {
          zscore: {
            zscore_wfa: -3
          }
        },
        reported_date: today,
      };

      session.assert(childWithReport(r));

      // expect
      return session.emitTargets()
        .then(targets => {
          const expectedTarget = {
            _id: 'child-1-children-underweight',
            deleted: false,
            type: 'children-underweight',
            pass: true,
            date: today
          };

          assert.deepInclude(targets, expectedTarget);

        });
    });


    it('should create stunted growth target instance', function() {
      const r = {
        form: 'malnutrition_screening',
        fields: {
          zscore: {
            zscore_hfa: -3
          }
        },
        reported_date: today,
      };

      session.assert(childWithReport(r));

      return session.emitTargets()
        .then(targets => {

          const expectedTarget = {
            _id: 'child-1-children-stunted',
            deleted: false,
            type: 'children-stunted',
            pass: true,
            date: today
          };

          assert.deepInclude(targets, expectedTarget);

        });
    });

  });

  describe('children active MAM', function(){
    it('should create active MAM target for WFH z-score between -3 & -2', function(){
      const r = {
        form: 'treatment_enrollment',
        fields: {
          zscore: {
            zscore_wfh: -3
          }
        },
        reported_date: today,
      };

      session.assert(childWithReport(r));

      return session.emitTargets()
        .then(targets => {

          const expectedTarget = {
            _id: 'child-1-children-mam',
            deleted: false,
            type: 'children-mam',
            pass: true,
            date: today
          };

          assert.deepInclude(targets, expectedTarget);
        });

    });

    it('should create active MAM trget for MUAC between 11.5 & 12.4 cm', function(){
      const r = {
        form: 'treatment_enrollment',
        fields: {
          zscore: {
            muac: 12
          }
        },
        reported_date: today,
      };

      session.assert(childWithReport(r));

      return session.emitTargets()
        .then(targets => {

          const expectedTarget = {
            _id: 'child-1-children-mam',
            deleted: false,
            type: 'children-mam',
            pass: true,
            date: today
          };

          assert.deepInclude(targets, expectedTarget);
        });
    });
  });


  describe('children active SAM', function(){
    it('should create active SAM target for WFH z-score less than -3', function(){
      const r = {
        form: 'treatment_enrollment',
        fields: {
          zscore: {
            zscore_wfh: -4
          }
        },
        reported_date: today,
      };

      session.assert(childWithReport(r));

      return session.emitTargets()
        .then(targets => {

          const expectedTarget = {
            _id: 'child-1-children-sam',
            deleted: false,
            type: 'children-sam',
            pass: true,
            date: today
          };

          assert.deepInclude(targets, expectedTarget);
        });

    });

    it('should create active SAM trget for MUAC less than 11.5 cm', function(){
      const r = {
        form: 'treatment_enrollment',
        fields: {
          zscore: {
            muac: 10
          }
        },
        reported_date: today,
      };

      session.assert(childWithReport(r));

      return session.emitTargets()
        .then(targets => {

          const expectedTarget = {
            _id: 'child-1-children-sam',
            deleted: false,
            type: 'children-sam',
            pass: true,
            date: today
          };

          assert.deepInclude(targets, expectedTarget);
        });
    });
  });

  describe('children active OTP', function(){
    it('should create active OTP for children enrolled', function(){
      const r = {
        form: 'treatment_enrollment',
        fields: {
          enrollment: {
            program: 'OTP'
          }
        },
        reported_date: today,
      };

      session.assert(childWithReport(r));

      return session.emitTargets()
        .then(targets => {

          const expectedTarget = {
            _id: 'child-1-children-otp',
            deleted: false,
            type: 'children-otp',
            pass: true,
            date: today
          };

          assert.deepInclude(targets, expectedTarget);
        });

    });
  });

  describe('children active SFP', function(){
    it('should create active SFP target for children enrolled', function(){
      const r = {
        form: 'treatment_enrollment',
        fields: {
          enrollment: {
            program: 'SFP'
          }
        },
        reported_date: today,
      };

      session.assert(childWithReport(r));

      return session.emitTargets()
        .then(targets => {

          const expectedTarget = {
            _id: 'child-1-children-sfp',
            deleted: false,
            type: 'children-sfp',
            pass: true,
            date: today
          };

          assert.deepInclude(targets, expectedTarget);
        });

    });
  });

  function childWithNoReports() {
    return childWithReports();
  }

  function childWithReport(report) {
    return childWithReports(report);
  }

  function childWithReports(...reports) {
    const contact = {
      _id: 'child-1',
      type: 'person',
      name: 'Zoe',
      date_of_birth: '2018-05-01',
      reported_date: today,
    };

    return new Contact({ contact, reports });
  }


});

function assertTargetsEqual(actual, expected) {
  const sortTargets = (a, b) => a._id.localeCompare(b._id);
  assert.deepEqualExcluding(actual.sort(sortTargets), expected.sort(sortTargets), 'date');
}
