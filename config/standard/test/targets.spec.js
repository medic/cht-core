const chai = require('chai');
const path = require('path');
const sinon = require('sinon');

const { assert } = chai;
chai.use(require('chai-exclude'));

const TestHarness = require('cht-conf-test-harness');
const now = 1469358731456;

let reportIdCounter;

// TODO set undef:true in jshint config
// TODO why does giving birth as a facility count towards pnc-3-visits, but not as an individual pnc-visits-this-month?

const harness = new TestHarness({
  directory: path.resolve(__dirname, '..'),
  inputs: {
    user: { _id: 'user' },
  },
});

const getTargetsWithInstances = async () => (await harness.getTargets())
  .filter(target => target.value.total);

describe('Standard Configuration Targets', () => {
  after(() => sinon.restore());
  afterEach(() => harness.clear());
  beforeEach(() => {
    reportIdCounter = 0;
    sinon.useFakeTimers(now);
  });

  describe('adult with no reports', () => {
    it('should not create any target instances', async () => {
      adultWithReports();
      // expect
      const targets = await getTargetsWithInstances();
      assert.deepEqual(targets, []);
    });
  });

  describe('PNC', () => {
    it('should have 1 PNC', async () => {
      // given
      adultWithReports({
        fields: { delivery_code: 'NS' },
        birth_date: new Date(daysAgo(3)).toISOString(),
        form: 'delivery',
        reported_date: today,
      });

      // when
      const targets = await getTargetsWithInstances();
      assert.equal(targets.length, 2, 'Should have 2 target instances');
      const expectedTargets = [
        {
          id: 'pnc-active',
          value: { pass: 1, total: 1 },
        },
        {
          id: 'pnc-homebirth-0-visits',
          value: { pass: 1, total: 1 },
        },
      ];

      assertTargetsEqual(targets, expectedTargets, 'date');
    });

    describe('visits-this-month counter', async () => {
      it('should register a visit made this month', async () => {
        // given
        adultWithReports(
          facilityDelivery(threeWeeksAgo),
          { _id: nextReportId('pnc'), form: 'M', reported_date: aWeekAgo });

        // when
        const targets = await getTargetsWithInstances();

        // then
        const expectedTargets = [
          {
            id: 'pnc-active',
            value: { pass: 1, total: 1 },
          },
          {
            id: 'births-this-month',
            value: { pass: 1, total: 1 },
          },
          {
            id: 'delivery-at-facility-total',
            value: { pass: 1, total: 1, percent: 100 },
          },
          {
            id: 'delivery-with-min-1-visit',
            value: { pass: 0, total: 1, percent: 0 },
          },
          {
            id: 'delivery-with-min-4-visits',
            value: { pass: 0, total: 1, percent: 0 },
          },
          {
            id: 'pnc-visits-this-month',
            value: { pass: 2, total: 2 },
          },
          {
            id: 'pnc-3-visits',
            value: { pass: 0, total: 1, percent: 0 },
          },
          {
            id: 'pnc-registered-this-month',
            value: { pass: 1, total: 1 },
          },
        ];
        assertTargetsEqual(targets, expectedTargets, 'date');
      });

      it('should not register a visit made last month', async () => {
        // given
        adultWithReports(
          facilityDelivery(weeksAgo(20)),
          { _id: nextReportId('pnc'), form: 'M', reported_date: weeksAgo(19) });

        // when
        const targets = await getTargetsWithInstances();
// TODO Need to consider that this may just be broke...
        // then
        const expectedTargets = [
          // {
          //   // _id: 'adult-1~births-this-month',
          //   // deleted: false,
          //   // pass: true,
          //   id: 'births-this-month',
          //   value: { pass: 1, total: 1 },
          // },
          {
            // _id: 'd-1~delivery-at-facility-total',
            // deleted: false,
            // pass: true,
            id: 'delivery-at-facility-total',
            value: { pass: 1, total: 1, percent: 100 },
          },
          {
            // _id: 'd-1~delivery-with-min-1-visit',
            // deleted: false,
            // pass: false,
            id: 'delivery-with-min-1-visit',
            value: { pass: 0, total: 1, percent: 0 },
          },
          {
            // _id: 'd-1~delivery-with-min-4-visits',
            // deleted: false,
            // pass: false,
            id: 'delivery-with-min-4-visits',
            value: { pass: 0, total: 1, percent: 0 },
          },
          // {
          //   // _id: 'd-1~pnc-visits-this-month',
          //   // deleted: false,
          //   // pass: true,
          //   id: 'pnc-visits-this-month',
          //   value: { pass: 2, total: 2 },
          // },
          // {
          //   // _id: 'pnc-2~pnc-visits-this-month',
          //   // deleted: false,
          //   // pass: true,
          //   id: 'pnc-visits-this-month',
          // },
          {
            // _id: 'adult-1~pnc-3-visits',
            // deleted: false,
            // pass: false,
            id: 'pnc-3-visits',
            value: { pass: 0, total: 1, percent: 0 },
          },
          // {
          //   // _id: 'd-1~pnc-registered-this-month',
          //   // deleted: false,
          //   // pass: true,
          //   id: 'pnc-registered-this-month',
          //   value: { pass: 1, total: 1 },
          // },
        ];

        assertTargetsEqual(targets, expectedTargets, 'date');
      });
    });

    describe('pnc-3-visits target instance', () => {
      describe('facility birth', () => {
        it('should pass for woman who has had 2 pnc visits recently', async () => {
          // given
          adultWithReports(
            facilityDelivery(threeWeeksAgo),
            pncVisxit(aWeekAgo),
            pncVisxit(yesterday));

          // when
          const targets = await getTargetsWithInstances();

          const expectedTargets = [
            {
              id: 'pnc-active',
              value: { pass: 1, total: 1 },
            },
            {
              id: 'births-this-month',
              value: { pass: 1, total: 1 },
            },
            {
              id: 'delivery-at-facility-total',
              value: { pass: 1, total: 1, percent: 100 },
            },
            {
              id: 'delivery-with-min-1-visit',
              value: { pass: 0, total: 1, percent: 0 },
            },
            {
              id: 'delivery-with-min-4-visits',
              value: { pass: 0, total: 1, percent: 0 },
            },
            {
              id: 'pnc-visits-this-month',
              value: { pass: 3, total: 3 },
            },
            {
              id: 'pnc-3-visits',
              value: { pass: 1, total: 1, percent: 100 },
            },
            {
              id: 'pnc-registered-this-month',
              value: { pass: 1, total: 1 },
            }
          ];

          // then
          assertTargetsEqual(targets, expectedTargets, 'date');
        });
        it('should pass for woman who has had 2 pnc visits a long time ago', async () => {
          // given
          adultWithReports(
            facilityDelivery(weeksAgo(100)),
            pncVisxit(weeksAgo(99)),
            pncVisxit(weeksAgo(98)));

          // when
          const targets = await getTargetsWithInstances();
// TODO This one is also broke...
          const expectedTargets = [
            // {
            //   // '_id': 'adult-1~births-this-month',
            //   // 'deleted': false,
            //   id: 'births-this-month',
            //   // 'pass': true,
            //   value: { pass: 1, total: 1 },
            // },
            {
              // '_id': 'd-1~delivery-at-facility-total',
              // 'deleted': false,
              id: 'delivery-at-facility-total',
              // 'pass': true,
              value: { pass: 1, total: 1, percent: 100 },
            },
            {
              // '_id': 'd-1~delivery-with-min-1-visit',
              // 'deleted': false,
              id: 'delivery-with-min-1-visit',
              // 'pass': false,
              value: { pass: 0, total: 1, percent: 0 },
            },
            {
              // '_id': 'd-1~delivery-with-min-4-visits',
              // 'deleted': false,
              id: 'delivery-with-min-4-visits',
              // 'pass': false,
              value: { pass: 0, total: 1, percent: 0 },
            },
            // {
            //   // '_id': 'd-1~pnc-visits-this-month',
            //   // 'deleted': false,
            //   id: 'pnc-visits-this-month',
            //   // 'pass': true,
            //   value: { pass: 3, total: 3 },
            // },
            // {
            //   // '_id': 'pnc-2~pnc-visits-this-month',
            //   // 'deleted': false,
            //   id: 'pnc-visits-this-month',
            //   // 'pass': true,
            //   value: { pass: 1, total: 1 },
            // },
            // {
            //   // '_id': 'pnc-3~pnc-visits-this-month',
            //   // 'deleted': false,
            //   id: 'pnc-visits-this-month',
            //   // 'pass': true,
            //   value: { pass: 1, total: 1 },
            // },
            {
              // '_id': 'adult-1~pnc-3-visits',
              // 'deleted': false,
              id: 'pnc-3-visits',
              // 'pass': true,
              value: { pass: 1, total: 1, percent: 100 },
            },
            // {
            //   // '_id': 'd-1~pnc-registered-this-month',
            //   // 'deleted': false,
            //   id: 'pnc-registered-this-month',
            //   // 'pass': true,
            //   value: { pass: 1, total: 1 },
            // }
          ];

          // then
          assertTargetsEqual(targets, expectedTargets, 'date');
        });
        it('should not pass for woman who has had only 1 PNC visit', async () => {
          // given
          adultWithReports(
            facilityDelivery(aWeekAgo),
            pncVisxit(yesterday));

          // when
          const targets = await getTargetsWithInstances();

          const expectedTargets = [
            {
              id: 'pnc-active',
              value: { pass: 1, total: 1 },
            },
            {
              id: 'births-this-month',
              value: { pass: 1, total: 1 },
            },
            {
              id: 'delivery-at-facility-total',
              value: { pass: 1, total: 1, percent: 100 },
            },
            {
              id: 'delivery-with-min-1-visit',
              value: { pass: 0, total: 1, percent: 0 },
            },
            {
              id: 'delivery-with-min-4-visits',
              value: { pass: 0, total: 1, percent: 0 },
            },
            {
              id: 'pnc-visits-this-month',
              value: { pass: 2, total: 2 },
            },
            {
              id: 'pnc-3-visits',
              value: { pass: 0, total: 1, percent: 0 },
            },
            {
              id: 'pnc-registered-this-month',
              value: { pass: 1, total: 1 },
            }
          ];

          // then
          assertTargetsEqual(targets, expectedTargets, 'date');
        });
      });
      describe('home birth', () => {
        it('should pass for woman who has had 3 pnc visits recently', async () => {
          // given
          adultWithReports(
            homeBirth(threeWeeksAgo),
            pncVisxit(twoWeeksAgo),
            pncVisxit(aWeekAgo),
            pncVisxit(yesterday));

          // when
          const targets = await getTargetsWithInstances();

          const expectedTargets = [
            {
              id: 'pnc-active',
              value: { pass: 1, total: 1 },
            },
            {
              id: 'births-this-month',
              value: { pass: 1, total: 1 },
            },
            {
              id: 'delivery-at-facility-total',
              value: { pass: 0, total: 1, percent: 0 },
            },
            {
              id: 'delivery-with-min-1-visit',
              value: { pass: 0, total: 1, percent: 0 },
            },
            {
              id: 'delivery-with-min-4-visits',
              value: { pass: 0, total: 1, percent: 0 },
            },
            {
              id: 'pnc-visits-this-month',
              value: { pass: 3, total: 3 },
            },
            {
              id: 'pnc-3-visits',
              value: { pass: 1, total: 1, percent: 100 },
            },
            {
              id: 'pnc-homebirth-min-1-visit',
              value: { pass: 1, total: 1, percent: 100 },
            },
            {
              id: 'pnc-registered-this-month',
              value: { pass: 1, total: 1 },
            }
          ];

          // then
          assertTargetsEqual(targets, expectedTargets, 'date');
        });
        it('should pass for woman who has had 3 pnc visits a long time ago', async () => {
          // given
          adultWithReports(
            homeBirth(weeksAgo(100)),
            pncVisxit(weeksAgo(99)),
            pncVisxit(weeksAgo(98)),
            pncVisxit(weeksAgo(97)));

          // when
          const targets = await getTargetsWithInstances();
// TODO Another broke
          const expectedTargets = [
            // {
            //   // '_id': 'adult-1~births-this-month',
            //   // 'deleted': false,
            //   id: 'births-this-month',
            //   value: { pass: 1, total: 1 },
            //   // 'pass': true,
            // },
            {
              // '_id': 'd-1~delivery-at-facility-total',
              // 'deleted': false,
              id: 'delivery-at-facility-total',
              value: { pass: 0, total: 1, percent: 0 },
              // 'pass': false,
            },
            {
              // '_id': 'd-1~delivery-with-min-1-visit',
              // 'deleted': false,
              id: 'delivery-with-min-1-visit',
              value: { pass: 0, total: 1, percent: 0 },
              // 'pass': false,
            },
            {
              // '_id': 'd-1~delivery-with-min-4-visits',
              // 'deleted': false,
              id: 'delivery-with-min-4-visits',
              value: { pass: 0, total: 1, percent: 0 },
              // 'pass': false,
            },
            // {
            //   // '_id': 'pnc-2~pnc-visits-this-month',
            //   // 'deleted': false,
            //   id: 'pnc-visits-this-month',
            //   value: { pass: 1, total: 1 },
            //   // 'pass': true,
            // },
            // {
            //   // '_id': 'pnc-3~pnc-visits-this-month',
            //   // 'deleted': false,
            //   id: 'pnc-visits-this-month',
            //   value: { pass: 1, total: 1 },
            //   // 'pass': true,
            // },
            // {
            //   // '_id': 'pnc-4~pnc-visits-this-month',
            //   // 'deleted': false,
            //   id: 'pnc-visits-this-month',
            //   value: { pass: 1, total: 1 },
            //   // 'pass': true,
            // },
            {
              // '_id': 'adult-1~pnc-3-visits',
              // 'deleted': false,
              id: 'pnc-3-visits',
              value: { pass: 1, total: 1, percent: 100 },
              // 'pass': true,
            },
            {
              // '_id': 'adult-1~pnc-homebirth-min-1-visit',
              // 'deleted': false,
              id: 'pnc-homebirth-min-1-visit',
              value: { pass: 1, total: 1, percent: 100 },
              // 'pass': true,
            },
            // {
            //   // '_id': 'd-1~pnc-registered-this-month',
            //   // 'deleted': false,
            //   id: 'pnc-registered-this-month',
            //   value: { pass: 1, total: 1 },
            //   // 'pass': true,
            // }
          ];

          // then
          assertTargetsEqual(targets, expectedTargets, 'date');
        });
        xit('should not pass for woman who has had only 2 PNC visits', () => {
          // given
          adultWithReports(
            homeBirth(twoWeeksAgo),
            pncVisxit(aWeekAgo),
            pncVisxit(yesterday));

          // when
          return harness.getEmittedTargetInstances()
            .then(targets => {

              const expectedTargets = [
                {
                  '_id': 'adult-1~pnc-active',
                  'deleted': false,
                  'type': 'pnc-active',
                  'pass': true,
                },
                {
                  '_id': 'adult-1~births-this-month',
                  'deleted': false,
                  'type': 'births-this-month',
                  'pass': true,
                },
                {
                  '_id': 'd-1~delivery-at-facility-total',
                  'deleted': false,
                  'type': 'delivery-at-facility-total',
                  'pass': false,
                },
                {
                  '_id': 'd-1~delivery-with-min-1-visit',
                  'deleted': false,
                  'type': 'delivery-with-min-1-visit',
                  'pass': false,
                },
                {
                  '_id': 'd-1~delivery-with-min-4-visits',
                  'deleted': false,
                  'type': 'delivery-with-min-4-visits',
                  'pass': false,
                },
                {
                  '_id': 'pnc-2~pnc-visits-this-month',
                  'deleted': false,
                  'type': 'pnc-visits-this-month',
                  'pass': true,
                },
                {
                  '_id': 'pnc-3~pnc-visits-this-month',
                  'deleted': false,
                  'type': 'pnc-visits-this-month',
                  'pass': true,
                },
                {
                  '_id': 'adult-1~pnc-3-visits',
                  'deleted': false,
                  'type': 'pnc-3-visits',
                  'pass': false,
                },
                {
                  '_id': 'adult-1~pnc-homebirth-min-1-visit',
                  'deleted': false,
                  'type': 'pnc-homebirth-min-1-visit',
                  'pass': true,
                },
                {
                  '_id': 'd-1~pnc-registered-this-month',
                  'deleted': false,
                  'type': 'pnc-registered-this-month',
                  'pass': true,
                }
              ];

              // then
              assertTargetsEqual(targets, expectedTargets, 'date');
            });
        });
      });
    });

    describe('PNC visit counting for home births', () => {
      describe('healthy birth', () => {
        xit('should not emit a target instance if no PNC visits have been made', () => {
          // given
          harness.pushMockedReport(
            adultWithReports(homeBirth(aWeekAgo)));

          // when
          return harness.getEmittedTargetInstances()
            .then(targets => {

              const expectedTargets = [
                {
                  _id: 'adult-1~pnc-active',
                  deleted: false,
                  pass: true,
                  type: 'pnc-active',
                },
                {
                  _id: 'adult-1~pnc-homebirth-0-visits',
                  deleted: false,
                  pass: true,
                  type: 'pnc-homebirth-0-visits',
                },
                {
                  _id: 'adult-1~births-this-month',
                  deleted: false,
                  pass: true,
                  type: 'births-this-month',
                },
                {
                  _id: 'd-1~delivery-at-facility-total',
                  deleted: false,
                  pass: false,
                  type: 'delivery-at-facility-total',
                },
                {
                  _id: 'd-1~delivery-with-min-1-visit',
                  deleted: false,
                  pass: false,
                  type: 'delivery-with-min-1-visit',
                },
                {
                  _id: 'd-1~delivery-with-min-4-visits',
                  deleted: false,
                  pass: false,
                  type: 'delivery-with-min-4-visits',
                },
                {
                  _id: 'adult-1~pnc-3-visits',
                  deleted: false,
                  pass: false,
                  type: 'pnc-3-visits',
                },
                {
                  _id: 'adult-1~pnc-homebirth-min-1-visit',
                  deleted: false,
                  pass: false,
                  type: 'pnc-homebirth-min-1-visit',
                },
                {
                  _id: 'd-1~pnc-registered-this-month',
                  deleted: false,
                  pass: true,
                  type: 'pnc-registered-this-month',
                },
              ];

              // then
              assertTargetsEqual(targets, expectedTargets, 'date');
            });
        });
        xit('should emit a target instance if a PNC visit has been made', () => {
          // given
          harness.pushMockedReport(
            adultWithReports(
              homeBirth(aWeekAgo),
              pncVisxit(today)));

          // when
          return harness.getEmittedTargetInstances()
            .then(targets => {

              const expectedTargets = [
                {
                  _id: 'adult-1~pnc-active',
                  deleted: false,
                  pass: true,
                  type: 'pnc-active',
                },
                {
                  _id: 'adult-1~births-this-month',
                  deleted: false,
                  pass: true,
                  type: 'births-this-month',
                },
                {
                  _id: 'd-1~delivery-at-facility-total',
                  deleted: false,
                  pass: false,
                  type: 'delivery-at-facility-total',
                },
                {
                  _id: 'd-1~delivery-with-min-1-visit',
                  deleted: false,
                  pass: false,
                  type: 'delivery-with-min-1-visit',
                },
                {
                  _id: 'd-1~delivery-with-min-4-visits',
                  deleted: false,
                  pass: false,
                  type: 'delivery-with-min-4-visits',
                },
                {
                  _id: 'pnc-2~pnc-visits-this-month',
                  deleted: false,
                  pass: true,
                  type: 'pnc-visits-this-month',
                },
                {
                  _id: 'adult-1~pnc-3-visits',
                  deleted: false,
                  pass: false,
                  type: 'pnc-3-visits',
                },
                {
                  _id: 'adult-1~pnc-homebirth-min-1-visit',
                  deleted: false,
                  pass: true,
                  type: 'pnc-homebirth-min-1-visit',
                },
                {
                  _id: 'd-1~pnc-registered-this-month',
                  deleted: false,
                  pass: true,
                  type: 'pnc-registered-this-month',
                },
              ];

              // then
              assertTargetsEqual(targets, expectedTargets, 'date');
            });
        });
        xit('should emit a target instance if more than one PNC visit has been made', () => {
          // given
          harness.pushMockedReport(
            adultWithReports(
              homeBirth(aMonthAgo),
              pncVisxit(aWeekAgo),
              pncVisxit(today)));

          // when
          return harness.getEmittedTargetInstances()
            .then(targets => {

              const expectedTargets = [
                {
                  _id: 'adult-1~births-this-month',
                  deleted: false,
                  pass: true,
                  type: 'births-this-month',
                },
                {
                  _id: 'd-1~delivery-at-facility-total',
                  deleted: false,
                  pass: false,
                  type: 'delivery-at-facility-total',
                },
                {
                  _id: 'd-1~delivery-with-min-1-visit',
                  deleted: false,
                  pass: false,
                  type: 'delivery-with-min-1-visit',
                },
                {
                  _id: 'd-1~delivery-with-min-4-visits',
                  deleted: false,
                  pass: false,
                  type: 'delivery-with-min-4-visits',
                },
                {
                  _id: 'pnc-2~pnc-visits-this-month',
                  deleted: false,
                  pass: true,
                  type: 'pnc-visits-this-month',
                },
                {
                  _id: 'pnc-3~pnc-visits-this-month',
                  deleted: false,
                  pass: true,
                  type: 'pnc-visits-this-month',
                },
                {
                  _id: 'adult-1~pnc-3-visits',
                  deleted: false,
                  pass: false,
                  type: 'pnc-3-visits',
                },
                {
                  _id: 'adult-1~pnc-homebirth-min-1-visit',
                  deleted: false,
                  pass: true,
                  type: 'pnc-homebirth-min-1-visit',
                },
                {
                  _id: 'd-1~pnc-registered-this-month',
                  deleted: false,
                  pass: true,
                  type: 'pnc-registered-this-month',
                },
                {
                  _id: 'adult-1~pnc-active',
                  deleted: false,
                  pass: true,
                  type: 'pnc-active',
                },
              ];

              // then
              assertTargetsEqual(targets, expectedTargets, 'date');
            });
        });
      });
      describe('non-healthy birth', () => {
        xit('should not emit a target instance', () => {
          // given
          harness.pushMockedReport(
            adultWithReports(nonHealthyHomeBirth(aWeekAgo)));

          // when
          return harness.getEmittedTargetInstances()
            .then(targets => {

              const expectedTargets = [
                {
                  _id: 'adult-1~pnc-active',
                  deleted: false,
                  pass: true,
                  type: 'pnc-active',
                },
                {
                  _id: 'adult-1~pnc-homebirth-0-visits',
                  deleted: false,
                  pass: true,
                  type: 'pnc-homebirth-0-visits',
                },
              ];

              // then
              assertTargetsEqual(targets, expectedTargets, 'date');
            });
        });
      });
    });
  });

  describe('immunisation reports', () => {
    xit('should fail vaccination requirements when child registered without vaccinations', () => {
      // given
      childWithReports();

      // when
      return harness.getEmittedTargetInstances()
        .then(targets => {

          // then
          const expectedTargets = [
            {
              _id: 'child-1~imm-children-under-5-years',
              deleted: false,
              type: 'imm-children-under-5-years',
              pass: true,
            },
            {
              _id: 'child-1~imm-children-registered-this-month',
              deleted: false,
              type: 'imm-children-registered-this-month',
              pass: true,
            },
            {
              _id: 'child-1~imm-no-vaccine-reported',
              deleted: false,
              type: 'imm-no-vaccine-reported',
              pass: true,
            },
            {
              _id: 'child-1~imm-children-with-bcg-reported',
              deleted: false,
              type: 'imm-children-with-bcg-reported',
              pass: false,
            },
            {
              _id: 'child-1~nutrition-children-screened-growth-monitoring',
              deleted: false,
              type: 'nutrition-children-screened-growth-monitoring',
              pass: false,
            },
          ];

          assertTargetsEqual(targets, expectedTargets, 'date');
        });
    });

    describe('SMS forms', () => {
      xit('should generate target instances when given MMR1 form', () => {
        // given
        childWithReports({ form: 'MMR1', _id: 'r1' });


        // when
        return harness.getEmittedTargetInstances()
          .then(targets => {

            // then
            const expectedTargets = [
              {
                _id: 'child-1~imm-children-under-5-years',
                deleted: false,
                type: 'imm-children-under-5-years',
                pass: true
              },
              {
                _id: 'child-1~imm-children-registered-this-month',
                deleted: false,
                type: 'imm-children-registered-this-month',
                pass: true
              },
              {
                _id: 'child-1~imm-vaccines-given-this-month',
                deleted: false,
                type: 'imm-vaccines-given-this-month',
                pass: true
              },
              {
                _id: 'child-1~imm-children-with-bcg-reported',
                deleted: false,
                type: 'imm-children-with-bcg-reported',
                pass: false
              },
              {
                _id: 'child-1~nutrition-children-screened-growth-monitoring',
                deleted: false,
                type: 'nutrition-children-screened-growth-monitoring',
                pass: false
              },
            ];

            assertTargetsEqual(targets, expectedTargets, 'date');
          });
      });
    });

    describe('xforms', () => {
      xit('should pass requirements when child registered with bcg', () => {
        // given
        childWithReports({
          _id: 'report-1',
          form: 'immunization_visit',
          fields: {
            vaccines_received: {
              received_bcg: 'yes',
            },
          },
        });

        // when
        return harness.getEmittedTargetInstances()
          .then(targets => {
            const expectedTargets = [
              {
                _id: 'child-1~imm-children-under-5-years',
                deleted: false,
                type: 'imm-children-under-5-years',
                pass: true
              },
              {
                _id: 'child-1~imm-children-registered-this-month',
                deleted: false,
                type: 'imm-children-registered-this-month',
                pass: true
              },
              {
                _id: 'child-1~imm-vaccines-given-this-month0',
                deleted: false,
                type: 'imm-vaccines-given-this-month',
                pass: true,
                date: undefined
              },
              {
                _id: 'child-1~imm-children-with-bcg-reported',
                deleted: false,
                type: 'imm-children-with-bcg-reported',
                pass: true
              },
              {
                _id: 'child-1~nutrition-children-screened-growth-monitoring',
                deleted: false,
                type: 'nutrition-children-screened-growth-monitoring',
                pass: false
              },
            ];


            assertTargetsEqual(targets, expectedTargets, 'date');
          });
      });
    });
  });

  describe('pregnancy reports', () => {
    describe('with SMS forms', () => {
      xit('should register one pregnancy when P form is submitted', () => {
        // given
        adultWithReports({
          form: 'P',
          lmp_date: threeMonthsAgo,
          reported_date: today,
        });

        // when
        return harness.getEmittedTargetInstances()
          .then(targets => {
            const expectedTargets = [
              {
                _id: 'adult-1~pregnancy-registrations-this-month',
                deleted: false,
                type: 'pregnancy-registrations-this-month',
                pass: true,
              },
              {
                _id: 'adult-1~active-pregnancies',
                deleted: false,
                type: 'active-pregnancies',
                pass: true,
              },
            ];

            assertTargetsEqual(targets, expectedTargets, 'date');
          });
      });

      xit('should register pregnancy as high-risk when P+F forms are submitted', () => {
        // given
        adultWithReports(
          {
            form: 'P',
            lmp_date: threeMonthsAgo,
            reported_date: today,
          },
          {
            form: 'F',
          });

        // when
        return harness.getEmittedTargetInstances()
          .then(targets => {
            const expectedTargets = [
              {
                _id: 'adult-1~pregnancy-registrations-this-month',
                deleted: false,
                type: 'pregnancy-registrations-this-month',
                pass: true,
              },
              {
                _id: 'adult-1~active-pregnancies',
                deleted: false,
                type: 'active-pregnancies',
                pass: true,
              },
            ];

            assertTargetsEqual(targets, expectedTargets, 'date');
          });
      });
    });
    describe('with xforms', () => {
      xit('should register one pregnancy when pregnancy form is submitted', () => {
        // given
        adultWithReports({
          form: 'pregnancy',
          lmp_date: threeMonthsAgo,
          reported_date: today,
        });

        // when
        return harness.getEmittedTargetInstances()
          .then(targets => {
            const expectedTargets = [
              {
                _id: 'adult-1~pregnancy-registrations-this-month',
                deleted: false,
                type: 'pregnancy-registrations-this-month',
                pass: true,
              },
              {
                _id: 'adult-1~active-pregnancies',
                deleted: false,
                type: 'active-pregnancies',
                pass: true,
              },
            ];

            assertTargetsEqual(targets, expectedTargets, 'date');
          });
      });
    });

    describe('pregnancy visit with xform', function () {
      xit('should not count pregnancy visit if specified as not attended', function () {

        adultWithReports(
          {
            form: 'pregnancy_visit',
            fields: { visit_confirmed: 'no' },
            reported_date: today,
          },
          {
            form: 'delivery',
            fields: { pregnancy_outcome: 'healthy' },
            reported_date: today,
          }
        );

        return harness.getEmittedTargetInstances()
          .then(targets => {

            const expectedTargets = [
              {
                _id: 'adult-1~births-this-month',
                deleted: false,
                type: 'births-this-month',
                pass: true,
                date: 1469358731456
              },
              {
                _id: 'undefined~delivery-with-min-1-visit',
                deleted: false,
                type: 'delivery-with-min-1-visit',
                pass: false,
                date: 1469358731456
              },
              {
                _id: 'undefined~delivery-with-min-4-visits',
                deleted: false,
                type: 'delivery-with-min-4-visits',
                pass: false,
                date: 1469358731456
              },
              {
                _id: 'undefined~delivery-at-facility-total',
                deleted: false,
                type: 'delivery-at-facility-total',
                pass: false,
                date: 1469358731456
              },
              {
                _id: 'adult-1~pnc-active',
                deleted: false,
                type: 'pnc-active',
                pass: true,
                date: 1469358731456
              },
              {
                _id: 'undefined~pnc-registered-this-month',
                deleted: false,
                type: 'pnc-registered-this-month',
                pass: true,
                date: 1469358731456
              },
              {
                _id: 'adult-1~pnc-homebirth-0-visits',
                deleted: false,
                type: 'pnc-homebirth-0-visits',
                pass: true,
                date: 1469358731456
              },
              {
                _id: 'adult-1~pnc-3-visits',
                deleted: false,
                type: 'pnc-3-visits',
                pass: false,
                date: 1469358731456
              },
            ];

            assertTargetsEqual(targets, expectedTargets, 'date');
          });
      });
    });
  });

  describe('per-contact immunisation targets', () => {
    xit('should create immunisation target instances for a child', () => {
      // given
      childWithReports();

      // when
      return harness.getEmittedTargetInstances()
        .then(targets => {
          const expectedTargets = [
            {
              _id: 'child-1~imm-children-under-5-years',
              deleted: false,
              type: 'imm-children-under-5-years',
              pass: true
            },
            {
              _id: 'child-1~imm-children-registered-this-month',
              deleted: false,
              type: 'imm-children-registered-this-month',
              pass: true
            },
            {
              _id: 'child-1~imm-no-vaccine-reported',
              deleted: false,
              type: 'imm-no-vaccine-reported',
              pass: true
            },
            {
              _id: 'child-1~imm-children-with-bcg-reported',
              deleted: false,
              type: 'imm-children-with-bcg-reported',
              pass: false
            },
            {
              _id: 'child-1~nutrition-children-screened-growth-monitoring',
              deleted: false,
              type: 'nutrition-children-screened-growth-monitoring',
              pass: false
            },
          ];

          assertTargetsEqual(targets, expectedTargets, 'date');
        });
    });
  });

  describe('Nutrition screening by CHW', () => {
    xit('should create a child screened target instance', () => {
      // given
      childWithReports(
        {
          form: 'G',
          fields: {
            severity: 1
          },
          reported_date: today,
        }
      );

      // expect
      return harness.getEmittedTargetInstances()
        .then(targets => {

          const expectedTargets = [
            {
              _id: 'child-1~imm-children-under-5-years',
              deleted: false,
              type: 'imm-children-under-5-years',
              pass: true
            },
            {
              _id: 'child-1~imm-children-registered-this-month',
              deleted: false,
              type: 'imm-children-registered-this-month',
              pass: true
            },
            {
              _id: 'child-1~imm-children-with-bcg-reported',
              deleted: false,
              type: 'imm-children-with-bcg-reported',
              pass: false
            },
            {
              _id: 'child-1~nutrition-children-screened-growth-monitoring',
              deleted: false,
              type: 'nutrition-children-screened-growth-monitoring',
              pass: true
            },
          ];

          assertTargetsEqual(targets, expectedTargets);
        });
    });

  });

  describe('Nutrition screening at facility', function () {

    xit('should create underweight target instance', () => {

      const r = {
        form: 'nutrition_screening',
        fields: {
          measurements: {
            wfa: -3
          },
          treatment: {}
        },
        reported_date: today,
      };

      childWithReports(r);

      // expect
      return harness.getEmittedTargetInstances()
        .then(targets => {

          const expectedTargets = [
            {
              _id: 'child-1~imm-children-under-5-years',
              deleted: false,
              type: 'imm-children-under-5-years',
              pass: true
            },
            {
              _id: 'child-1~imm-children-registered-this-month',
              deleted: false,
              type: 'imm-children-registered-this-month',
              pass: true
            },
            {
              _id: 'child-1~imm-children-with-bcg-reported',
              deleted: false,
              type: 'imm-children-with-bcg-reported',
              pass: false
            },
            {
              _id: 'child-1~nutrition-children-screened-growth-monitoring',
              deleted: false,
              type: 'nutrition-children-screened-growth-monitoring',
              pass: false
            },
            {
              _id: 'child-1~nutrition-children-underweight',
              deleted: false,
              type: 'nutrition-children-underweight',
              pass: true
            },
          ];

          assertTargetsEqual(targets, expectedTargets);

        });
    });


    xit('should create stunted growth target instance', () => {

      const r = {
        form: 'nutrition_screening',
        fields: {
          measurements: {
            hfa: -3
          },
          treatment: {}
        },
        reported_date: today,
      };

      childWithReports(r);

      return harness.getEmittedTargetInstances()
        .then(targets => {

          const expectedTargets = [
            {
              _id: 'child-1~imm-children-under-5-years',
              deleted: false,
              type: 'imm-children-under-5-years',
              pass: true
            },
            {
              _id: 'child-1~imm-children-registered-this-month',
              deleted: false,
              type: 'imm-children-registered-this-month',
              pass: true
            },
            {
              _id: 'child-1~imm-children-with-bcg-reported',
              deleted: false,
              type: 'imm-children-with-bcg-reported',
              pass: false
            },
            {
              _id: 'child-1~nutrition-children-screened-growth-monitoring',
              deleted: false,
              type: 'nutrition-children-screened-growth-monitoring',
              pass: false
            },
            {
              _id: 'child-1~children-stunted',
              deleted: false,
              type: 'children-stunted',
              pass: true
            },
          ];

          assertTargetsEqual(targets, expectedTargets);

        });
    });

  });

  describe('children active MAM', function () {
    xit('should create active MAM target for WFH z-score between -3 & -2', function () {
      const r = {
        form: 'nutrition_screening',
        fields: {
          measurements: {
            wfh: -3
          },
          treatment: {}
        },
        reported_date: today,
      };

      childWithReports(r);

      return harness.getEmittedTargetInstances()
        .then(targets => {

          const expectedTargets = [
            {
              _id: 'child-1~imm-children-under-5-years',
              deleted: false,
              type: 'imm-children-under-5-years',
              pass: true
            },
            {
              _id: 'child-1~imm-children-registered-this-month',
              deleted: false,
              type: 'imm-children-registered-this-month',
              pass: true
            },
            {
              _id: 'child-1~imm-children-with-bcg-reported',
              deleted: false,
              type: 'imm-children-with-bcg-reported',
              pass: false
            },
            {
              _id: 'child-1~nutrition-children-screened-growth-monitoring',
              deleted: false,
              type: 'nutrition-children-screened-growth-monitoring',
              pass: false
            },
            {
              _id: 'child-1~children-mam',
              deleted: false,
              type: 'children-mam',
              pass: true
            },
          ];

          assertTargetsEqual(targets, expectedTargets);
        });

    });

    xit('should create active MAM target for MUAC between 11.5 & 12.4 cm', function () {
      const r = {
        form: 'nutrition_screening',
        fields: {
          measurements: {
            muac: 12
          },
          treatment: {}
        },
        reported_date: today,
      };

      childWithReports(r);

      return harness.getEmittedTargetInstances()
        .then(targets => {

          const expectedTargets = [
            {
              _id: 'child-1~imm-children-under-5-years',
              deleted: false,
              type: 'imm-children-under-5-years',
              pass: true
            },
            {
              _id: 'child-1~imm-children-registered-this-month',
              deleted: false,
              type: 'imm-children-registered-this-month',
              pass: true
            },
            {
              _id: 'child-1~imm-children-with-bcg-reported',
              deleted: false,
              type: 'imm-children-with-bcg-reported',
              pass: false
            },
            {
              _id: 'child-1~nutrition-children-screened-growth-monitoring',
              deleted: false,
              type: 'nutrition-children-screened-growth-monitoring',
              pass: false
            },
            {
              _id: 'child-1~children-mam',
              deleted: false,
              type: 'children-mam',
              pass: true
            },
          ];

          assertTargetsEqual(targets, expectedTargets);
        });
    });
  });

  describe('children active SAM', function () {
    xit('should create active SAM target for WFH z-score less than -3', function () {

      const r = {
        form: 'nutrition_screening',
        fields: {
          measurements: {
            wfh: -4
          },
          treatment: {}
        },
        reported_date: today,
      };

      childWithReports(r);

      return harness.getEmittedTargetInstances()
        .then(targets => {

          const expectedTargets = [
            {
              _id: 'child-1~imm-children-under-5-years',
              deleted: false,
              type: 'imm-children-under-5-years',
              pass: true
            },
            {
              _id: 'child-1~imm-children-registered-this-month',
              deleted: false,
              type: 'imm-children-registered-this-month',
              pass: true
            },
            {
              _id: 'child-1~imm-children-with-bcg-reported',
              deleted: false,
              type: 'imm-children-with-bcg-reported',
              pass: false
            },
            {
              _id: 'child-1~nutrition-children-screened-growth-monitoring',
              deleted: false,
              type: 'nutrition-children-screened-growth-monitoring',
              pass: false
            },
            {
              _id: 'child-1~children-sam',
              deleted: false,
              type: 'children-sam',
              pass: true
            },
          ];

          assertTargetsEqual(targets, expectedTargets);

        });

    });

    xit('should create active SAM target for MUAC less than 11.5 cm', function () {

      const r = {
        form: 'nutrition_screening',
        fields: {
          measurements: {
            muac: 10
          },
          treatment: {}
        },
        reported_date: today,
      };

      childWithReports(r);

      return harness.getEmittedTargetInstances()
        .then(targets => {

          const expectedTargets = [
            {
              _id: 'child-1~imm-children-under-5-years',
              deleted: false,
              type: 'imm-children-under-5-years',
              pass: true
            },
            {
              _id: 'child-1~imm-children-registered-this-month',
              deleted: false,
              type: 'imm-children-registered-this-month',
              pass: true
            },
            {
              _id: 'child-1~imm-children-with-bcg-reported',
              deleted: false,
              type: 'imm-children-with-bcg-reported',
              pass: false
            },
            {
              _id: 'child-1~nutrition-children-screened-growth-monitoring',
              deleted: false,
              type: 'nutrition-children-screened-growth-monitoring',
              pass: false
            },
            {
              _id: 'child-1~children-sam',
              deleted: false,
              type: 'children-sam',
              pass: true
            },
          ];

          assertTargetsEqual(targets, expectedTargets);

        });
    });
  });

  describe('children active OTP', function () {
    xit('should create active OTP for children enrolled', function () {
      const r = {
        form: 'nutrition_screening',
        fields: {
          measurements: {
            wfa: 0
          },
          treatment: {
            program: 'OTP'
          }
        },
        reported_date: today,
      };

      childWithReports(r);

      return harness.getEmittedTargetInstances()
        .then(targets => {

          const expectedTargets = [
            {
              _id: 'child-1~imm-children-under-5-years',
              deleted: false,
              type: 'imm-children-under-5-years',
              pass: true
            },
            {
              _id: 'child-1~imm-children-registered-this-month',
              deleted: false,
              type: 'imm-children-registered-this-month',
              pass: true
            },
            {
              _id: 'child-1~imm-children-with-bcg-reported',
              deleted: false,
              type: 'imm-children-with-bcg-reported',
              pass: false
            },
            {
              _id: 'child-1~nutrition-children-screened-growth-monitoring',
              deleted: false,
              type: 'nutrition-children-screened-growth-monitoring',
              pass: false
            },
            {
              _id: 'child-1~children-otp',
              deleted: false,
              type: 'children-otp',
              pass: true
            },
          ];

          assertTargetsEqual(targets, expectedTargets);

        });

    });
  });

  describe('children active SFP', function () {
    xit('should create active SFP target for children enrolled', function () {
      const r = {
        form: 'nutrition_screening',
        fields: {
          measurements: {
            wfa: 0
          },
          treatment: {
            program: 'SFP'
          }
        },
        reported_date: today,
      };

      childWithReports(r);

      return harness.getEmittedTargetInstances()
        .then(targets => {

          const expectedTargets = [
            {
              _id: 'child-1~imm-children-under-5-years',
              deleted: false,
              type: 'imm-children-under-5-years',
              pass: true
            },
            {
              _id: 'child-1~imm-children-registered-this-month',
              deleted: false,
              type: 'imm-children-registered-this-month',
              pass: true
            },
            {
              _id: 'child-1~imm-children-with-bcg-reported',
              deleted: false,
              type: 'imm-children-with-bcg-reported',
              pass: false
            },
            {
              _id: 'child-1~nutrition-children-screened-growth-monitoring',
              deleted: false,
              type: 'nutrition-children-screened-growth-monitoring',
              pass: false
            },
            {
              _id: 'child-1~children-sfp',
              deleted: false,
              type: 'children-sfp',
              pass: true
            },
          ];

          assertTargetsEqual(targets, expectedTargets);
        });

    });
  });

  function childWithReports(...reports) {
    contactWithReports({
      _id: 'child-1',
      type: 'person',
      name: 'Zoe',
      date_of_birth: '2018-05-01',
      reported_date: today,
    }, ...reports);
  }

  function adultWithReports(...reports) {
    contactWithReports({
      _id: 'adult-1' + Math.random(),
      type: 'person',
      name: 'Zoe',
      date_of_birth: '1990-09-01',
      reported_date: today,
    }, ...reports);
  }

  function contactWithReports(contact, ...reports) {
    harness.state.contacts.push(contact);
    for (const report of reports) {
      report.patient_id = contact._id;
    }
    harness.pushMockedDoc(...reports);
  }

  //> DATES
  const today = now;
  const yesterday = daysAgo(1);
  const aWeekAgo = weeksAgo(1);
  const twoWeeksAgo = weeksAgo(2);
  const threeWeeksAgo = weeksAgo(3);
  const aMonthAgo = monthsAgo(1);
  const threeMonthsAgo = monthsAgo(3);

  function monthsAgo(n) {
    const d = new Date(today);
    d.setMonth(d.getMonth() - n);
    return d.getTime();
  }

  function daysAgo(n) {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d.getTime();
  }

  function weeksAgo(n) {
    return daysAgo(n * 7);
  }
});

function pncVisxit(reported_date) {
  return {
    _id: nextReportId('pnc'),
    form: 'M',
    reported_date,
  };
}

function facilityDelivery(date) {
  return {
    _id: nextReportId('d'),
    form: 'D',
    reported_date: date,
    fields: {
      delivery_code: 'F',
    },
  };
}
function homeBirth(date) {
  return {
    _id: nextReportId('d'),
    form: 'D',
    reported_date: date,
    fields: {
      delivery_code: '?',
    },
  };
}

function nonHealthyHomeBirth(reported_date) {
  return {
    _id: nextReportId('d'),
    form: 'delivery',
    reported_date,
    fields: {
      pregnancy_outcome: '?',
    },
  };
}

function nextReportId(baseName) {
  return `${baseName}-${++reportIdCounter}`;
}

function assertTargetsEqual(actual, expected) {
  const sortTargets = (a, b) => a.id.localeCompare(b.id);
  const ignoredFields = ['goal', 'icon', 'subtitle_translation_key', 'translation_key', 'type'];
  assert.deepEqualExcluding(actual.sort(sortTargets), expected.sort(sortTargets), ignoredFields);
}
