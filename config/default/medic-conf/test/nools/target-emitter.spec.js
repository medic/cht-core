const chai = require('chai');
const sinon = require('sinon');

const runNoolsLib = require('../run-nools-lib');
const {
  TEST_DATE,
  reset,
  aPersonBasedTarget,
  aPlaceBasedTarget,
  aReportBasedTarget,
  aReport,
  personWithoutReports,
  personWithReports,
  placeWithoutReports,
  placeWithReports,
  aRandomTimestamp,
  configurableHierarchyPersonWithReports,
} = require('./mocks');

const { expect, assert } = chai;

describe('target emitter', () => {
  beforeEach(() => reset());

  describe('test setup', () => {
    it('should successfully parse the lib', () => {
      // given
      const emptyConfig = { c:{}, targets:[] };

      // when
      const lib = runNoolsLib(emptyConfig);

      // then
      assert.isNotNull(lib);
    });

    it('should emit completed signal', () => {
      // given
      const emptyConfig = { c:{}, targets:[] };

      // when
      const emitted = runNoolsLib(emptyConfig).emitted;

      // then
      assert.deepEqual(emitted, [ { _type:'_complete', _id: true } ]);
    });
  });

  describe('targets', () => {
    describe('person-based', () => {
      it('should emit once for a person with no reports', () => {
        // given
        const config = {
          c: personWithoutReports(),
          targets: [ aPersonBasedTarget() ],
          tasks: [],
        };

        // when
        const emitted = runNoolsLib(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _id: 'c-1~pT-2', _type:'target', date: TEST_DATE },
          { _type:'_complete', _id: true },
        ]);
      });

      it('should emit once for a person with one report', () => {
        // given
        const config = {
          c: personWithReports(aReport()),
          targets: [ aPersonBasedTarget() ],
          tasks: [],
        };

        // when
        const emitted = runNoolsLib(config).emitted;

        // then
        assert.deepEqual(emitted, [
          {_id: 'c-2~pT-3', _type:'target', date:TEST_DATE },
          { _type:'_complete', _id: true },
        ]);
      });

      it('should emit once for a person with multiple reports', () => {
        // given
        const config = {
          c: personWithReports(aReport(), aReport(), aReport()),
          targets: [ aPersonBasedTarget() ],
          tasks: [],
        };

        // when
        const emitted = runNoolsLib(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _id: 'c-4~pT-5', _type:'target', date:TEST_DATE },
          { _type:'_complete', _id: true },
        ]);
      });

      it('should allow "reported" as target date', () => {
        // given
        const target = aPersonBasedTarget();
        target.date = 'reported';
        // and
        const reportedDate = aRandomTimestamp();
        const contact = personWithoutReports();
        contact.contact.reported_date = reportedDate;

        // and
        const config = {
          c: contact,
          targets: [ target ],
          tasks: [],
        };

        // when
        const emitted = runNoolsLib(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _id: 'c-2~pT-1', _type:'target', date: reportedDate },
          { _type:'_complete', _id: true },
        ]);
      });

      it('should allow "now" as target date', () => {
        // given
        const target = aPersonBasedTarget();
        target.date = 'now';
        // and
        const config = {
          c: personWithoutReports(),
          targets: [ target ],
          tasks: [],
        };

        // when
        const emitted = runNoolsLib(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _id: 'c-2~pT-1', _type:'target', date:TEST_DATE },
          { _type:'_complete', _id: true },
        ]);
      });

      it('should not emit if appliesToType doesnt match', () => {
        // given
        const target = aPersonBasedTarget();
        target.appliesToType = [ 'dne' ];

         const config = {
          c: personWithReports(aReport()),
          targets: [ target ],
          tasks: [],
        };

         // when
        const emitted = runNoolsLib(config).emitted;

         // then
        expect(emitted).to.have.property('length', 1);
      });

      it('groupBy propogates onto instance', () => {
        // given
        const target = aReportBasedTarget();
        const groupBy = sinon.stub().returns('agg');
        target.groupBy = groupBy;

        const config = {
          c: personWithReports(aReport()),
          targets: [ target ],
          tasks: [],
        };

        // when
        const { emitted } = runNoolsLib(config);

        // then
        expect(emitted).to.have.property('length', 2);
        expect(emitted[0]).to.deep.include({
          _id: 'c-3~rT-1',
          _type: 'target',
          groupBy: 'agg',
        });
        expect(groupBy.args).to.deep.eq([[config.c, config.c.reports[0]]]);
      });

      describe('idType', () => {
        it('as report', () => {
          // given
          const target = aReportBasedTarget();
          target.idType = 'report';

          const config = {
            c: personWithReports(aReport()),
            targets: [ target ],
            tasks: [],
          };

          // when
          const { emitted } = runNoolsLib(config);

          // then
          expect(emitted).to.have.property('length', 2);
          expect(emitted[0]).to.deep.include({
            _id: 'r-2~rT-1',
            _type: 'target',
          });
        });

        it('as function', () => {
          // given
          const target = aReportBasedTarget();
          const idType = sinon.stub().returns('func');
          target.idType = idType;

          const config = {
            c: personWithReports(aReport()),
            targets: [ target ],
            tasks: [],
          };

          // when
          const { emitted } = runNoolsLib(config);

          // then
          expect(emitted).to.have.property('length', 2);
          expect(emitted[0]).to.deep.include({
            _id: 'func~rT-1',
            _type: 'target',
          });
          expect(idType.args[0]).to.deep.eq([config.c, config.c.reports[0]]);
        });

        it('as function returning array', () => {
          // given
          const target = aReportBasedTarget();
          const idType = sinon.stub().returns(['a', 'b', 'c']);
          target.idType = idType;

          const config = {
            c: personWithReports(aReport()),
            targets: [ target ],
            tasks: [],
          };

          // when
          const { emitted } = runNoolsLib(config);

          // then
          expect(emitted).to.have.property('length', 4);
          expect(emitted.map(e => e._id)).to.deep.eq(['a~rT-1', 'b~rT-1', 'c~rT-1', true]);
          expect(idType.args[0]).to.deep.eq([config.c, config.c.reports[0]]);
        });

        it('as contact', () => {
          // given
          const target = aReportBasedTarget();
          target.idType = 'contact';

          const config = {
            c: personWithReports(aReport()),
            targets: [ target ],
            tasks: [],
          };

          // when
          const { emitted } = runNoolsLib(config);

          // then
          expect(emitted).to.have.property('length', 2);
          expect(emitted[0]).to.deep.include({
            _id: 'c-3~rT-1',
            _type: 'target',
          });
        });
      });
    });

    describe('place-based', () => {
      it('should emit once for a place with no reports', () => {
        // given
        const config = {
          c: placeWithoutReports(),
          targets: [ aPlaceBasedTarget() ],
          tasks: [],
        };

        // when
        const emitted = runNoolsLib(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _id: 'c-1~plT-2', _type:'target', date:TEST_DATE },
          { _type:'_complete', _id: true },
        ]);
      });

      it('should emit once for a place with one report', () => {
        // given
        const config = {
          c: placeWithReports(aReport()),
          targets: [ aPlaceBasedTarget() ],
          tasks: [],
        };

        // when
        const emitted = runNoolsLib(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _id: 'c-2~plT-3', _type:'target', date:TEST_DATE },
          { _type:'_complete', _id: true },
        ]);
      });

      it('should emit once for a place with multiple reports', () => {
        // given
        const config = {
          c: placeWithReports(aReport(), aReport(), aReport()),
          targets: [ aPlaceBasedTarget() ],
          tasks: [],
        };

        // when
        const emitted = runNoolsLib(config).emitted;

        // then
        assert.deepEqual(emitted, [
          { _id: 'c-4~plT-5', _type:'target', date:TEST_DATE },
          { _type:'_complete', _id: true },
        ]);
      });
    });

    describe('report-based', () => {
      describe('with a single target', () => {
        it('should not emit for person with no reports', () => {
          // given
          const config = {
            c: personWithoutReports(aReport()),
            targets: [ aReportBasedTarget() ],
            tasks: [],
          };

          // when
          const emitted = runNoolsLib(config).emitted;

          // then
          assert.deepEqual(emitted, [
            { _type:'_complete', _id: true },
          ]);
        });

        it('should emit once for person with once report', () => {
          // given
          const config = {
            c: personWithReports(aReport()),
            targets: [ aReportBasedTarget() ],
            tasks: [],
          };

          // when
          const emitted = runNoolsLib(config).emitted;

          // then
          assert.deepEqual(emitted, [
            { _type:'target', _id:'c-2~rT-3', date: TEST_DATE },
            { _type:'_complete', _id: true },
          ]);
        });

        it('should emit once per report for person with multiple reports', () => {
          // given
          const config = {
            c: personWithReports(aReport(), aReport(), aReport()),
            targets: [ aReportBasedTarget() ],
            tasks: [],
          };

          // when
          const emitted = runNoolsLib(config).emitted;

          // then
          assert.deepEqual(emitted, [
            { _type:'target', _id:'c-4~rT-5', date: TEST_DATE },
            { _type:'target', _id:'c-4~rT-5', date: TEST_DATE },
            { _type:'target', _id:'c-4~rT-5', date: TEST_DATE },
            { _type:'_complete', _id: true },
          ]);
        });

        it('should not emit if appliesToType doesnt match', () => {
          // given
          const target = aReportBasedTarget();
          target.appliesToType = [ 'dne' ];

           const config = {
            c: personWithReports(aReport()),
            targets: [ target ],
            tasks: [],
          };

           // when
          const emitted = runNoolsLib(config).emitted;

           // then
          expect(emitted).to.have.property('length', 1);
        });
      });

      describe('with multiple targets', () => {
        it('should not emit for person with no reports', () => {
          // given
          const config = {
            c: personWithoutReports(aReport()),
            targets: [ aReportBasedTarget(), aReportBasedTarget() ],
            tasks: [],
          };

          // when
          const emitted = runNoolsLib(config).emitted;

          // then
          assert.deepEqual(emitted, [
            { _type:'_complete', _id: true },
          ]);
        });
        it('should emit once per report for person with one report', () => {
          // given
          const config = {
            c: personWithReports(aReport()),
            targets: [ aReportBasedTarget(), aReportBasedTarget() ],
            tasks: [],
          };

          // when
          const emitted = runNoolsLib(config).emitted;

          // then
          assert.deepEqual(emitted, [
            { _type:'target', _id:'c-2~rT-3', date: TEST_DATE },
            { _type:'target', _id:'c-2~rT-4', date: TEST_DATE },
            { _type:'_complete', _id: true },
          ]);
        });
        it('should emit once per report for person with multiple reports', () => {
          // given
          const config = {
            c: personWithReports(aReport(), aReport(), aReport()),
            targets: [ aReportBasedTarget(), aReportBasedTarget() ],
            tasks: [],
          };

          // when
          const emitted = runNoolsLib(config).emitted;

          // then
          assert.deepEqual(emitted, [
            { _type:'target', _id:'c-4~rT-5', date: TEST_DATE },
            { _type:'target', _id:'c-4~rT-5', date: TEST_DATE },
            { _type:'target', _id:'c-4~rT-5', date: TEST_DATE },
            { _type:'target', _id:'c-4~rT-6', date: TEST_DATE },
            { _type:'target', _id:'c-4~rT-6', date: TEST_DATE },
            { _type:'target', _id:'c-4~rT-6', date: TEST_DATE },
            { _type:'_complete', _id: true },
          ]);
        });
      });
    });

    it('appliesToType is optional', () => {
      // given
      const target = aPersonBasedTarget();
      delete target.appliesToType;

       const config = {
        c: personWithReports(aReport()),
        targets: [ target ],
        tasks: [],
      };

       // when
      const emitted = runNoolsLib(config).emitted;

       // then
      assert.deepEqual(emitted, [
        { _id: 'c-3~pT-1', _type:'target', date: TEST_DATE },
        { _type:'_complete', _id: true },
      ]);
    });

    it('invalid target type should throw', () => {
      // given
      const invalidTarget = aReportBasedTarget();
      invalidTarget.appliesTo = 'unknown';

      const config = {
        c: personWithReports(aReport()),
        targets: [ invalidTarget ],
        tasks: [],
      };

      // throws
      assert.throws(() => runNoolsLib(config), Error, 'Unrecognised target.appliesTo: unknown');
    });

    it('configurable contact type', () => {
      const target = aPersonBasedTarget();
      target.appliesToType = ['custom'];

      const config = {
        c: configurableHierarchyPersonWithReports(aReport()),
        targets: [ target ],
        tasks: [],
      };

      // when
      const emitted = runNoolsLib(config).emitted;

      // then
      assert.deepEqual(emitted, [
        { _id: 'c-3~pT-1', _type:'target', date: TEST_DATE },
        { _type:'_complete', _id: true },
      ]);
    });

    it('hardcoded contact type with a contact_type property, target matching type', () => {
      const target = aPersonBasedTarget();
      target.appliesToType = ['person'];

      const config = {
        c: personWithReports(aReport()),
        targets: [ target ],
        tasks: [],
      };
      config.c.contact.contact_type = 'something';

      // when
      const emitted = runNoolsLib(config).emitted;

      // then
      assert.deepEqual(emitted, [
        { _id: 'c-3~pT-1', _type:'target', date: TEST_DATE },
        { _type:'_complete', _id: true },
      ]);
    });

    it('hardcoded contact type with a contact_type property, target matching contact_type', () => {
      const target = aPersonBasedTarget();
      target.appliesToType = ['something'];

      const config = {
        c: personWithReports(aReport()),
        targets: [ target ],
        tasks: [],
      };
      config.c.contact.contact_type = 'something';

      // when
      const emitted = runNoolsLib(config).emitted;

      // then
      assert.deepEqual(emitted, [
        { _type:'_complete', _id: true },
      ]);
    });

    it('hardcoded contact type with a contact_type property, target matching type and contact_type', () => {
      const target = aPersonBasedTarget();
      target.appliesToType = ['person', 'something'];

      const config = {
        c: personWithReports(aReport()),
        targets: [ target ],
        tasks: [],
      };
      config.c.contact.contact_type = 'something';

      // when
      const emitted = runNoolsLib(config).emitted;

      // then
      assert.deepEqual(emitted, [
        { _id: 'c-3~pT-1', _type:'target', date: TEST_DATE },
        { _type:'_complete', _id: true },
      ]);
    });
  });
});
