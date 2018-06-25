const assert = require('chai').assert;
const NootilsManager = require('medic-nootils/src/node/test-wrapper');

let reportIdCounter;

// TODO set undef:true in jshint config
// TODO why does giving birth as a facility count towards pnc-3-visits, but not as an individual pnc-visits-this-month?

describe('Standard Configuration Targets', function() {
  let nootilsManager, Contact, session;

  before(() => {
    nootilsManager = NootilsManager({
      user: {
        parent: {
          type: 'health_center',
          use_cases: 'anc pnc imm'
        },
      },
    });
    Contact = nootilsManager.Contact;
    session = nootilsManager.session;
  });
  beforeEach(() => reportIdCounter = 0);


  afterEach(() => nootilsManager.afterEach());
  after(() => nootilsManager.after());

  describe('adult with no reports', function() {
    it('should not create any target instances', function() {
      // given
      session.assert(adultWithNoReports());

      // expect
      return session.emitTargets()
        .then(targets => assert.deepEqual(targets, []));
    });
  });

  describe('PNC', function() {
    it('should have 1 PNC', function() {
      // given
      session.assert(adultWithReport({
        fields: { delivery_code:'NS' },
        birth_date: new Date(daysAgo(3)).toISOString(),
        form: 'delivery',
        reported_date: today,
      }));

      // when
      return session.emitTargets()
        .then(targets => {

          // then
          assert.equal(targets.length, 2, 'Should have 2 target instances');

          const expectedTargets = [
            {
              _id: 'adult-1-pnc-active',
              deleted: false,
              type: 'pnc-active',
              pass: true,
            },
            {
              _id: 'adult-1-pnc-homebirth-0-visits',
              deleted: false,
              type: 'pnc-homebirth-0-visits',
              pass: true,
            },
          ];

          assertTargetsEqual(targets, expectedTargets, 'date');
        });
    });

    describe('visits-this-month counter', function() {
      it('should register a visit made this month', function() {
        // given
        session.assert(adultWithReports(
          facilityDelivery(threeWeeksAgo),
          { _id: nextReportId('pnc'), form:'M', reported_date:aWeekAgo }));

        // when
        return session.emitTargets()
          .then(targets => {

            // then
            const expectedTargets = [
              {
                _id: 'adult-1-pnc-active',
                deleted: false,
                pass: true,
                type: 'pnc-active',
              },
              {
                _id: 'adult-1-pnc-homebirth-0-visits',
                deleted: false,
                pass: false,
                type: 'pnc-homebirth-0-visits',
              },
              {
                _id: 'adult-1-births-this-month',
                deleted: false,
                pass: true,
                type: 'births-this-month',
              },
              {
                _id: 'd-1-delivery-at-facility-total',
                deleted: false,
                pass: true,
                type: 'delivery-at-facility-total',
              },
              {
                _id: 'd-1-delivery-with-min-1-visit',
                deleted: false,
                pass: false,
                type: 'delivery-with-min-1-visit',
              },
              {
                _id: 'd-1-delivery-with-min-4-visits',
                deleted: false,
                pass: false,
                type: 'delivery-with-min-4-visits',
              },
              {
                _id: 'd-1-pnc-visits-this-month',
                deleted: false,
                pass: true,
                type: 'pnc-visits-this-month',
              },
              {
                _id: 'pnc-2-pnc-visits-this-month',
                deleted: false,
                pass: true,
                type: 'pnc-visits-this-month',
              },
              {
                _id: 'adult-1-pnc-3-visits',
                deleted: false,
                pass: false,
                type: 'pnc-3-visits',
              },
              {
                _id: 'd-1-pnc-registered-this-month',
                deleted: false,
                pass: true,
                type: 'pnc-registered-this-month',
              },
            ];
            assertTargetsEqual(targets, expectedTargets, 'date');
          });
      });

      it('should not register a visit made last month', function() {
        // given
        session.assert(adultWithReports(
          facilityDelivery(weeksAgo(20)),
          { _id: nextReportId('pnc'), form:'M', reported_date:weeksAgo(19) }));

        // when
        return session.emitTargets()
          .then(targets => {

            // then
            const expectedTargets = [
              {
                _id: 'adult-1-births-this-month',
                deleted: false,
                pass: true,
                type: 'births-this-month',
              },
              {
                _id: 'd-1-delivery-at-facility-total',
                deleted: false,
                pass: true,
                type: 'delivery-at-facility-total',
              },
              {
                _id: 'd-1-delivery-with-min-1-visit',
                deleted: false,
                pass: false,
                type: 'delivery-with-min-1-visit',
              },
              {
                _id: 'd-1-delivery-with-min-4-visits',
                deleted: false,
                pass: false,
                type: 'delivery-with-min-4-visits',
              },
              {
                _id: 'd-1-pnc-visits-this-month',
                deleted: false,
                pass: true,
                type: 'pnc-visits-this-month',
              },
              {
                _id: 'pnc-2-pnc-visits-this-month',
                deleted: false,
                pass: true,
                type: 'pnc-visits-this-month',
              },
              {
                _id: 'adult-1-pnc-3-visits',
                deleted: false,
                pass: false,
                type: 'pnc-3-visits',
              },
              {
                _id: 'd-1-pnc-registered-this-month',
                deleted: false,
                pass: true,
                type: 'pnc-registered-this-month',
              },
            ];

            assertTargetsEqual(targets, expectedTargets, 'date');
          });
      });
    });

    describe('pnc-3-visits target instance', function() {
      describe('facility birth', function() {
        it('should pass for woman who has had 2 pnc visits recently', function() {
          // given
          session.assert(adultWithReports(
            facilityDelivery(threeWeeksAgo),
            pncVisit(aWeekAgo),
            pncVisit(yesterday)));

          // when
          return session.emitTargets()
            .then(targets => {

              const expectedTargets = [
                {
                  "_id": "adult-1-pnc-active",
                  "deleted": false,
                  "type": "pnc-active",
                  "pass": true,
                },
                {
                  "_id": "adult-1-pnc-homebirth-0-visits",
                  "deleted": false,
                  "type": "pnc-homebirth-0-visits",
                  "pass": false,
                },
                {
                  "_id": "adult-1-births-this-month",
                  "deleted": false,
                  "type": "births-this-month",
                  "pass": true,
                },
                {
                  "_id": "d-1-delivery-at-facility-total",
                  "deleted": false,
                  "type": "delivery-at-facility-total",
                  "pass": true,
                },
                {
                  "_id": "d-1-delivery-with-min-1-visit",
                  "deleted": false,
                  "type": "delivery-with-min-1-visit",
                  "pass": false,
                },
                {
                  "_id": "d-1-delivery-with-min-4-visits",
                  "deleted": false,
                  "type": "delivery-with-min-4-visits",
                  "pass": false,
                },
                {
                  "_id": "d-1-pnc-visits-this-month",
                  "deleted": false,
                  "type": "pnc-visits-this-month",
                  "pass": true,
                },
                {
                  "_id": "pnc-2-pnc-visits-this-month",
                  "deleted": false,
                  "type": "pnc-visits-this-month",
                  "pass": true,
                },
                {
                  "_id": "pnc-3-pnc-visits-this-month",
                  "deleted": false,
                  "type": "pnc-visits-this-month",
                  "pass": true,
                },
                {
                  "_id": "adult-1-pnc-3-visits",
                  "deleted": false,
                  "type": "pnc-3-visits",
                  "pass": true,
                },
                {
                  "_id": "d-1-pnc-registered-this-month",
                  "deleted": false,
                  "type": "pnc-registered-this-month",
                  "pass": true,
                }
              ];

              // then
              assertTargetsEqual(targets, expectedTargets, 'date');
            });
        });
        it('should pass for woman who has had 2 pnc visits a long time ago', function() {
          // given
          session.assert(adultWithReports(
            facilityDelivery(weeksAgo(100)),
            pncVisit(weeksAgo(99)),
            pncVisit(weeksAgo(98))));

          // when
          return session.emitTargets()
            .then(targets => {

              const expectedTargets = [
                {
                  "_id": "adult-1-births-this-month",
                  "deleted": false,
                  "type": "births-this-month",
                  "pass": true,
                },
                {
                  "_id": "d-1-delivery-at-facility-total",
                  "deleted": false,
                  "type": "delivery-at-facility-total",
                  "pass": true,
                },
                {
                  "_id": "d-1-delivery-with-min-1-visit",
                  "deleted": false,
                  "type": "delivery-with-min-1-visit",
                  "pass": false,
                },
                {
                  "_id": "d-1-delivery-with-min-4-visits",
                  "deleted": false,
                  "type": "delivery-with-min-4-visits",
                  "pass": false,
                },
                {
                  "_id": "d-1-pnc-visits-this-month",
                  "deleted": false,
                  "type": "pnc-visits-this-month",
                  "pass": true,
                },
                {
                  "_id": "pnc-2-pnc-visits-this-month",
                  "deleted": false,
                  "type": "pnc-visits-this-month",
                  "pass": true,
                },
                {
                  "_id": "pnc-3-pnc-visits-this-month",
                  "deleted": false,
                  "type": "pnc-visits-this-month",
                  "pass": true,
                },
                {
                  "_id": "adult-1-pnc-3-visits",
                  "deleted": false,
                  "type": "pnc-3-visits",
                  "pass": true,
                },
                {
                  "_id": "d-1-pnc-registered-this-month",
                  "deleted": false,
                  "type": "pnc-registered-this-month",
                  "pass": true,
                }
              ];

              // then
              assertTargetsEqual(targets, expectedTargets, 'date');
            });
        });
        it('should not pass for woman who has had only 1 PNC visit', function() {
          // given
          session.assert(adultWithReports(
            facilityDelivery(aWeekAgo),
            pncVisit(yesterday)));

          // when
          return session.emitTargets()
            .then(targets => {

              const expectedTargets = [
                {
                  "_id": "adult-1-pnc-active",
                  "deleted": false,
                  "type": "pnc-active",
                  "pass": true,
                },
                {
                  "_id": "adult-1-pnc-homebirth-0-visits",
                  "deleted": false,
                  "type": "pnc-homebirth-0-visits",
                  "pass": false,
                },
                {
                  "_id": "adult-1-births-this-month",
                  "deleted": false,
                  "type": "births-this-month",
                  "pass": true,
                },
                {
                  "_id": "d-1-delivery-at-facility-total",
                  "deleted": false,
                  "type": "delivery-at-facility-total",
                  "pass": true,
                },
                {
                  "_id": "d-1-delivery-with-min-1-visit",
                  "deleted": false,
                  "type": "delivery-with-min-1-visit",
                  "pass": false,
                },
                {
                  "_id": "d-1-delivery-with-min-4-visits",
                  "deleted": false,
                  "type": "delivery-with-min-4-visits",
                  "pass": false,
                },
                {
                  "_id": "d-1-pnc-visits-this-month",
                  "deleted": false,
                  "type": "pnc-visits-this-month",
                  "pass": true,
                },
                {
                  "_id": "pnc-2-pnc-visits-this-month",
                  "deleted": false,
                  "type": "pnc-visits-this-month",
                  "pass": true,
                },
                {
                  "_id": "adult-1-pnc-3-visits",
                  "deleted": false,
                  "type": "pnc-3-visits",
                  "pass": false,
                },
                {
                  "_id": "d-1-pnc-registered-this-month",
                  "deleted": false,
                  "type": "pnc-registered-this-month",
                  "pass": true,
                }
              ];

              // then
              assertTargetsEqual(targets, expectedTargets, 'date');
            });
        });
      });
      describe('home birth', function() {
        it('should pass for woman who has had 3 pnc visits recently', function() {
          // given
          session.assert(adultWithReports(
            homeBirth(threeWeeksAgo),
            pncVisit(twoWeeksAgo),
            pncVisit(aWeekAgo),
            pncVisit(yesterday)));

          // when
          return session.emitTargets()
            .then(targets => {

              const expectedTargets = [
                {
                  "_id": "adult-1-pnc-active",
                  "deleted": false,
                  "type": "pnc-active",
                  "pass": true,
                },
                {
                  "_id": "adult-1-pnc-homebirth-0-visits",
                  "deleted": false,
                  "type": "pnc-homebirth-0-visits",
                  "pass": false,
                },
                {
                  "_id": "adult-1-births-this-month",
                  "deleted": false,
                  "type": "births-this-month",
                  "pass": true,
                },
                {
                  "_id": "d-1-delivery-at-facility-total",
                  "deleted": false,
                  "type": "delivery-at-facility-total",
                  "pass": false,
                },
                {
                  "_id": "d-1-delivery-with-min-1-visit",
                  "deleted": false,
                  "type": "delivery-with-min-1-visit",
                  "pass": false,
                },
                {
                  "_id": "d-1-delivery-with-min-4-visits",
                  "deleted": false,
                  "type": "delivery-with-min-4-visits",
                  "pass": false,
                },
                {
                  "_id": "pnc-2-pnc-visits-this-month",
                  "deleted": false,
                  "type": "pnc-visits-this-month",
                  "pass": true,
                },
                {
                  "_id": "pnc-3-pnc-visits-this-month",
                  "deleted": false,
                  "type": "pnc-visits-this-month",
                  "pass": true,
                },
                {
                  "_id": "pnc-4-pnc-visits-this-month",
                  "deleted": false,
                  "type": "pnc-visits-this-month",
                  "pass": true,
                },
                {
                  "_id": "adult-1-pnc-3-visits",
                  "deleted": false,
                  "type": "pnc-3-visits",
                  "pass": true,
                },
                {
                  "_id": "adult-1-pnc-homebirth-min-1-visit",
                  "deleted": false,
                  "type": "pnc-homebirth-min-1-visit",
                  "pass": true,
                },
                {
                  "_id": "d-1-pnc-registered-this-month",
                  "deleted": false,
                  "type": "pnc-registered-this-month",
                  "pass": true,
                }
              ];

              // then
              assertTargetsEqual(targets, expectedTargets, 'date');
            });
        });
        it('should pass for woman who has had 3 pnc visits a long time ago', function() {
          // given
          session.assert(adultWithReports(
            homeBirth(weeksAgo(100)),
            pncVisit(weeksAgo(99)),
            pncVisit(weeksAgo(98)),
            pncVisit(weeksAgo(97))));

          // when
          return session.emitTargets()
            .then(targets => {

              const expectedTargets = [
                {
                  "_id": "adult-1-births-this-month",
                  "deleted": false,
                  "type": "births-this-month",
                  "pass": true,
                },
                {
                  "_id": "d-1-delivery-at-facility-total",
                  "deleted": false,
                  "type": "delivery-at-facility-total",
                  "pass": false,
                },
                {
                  "_id": "d-1-delivery-with-min-1-visit",
                  "deleted": false,
                  "type": "delivery-with-min-1-visit",
                  "pass": false,
                },
                {
                  "_id": "d-1-delivery-with-min-4-visits",
                  "deleted": false,
                  "type": "delivery-with-min-4-visits",
                  "pass": false,
                },
                {
                  "_id": "pnc-2-pnc-visits-this-month",
                  "deleted": false,
                  "type": "pnc-visits-this-month",
                  "pass": true,
                },
                {
                  "_id": "pnc-3-pnc-visits-this-month",
                  "deleted": false,
                  "type": "pnc-visits-this-month",
                  "pass": true,
                },
                {
                  "_id": "pnc-4-pnc-visits-this-month",
                  "deleted": false,
                  "type": "pnc-visits-this-month",
                  "pass": true,
                },
                {
                  "_id": "adult-1-pnc-3-visits",
                  "deleted": false,
                  "type": "pnc-3-visits",
                  "pass": true,
                },
                {
                  "_id": "adult-1-pnc-homebirth-min-1-visit",
                  "deleted": false,
                  "type": "pnc-homebirth-min-1-visit",
                  "pass": true,
                },
                {
                  "_id": "d-1-pnc-registered-this-month",
                  "deleted": false,
                  "type": "pnc-registered-this-month",
                  "pass": true,
                }
              ];

              // then
              assertTargetsEqual(targets, expectedTargets, 'date');
            });
        });
        it('should not pass for woman who has had only 2 PNC visits', function() {
          // given
          session.assert(adultWithReports(
            homeBirth(twoWeeksAgo),
            pncVisit(aWeekAgo),
            pncVisit(yesterday)));

          // when
          return session.emitTargets()
            .then(targets => {

              const expectedTargets = [
                {
                  "_id": "adult-1-pnc-active",
                  "deleted": false,
                  "type": "pnc-active",
                  "pass": true,
                },
                {
                  "_id": "adult-1-pnc-homebirth-0-visits",
                  "deleted": false,
                  "type": "pnc-homebirth-0-visits",
                  "pass": false,
                },
                {
                  "_id": "adult-1-births-this-month",
                  "deleted": false,
                  "type": "births-this-month",
                  "pass": true,
                },
                {
                  "_id": "d-1-delivery-at-facility-total",
                  "deleted": false,
                  "type": "delivery-at-facility-total",
                  "pass": false,
                },
                {
                  "_id": "d-1-delivery-with-min-1-visit",
                  "deleted": false,
                  "type": "delivery-with-min-1-visit",
                  "pass": false,
                },
                {
                  "_id": "d-1-delivery-with-min-4-visits",
                  "deleted": false,
                  "type": "delivery-with-min-4-visits",
                  "pass": false,
                },
                {
                  "_id": "pnc-2-pnc-visits-this-month",
                  "deleted": false,
                  "type": "pnc-visits-this-month",
                  "pass": true,
                },
                {
                  "_id": "pnc-3-pnc-visits-this-month",
                  "deleted": false,
                  "type": "pnc-visits-this-month",
                  "pass": true,
                },
                {
                  "_id": "adult-1-pnc-3-visits",
                  "deleted": false,
                  "type": "pnc-3-visits",
                  "pass": false,
                },
                {
                  "_id": "adult-1-pnc-homebirth-min-1-visit",
                  "deleted": false,
                  "type": "pnc-homebirth-min-1-visit",
                  "pass": true,
                },
                {
                  "_id": "d-1-pnc-registered-this-month",
                  "deleted": false,
                  "type": "pnc-registered-this-month",
                  "pass": true,
                }
              ];

              // then
              assertTargetsEqual(targets, expectedTargets, 'date');
            });
        });
      });
    });

    describe('PNC visit counting for home births', function() {
      describe('healthy birth', function() {
        it('should not emit a target instance if no PNC visits have been made', function() {
          // given
          session.assert(
              adultWithReport(homeBirth(aWeekAgo)));

          // when
          return session.emitTargets()
            .then(targets => {

              const expectedTargets = [
                {
                  _id: 'adult-1-pnc-active',
                  deleted: false,
                  pass: true,
                  type: 'pnc-active',
                },
                {
                  _id: 'adult-1-pnc-homebirth-0-visits',
                  deleted: false,
                  pass: true,
                  type: 'pnc-homebirth-0-visits',
                },
                {
                  _id: 'adult-1-births-this-month',
                  deleted: false,
                  pass: true,
                  type: 'births-this-month',
                },
                {
                  _id: 'd-1-delivery-at-facility-total',
                  deleted: false,
                  pass: false,
                  type: 'delivery-at-facility-total',
                },
                {
                  _id: 'd-1-delivery-with-min-1-visit',
                  deleted: false,
                  pass: false,
                  type: 'delivery-with-min-1-visit',
                },
                {
                  _id: 'd-1-delivery-with-min-4-visits',
                  deleted: false,
                  pass: false,
                  type: 'delivery-with-min-4-visits',
                },
                {
                  _id: 'adult-1-pnc-3-visits',
                  deleted: false,
                  pass: false,
                  type: 'pnc-3-visits',
                },
                {
                  _id: 'adult-1-pnc-homebirth-min-1-visit',
                  deleted: false,
                  pass: false,
                  type: 'pnc-homebirth-min-1-visit',
                },
                {
                  _id: 'd-1-pnc-registered-this-month',
                  deleted: false,
                  pass: true,
                  type: 'pnc-registered-this-month',
                },
              ];

              // then
              assertTargetsEqual(targets, expectedTargets, 'date');
            });
        });
        it('should emit a target instance if a PNC visit has been made', function() {
          // given
          session.assert(
              adultWithReports(
                  homeBirth(aWeekAgo),
                  pncVisit(today)));

          // when
          return session.emitTargets()
            .then(targets => {

              const expectedTargets = [
                {
                  _id: 'adult-1-pnc-active',
                  deleted: false,
                  pass: true,
                  type: 'pnc-active',
                },
                {
                  _id: 'adult-1-pnc-homebirth-0-visits',
                  deleted: false,
                  pass: false,
                  type: 'pnc-homebirth-0-visits',
                },
                {
                  _id: 'adult-1-births-this-month',
                  deleted: false,
                  pass: true,
                  type: 'births-this-month',
                },
                {
                  _id: 'd-1-delivery-at-facility-total',
                  deleted: false,
                  pass: false,
                  type: 'delivery-at-facility-total',
                },
                {
                  _id: 'd-1-delivery-with-min-1-visit',
                  deleted: false,
                  pass: false,
                  type: 'delivery-with-min-1-visit',
                },
                {
                  _id: 'd-1-delivery-with-min-4-visits',
                  deleted: false,
                  pass: false,
                  type: 'delivery-with-min-4-visits',
                },
                {
                  _id: 'pnc-2-pnc-visits-this-month',
                  deleted: false,
                  pass: true,
                  type: 'pnc-visits-this-month',
                },
                {
                  _id: 'adult-1-pnc-3-visits',
                  deleted: false,
                  pass: false,
                  type: 'pnc-3-visits',
                },
                {
                  _id: 'adult-1-pnc-homebirth-min-1-visit',
                  deleted: false,
                  pass: true,
                  type: 'pnc-homebirth-min-1-visit',
                },
                {
                  _id: 'd-1-pnc-registered-this-month',
                  deleted: false,
                  pass: true,
                  type: 'pnc-registered-this-month',
                },
              ];

              // then
              assertTargetsEqual(targets, expectedTargets, 'date');
            });
        });
        it('should emit a target instance if more than one PNC visit has been made', function() {
          // given
          session.assert(
              adultWithReports(
                  homeBirth(aMonthAgo),
                  pncVisit(aWeekAgo),
                  pncVisit(today)));

          // when
          return session.emitTargets()
            .then(targets => {

              const expectedTargets = [
                {
                  _id: 'adult-1-births-this-month',
                  deleted: false,
                  pass: true,
                  type: 'births-this-month',
                },
                {
                  _id: 'd-1-delivery-at-facility-total',
                  deleted: false,
                  pass: false,
                  type: 'delivery-at-facility-total',
                },
                {
                  _id: 'd-1-delivery-with-min-1-visit',
                  deleted: false,
                  pass: false,
                  type: 'delivery-with-min-1-visit',
                },
                {
                  _id: 'd-1-delivery-with-min-4-visits',
                  deleted: false,
                  pass: false,
                  type: 'delivery-with-min-4-visits',
                },
                {
                  _id: 'pnc-2-pnc-visits-this-month',
                  deleted: false,
                  pass: true,
                  type: 'pnc-visits-this-month',
                },
                {
                  _id: 'pnc-3-pnc-visits-this-month',
                  deleted: false,
                  pass: true,
                  type: 'pnc-visits-this-month',
                },
                {
                  _id: 'adult-1-pnc-3-visits',
                  deleted: false,
                  pass: false,
                  type: 'pnc-3-visits',
                },
                {
                  _id: 'adult-1-pnc-homebirth-min-1-visit',
                  deleted: false,
                  pass: true,
                  type: 'pnc-homebirth-min-1-visit',
                },
                {
                  _id: 'd-1-pnc-registered-this-month',
                  deleted: false,
                  pass: true,
                  type: 'pnc-registered-this-month',
                },
                {
                  _id: 'adult-1-pnc-active',
                  deleted: false,
                  pass: true,
                  type: 'pnc-active',
                },
                {
                  _id: 'adult-1-pnc-homebirth-0-visits',
                  deleted: false,
                  pass: false,
                  type: 'pnc-homebirth-0-visits',
                },
              ];

              // then
              assertTargetsEqual(targets, expectedTargets, 'date');
            });
        });
      });
      describe('non-healthy birth', function() {
        it('should not emit a target instance', function() {
          // given
          session.assert(
              adultWithReport(nonHealthyHomeBirth(aWeekAgo)));

          // when
          return session.emitTargets()
            .then(targets => {

              const expectedTargets = [
                {
                  _id: 'adult-1-pnc-active',
                  deleted: false,
                  pass: true,
                  type: 'pnc-active',
                },
                {
                  _id: 'adult-1-pnc-homebirth-0-visits',
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

  describe('immunisation reports', function() {
    it('should fail vaccination requirements when child registered without vaccinations', function() {
      // given
      session.assert(childWithNoReports());

      // when
      return session.emitTargets()
        .then(targets => {

          // then
          const expectedTargets = [
            {
              _id: 'child-1-imm-children-registered-this-month',
              deleted: false,
              type: 'imm-children-registered-this-month',
              pass: true,
            },
            {
              _id: 'child-1-imm-children-with-bcg-reported',
              deleted: false,
              type: 'imm-children-with-bcg-reported',
              pass: false,
            },
            {
              _id: 'child-1-imm-children-under-5-years',
              deleted: false,
              type: 'imm-children-under-5-years',
              pass: true,
            },
            {
              _id: 'child-1-imm-children-vaccinated-prev-3-months',
              deleted: false,
              type: 'imm-children-vaccinated-prev-3-months',
              pass: false,
            },
            {
              _id: 'child-1-imm-no-vaccine-reported',
              deleted: false,
              type: 'imm-no-vaccine-reported',
              pass: true,
            },
          ];

          assertTargetsEqual(targets, expectedTargets, 'date');
        });
    });

    describe('SMS forms', function() {
      it('should generate target instances when given MMR1 form', function() {
        // given
        session.assert(childWithReport({ form:'MMR1', _id:'r1' }));


        // when
        return session.emitTargets()
          .then(targets => {
            // then
            const expectedTargets = [
              {
                _id: 'r1-imm-vaccines-given-this-month',
                deleted: false,
                pass: true,
                type: 'imm-vaccines-given-this-month',
              },
              {
                _id: 'child-1-imm-children-registered-this-month',
                deleted: false,
                pass: true,
                type: 'imm-children-registered-this-month',
              },
              {
                _id: 'child-1-imm-children-with-bcg-reported',
                deleted: false,
                pass: false,
                type: 'imm-children-with-bcg-reported',
              },
              {
                _id: 'child-1-imm-children-under-5-years',
                deleted: false,
                pass: true,
                type: 'imm-children-under-5-years',
              },
              {
                _id: 'child-1-imm-children-vaccinated-prev-3-months',
                deleted: false,
                pass: false,
                type: 'imm-children-vaccinated-prev-3-months',
              },
              {
                _id: 'child-1-imm-no-vaccine-reported',
                deleted: false,
                pass: false,
                type: 'imm-no-vaccine-reported',
              },
            ];

            assertTargetsEqual(targets, expectedTargets, 'date');
          });
      });
    });

    describe('xforms', function() {
      it('should pass requirements when child registered with bcg', function() {
        // given
        session.assert(childWithReport({
          _id: 'report-1',
          form: 'immunization_visit',
          fields: {
            vaccines_received: {
              received_bcg: 'yes',
            },
          },
        }));

        // when
        return session.emitTargets()
          .then(targets => {
            const expectedTargets = [
              {
                _id: 'report-1-imm-vaccines-given-this-month0',
                deleted: false,
                pass: true,
                type: 'imm-vaccines-given-this-month',
              },
              {
                _id: 'child-1-imm-children-registered-this-month',
                deleted: false,
                type: 'imm-children-registered-this-month',
                pass: true,
              },
              {
                _id: 'child-1-imm-children-with-bcg-reported',
                deleted: false,
                type: 'imm-children-with-bcg-reported',
                pass: true,
              },
              {
                _id: 'child-1-imm-children-under-5-years',
                deleted: false,
                type: 'imm-children-under-5-years',
                pass: true,
              },
              {
                _id: 'child-1-imm-children-vaccinated-prev-3-months',
                deleted: false,
                type: 'imm-children-vaccinated-prev-3-months',
                pass: false,
              },
              {
                _id: 'child-1-imm-no-vaccine-reported',
                deleted: false,
                type: 'imm-no-vaccine-reported',
                pass: false,
              },
            ];

            assertTargetsEqual(targets, expectedTargets, 'date');
          });
      });
    });
  });

  describe('pregnancy reports', function() {
    describe('with SMS forms', function() {
      it('should register one pregnancy when P form is submitted', function() {
        // given
        session.assert(adultWithReport({
          form: 'P',
          lmp_date: threeMonthsAgo,
          reported_date: today,
        }));

        // when
        return session.emitTargets()
          .then(targets => {
            const expectedTargets = [
              {
                _id: 'adult-1-pregnancy-registrations-this-month',
                deleted: false,
                type: 'pregnancy-registrations-this-month',
                pass: true,
              },
              {
                _id: 'adult-1-active-pregnancies',
                deleted: false,
                type: 'active-pregnancies',
                pass: true,
              },
            ];

            assertTargetsEqual(targets, expectedTargets, 'date');
          });
      });

      it('should register pregnancy as high-risk when P+F forms are submitted', function() {
        // given
        session.assert(adultWithReports(
        {
          form: 'P',
          lmp_date: threeMonthsAgo,
          reported_date: today,
        },
        {
          form: 'F',
        }));

        // when
        return session.emitTargets()
          .then(targets => {
            const expectedTargets = [
              {
                _id: 'adult-1-pregnancy-registrations-this-month',
                deleted: false,
                type: 'pregnancy-registrations-this-month',
                pass: true,
              },
              {
                _id: 'adult-1-active-pregnancies',
                deleted: false,
                type: 'active-pregnancies',
                pass: true,
              },
            ];

            assertTargetsEqual(targets, expectedTargets, 'date');
          });
      });
    });
    describe('with xforms', function() {
      it('should register one pregnancy when pregnancy form is submitted', function() {
        // given
        session.assert(adultWithReport({
          form: 'pregnancy',
          lmp_date: threeMonthsAgo,
          reported_date: today,
        }));

        // when
        return session.emitTargets()
          .then(targets => {
            const expectedTargets = [
              {
                _id: 'adult-1-pregnancy-registrations-this-month',
                deleted: false,
                type: 'pregnancy-registrations-this-month',
                pass: true,
              },
              {
                _id: 'adult-1-active-pregnancies',
                deleted: false,
                type: 'active-pregnancies',
                pass: true,
              },
            ];

            assertTargetsEqual(targets, expectedTargets, 'date');
          });
      });
    });
  });

  describe('per-contact immunisation targets', function() {
    it('should create immunisation target instances for a child', function() {
      // given
      session.assert(childWithNoReports());

      // when
      return session.emitTargets()
        .then(targets => {
          const expectedTargets = [
            {
              _id: 'child-1-imm-children-registered-this-month',
              deleted: false,
              type: 'imm-children-registered-this-month',
              pass: true,
            },
            {
              _id: 'child-1-imm-children-with-bcg-reported',
              deleted: false,
              type: 'imm-children-with-bcg-reported',
              pass: false,
            },
            {
              _id: 'child-1-imm-children-under-5-years',
              deleted: false,
              type: 'imm-children-under-5-years',
              pass: true,
            },
            {
              _id: 'child-1-imm-children-vaccinated-prev-3-months',
              deleted: false,
              type: 'imm-children-vaccinated-prev-3-months',
              pass: false,
            },
            {
              _id: 'child-1-imm-no-vaccine-reported',
              deleted: false,
              type: 'imm-no-vaccine-reported',
              pass: true,
            },
          ];

          assertTargetsEqual(targets, expectedTargets, 'date');
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

  function adultWithNoReports() {
    return adultWithReports();
  }

  function adultWithReport(report) {
    return adultWithReports(report);
  }

  function adultWithReports(...reports) {
    const contact = {
      _id: 'adult-1',
      type: 'person',
      name: 'Zoe',
      date_of_birth: '1990-09-01',
      reported_date: today,
    };

    return new Contact({ contact, reports });
  }

//> DATES
  const today = NootilsManager.BASE_DATE;
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
    return daysAgo(n*7);
  }
});

function pncVisit(reported_date) {
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
  const sortTargets = (a, b) => a._id.localeCompare(b._id);
  assert.deepEqualExcluding(actual.sort(sortTargets), expected.sort(sortTargets), 'date');
}
