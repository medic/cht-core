describe('FormatDate service', function() {

  'use strict';

  var service,
      translateInstant,
      relativeTime,
      pastFuture;

  beforeEach(function() {
    module('inboxApp');
    relativeTime = sinon.stub();
    pastFuture = sinon.stub();
    module(function($provide) {
      $provide.value('Settings', KarmaUtils.nullPromise());
      $provide.value('MomentLocaleData', function() {
        return {
          relativeTime: relativeTime,
          pastFuture: pastFuture
        };
      });
    });
    inject(function(_FormatDate_, _$translate_) {
      service = _FormatDate_;
      translateInstant = sinon.stub(_$translate_, 'instant');
    });
  });

  afterEach(function() {
    KarmaUtils.restore(translateInstant, relativeTime, pastFuture);
  });

  describe('age', function() {

    it('returns diff without suffix', function(done) {
      relativeTime.returns('5 years old');
      var actual = service.age(moment().subtract(5, 'years').subtract(1, 'days'));
      chai.expect(actual).to.equal('5 years old');
      chai.expect(relativeTime.args[0][0]).to.equal(5);     // quantity
      chai.expect(relativeTime.args[0][1]).to.equal(true);  // without suffix
      chai.expect(relativeTime.args[0][2]).to.equal('yy');  // translation key for "years"
      done();
    });

    it('rounds down', function(done) {
      relativeTime.returns('5 years old');
      var dob = moment().subtract(5, 'years').subtract(11, 'months').subtract(25, 'days');
      var actual = service.age(dob);
      chai.expect(actual).to.equal('5 years old');
      chai.expect(relativeTime.args[0][0]).to.equal(5);
      chai.expect(relativeTime.args[0][1]).to.equal(true);
      chai.expect(relativeTime.args[0][2]).to.equal('yy');
      done();
    });

    it('shows months when less than 2 years old', function(done) {
      relativeTime.returns('16 months');
      var dob = moment().subtract(16, 'months').subtract(25, 'days');
      var actual = service.age(dob);
      chai.expect(actual).to.equal('16 months');
      chai.expect(relativeTime.args[0][0]).to.equal(16);
      chai.expect(relativeTime.args[0][1]).to.equal(true);
      chai.expect(relativeTime.args[0][2]).to.equal('MM');
      done();
    });

    it('shows days when less than 2 months old', function(done) {
      relativeTime.returns('50 days');
      var dob = moment().subtract(50, 'days').startOf('day');
      var actual = service.age(dob);
      chai.expect(actual).to.equal('50 days');
      chai.expect(relativeTime.args[0][0]).to.equal(50);
      chai.expect(relativeTime.args[0][1]).to.equal(true);
      chai.expect(relativeTime.args[0][2]).to.equal('dd');
      done();
    });

    it('shows singular when one day old', function(done) {
      relativeTime.returns('1 day');
      var dob = moment().subtract(1, 'days').startOf('day');
      var actual = service.age(dob);
      chai.expect(actual).to.equal('1 day');
      chai.expect(relativeTime.args[0][0]).to.equal(1);
      chai.expect(relativeTime.args[0][1]).to.equal(true);
      chai.expect(relativeTime.args[0][2]).to.equal('d');
      done();
    });

  });

  describe('relative without time', function() {

    it('returns "today" when between now and tomorrow', function(done) {
      translateInstant.returns('pretty soon');
      var actual = service.relative(moment(), { withoutTime: true });
      chai.expect(actual).to.equal('pretty soon');
      chai.expect(translateInstant.args[0][0]).to.equal('today');
      done();
    });

    /**
     * It doesn't matter how many hours away something is, if we cross
     * two day boundaries then we call that 'in 2 days'.
     * https://github.com/medic/medic-webapp/issues/1757
     */
    it('returns "in 2 days" when two sleeps away', function(done) {
      relativeTime.returns('2 days');
      pastFuture.returns('in 2 days');
      var date = moment().add(2, 'days').startOf('day').add(1, 'hours');
      var actual = service.relative(date, { withoutTime: true });
      chai.expect(actual).to.equal('in 2 days');
      chai.expect(relativeTime.args[0][0]).to.equal(2);
      chai.expect(relativeTime.args[0][1]).to.equal(true);
      chai.expect(relativeTime.args[0][2]).to.equal('dd');
      chai.expect(pastFuture.args[0][0]).to.equal(2);
      chai.expect(pastFuture.args[0][1]).to.equal('2 days');
      done();
    });

  });

  describe('relative with time', function() {

    it('falls through to moment fromNow', function(done) {
      var actual = service.relative(moment().add(5, 'hours'));
      chai.expect(actual).to.equal('in 5 hours');
      done();
    });

  });

});