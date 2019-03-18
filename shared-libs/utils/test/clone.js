const clone = require('../src/clone'),
      chai = require('chai');

const runTest = (source, breakCircularReferences) => {
  let result = clone(source, breakCircularReferences);
  chai.expect(result).to.deep.equal(source);
  chai.expect(result).to.not.equal(source);
  return result;
};

describe('clone', () => {
  it('should clone simple values', () => {
    chai.expect(clone(1)).to.equal(1);
    chai.expect(clone(null)).to.equal(null);
    chai.expect(clone()).to.equal(undefined);
    chai.expect('Mera').to.equal('Mera');
    chai.expect(true).to.equal(true);
  });

  it('should clone arrays', () => {
    runTest([1, 2, 3]);
    runTest([[1], [[2, 3]], [4]]);
  });

  it('should clone objects', () => {
    runTest({});
    runTest({ a: 1, b: 2, c: { d: 1, f: 2 } });
    runTest(chai);
    runTest(new Date());
  });

  it('should clone functions', () => {
    let fn,
        clonedFn;
    fn = (a, b) => a + b;
    clonedFn = clone(fn);
    chai.expect(clonedFn).to.equal(fn);
    chai.expect(fn(2, 3)).to.equal(clonedFn(2, 3));

    fn = function(a, b) { return a + b; };
    fn = fn.bind(null, 3, 5);
    clonedFn = clone(fn);
    chai.expect(clonedFn).to.equal(fn);
    chai.expect(fn()).to.equal(8);
    chai.expect(clonedFn()).to.equal(8);
  });

  it('should clone nested all sorts', () => {
    const elem = [{
      elem: 1,
      elem2: [1, 2, 3],
      elem3: { a: 1, b: { c: 1 } },
      elem4: new Date(),
      'elem 5': new RegExp('^test$'),
      fn: a => a * a
    }, [
      3, [6], [[7, 8]]
    ]];
    const cloned = runTest(elem);
    chai.expect(cloned[0].elem2).to.not.equal(elem[0].elem2);
    cloned[0].elem3.b.c = 13;
    cloned[1][2][0][1] = 10;
    chai.expect(elem[0].elem3.b.c).to.equal(1);
    chai.expect(elem[1][2][0][1]).to.equal(8);
  });

  it('should clone circular reference objects', () => {
    const obj = { a: 2 };
    obj.ref = obj;
    runTest(obj);
  });

  it('should be faster that JSON parse & stringify', () => {
    const obj = {
      patient_reports: [{
        form: 'TEMP',
        validations: {
          list: [
            {
              property: 'temp',
              rule: 'min(30) && max(60)',
              message: [{
                locale: 'en',
                content: 'Temperature seems incorrect'
              }],
            },
          ],
          join_responses: false
        },
        messages: [{
          event_type: 'registration_not_found',
          message: [{
            locale: 'en',
            content: 'Patient not found'
          }],
        }, {
          event_type: 'report_accepted',
          message: [{
            locale: 'en',
            content: 'Temperature registered'
          }],
        }]
      }],
      alerts: [{
        form: 'TEMP',
        condition: 'doc.fields.temp > 39',
        message: 'Patient temperature high',
        recipient: 'reporting_unit'
      }],
      death_reporting: {
        mark_deceased_forms: ['DEATH'],
        date_field: 'reported_date'
      },
      muting: {
        mute_forms: ['MUTE'],
        messages: [{
          event_type: 'mute',
          message: [{
            locale: 'en',
            content: 'Patient {{patient_id}} muted'
          }],
        }]
      },
      default_responses: { start_date: '2018-01-01' },
      registrations: [{
        form: 'CHILD',
        events: [{
          name: 'on_create',
          trigger: 'add_patient',
          params: { patient_id_field: 'our_patient_id', patient_name_field: 'our_patient_name' },
          bool_expr: ''
        }, {
          name: 'on_create',
          trigger: 'assign_schedule',
          params: 'new patient',
          bool_expr: ''
        }],
        messages: [{
          event_type: 'report_accepted',
          message: [{
            locale: 'en',
            content: 'Patient {{patient_id}} created'
          }],
        }],
      }],
      schedules: [{
        name: 'new patient',
        start_from: 'reported_date',
        messages: [{
          offset: '1 month',
          message: [{
            locale: 'en',
            content: 'Revisit patient {{patient_id}}'
          }],
        }, {
          offset: '1 week',
          message: [{
            locale: 'en',
            content: 'First visit'
          }],
        }]
      }]
    };

    const startJson = new Date().getTime();
    for (let i = 0; i < 3000; i++) {
      JSON.parse(JSON.stringify(obj));
    }
    const durationJson = new Date().getTime() - startJson;

    const startClone = new Date().getTime();
    for (let i = 0; i < 3000; i++) {
      clone(obj);
    }
    const durationClone = new Date().getTime() - startClone;
    chai.expect(durationClone).to.be.below(durationJson);
  });
});
