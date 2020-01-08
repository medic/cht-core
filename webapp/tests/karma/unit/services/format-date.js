describe('FormatDate service', function() {

  'use strict';

  let service;
  let translateInstant;
  let relativeTime;
  let pastFuture;

  const LONG_DATE_FORMAT = 'h:mm A';

  beforeEach(function() {
    module('inboxApp');
    relativeTime = sinon.stub();
    pastFuture = sinon.stub();
    module(function($provide) {
      $provide.value('Settings', KarmaUtils.nullPromise());
      $provide.value('MomentLocaleData', function() {
        return {
          relativeTime: relativeTime,
          pastFuture: pastFuture,
          longDateFormat: function() { return LONG_DATE_FORMAT; }
        };
      });
    });
    inject(function(_FormatDate_, _$translate_) {
      service = _FormatDate_;
      translateInstant = sinon.stub(_$translate_, 'instant');
    });
  });

  afterEach(function() { sinon.restore(); });

  describe('age', function() {

    it('returns diff without suffix', function(done) {
      relativeTime.returns('5 years old');
      const actual = service.age(moment().subtract(5, 'years'));
      chai.expect(actual).to.equal('5 years old');
      chai.expect(relativeTime.args[0][0]).to.equal(5);     // quantity
      chai.expect(relativeTime.args[0][1]).to.equal(true);  // without suffix
      chai.expect(relativeTime.args[0][2]).to.equal('yy');  // translation key for "years"
      done();
    });

    it('rounds down', function(done) {
      relativeTime.returns('5 years old');
      const dob = moment().subtract(5, 'years').subtract(11, 'months').subtract(25, 'days');
      const actual = service.age(dob);
      chai.expect(actual).to.equal('5 years old');
      chai.expect(relativeTime.args[0][0]).to.equal(5);
      chai.expect(relativeTime.args[0][1]).to.equal(true);
      chai.expect(relativeTime.args[0][2]).to.equal('yy');
      done();
    });

    it('shows months when less than 2 years old', function(done) {
      relativeTime.returns('16 months');
      const dob = moment().subtract(16, 'months').subtract(25, 'days');
      const actual = service.age(dob);
      chai.expect(actual).to.equal('16 months');
      chai.expect(relativeTime.args[0][0]).to.equal(16);
      chai.expect(relativeTime.args[0][1]).to.equal(true);
      chai.expect(relativeTime.args[0][2]).to.equal('MM');
      done();
    });

    it('shows days when less than 2 months old', function(done) {
      relativeTime.returns('50 days');
      const dob = moment().subtract(50, 'days');
      const actual = service.age(dob);
      chai.expect(actual).to.equal('50 days');
      chai.expect(relativeTime.args[0][0]).to.equal(50);
      chai.expect(relativeTime.args[0][1]).to.equal(true);
      chai.expect(relativeTime.args[0][2]).to.equal('dd');
      done();
    });

    it('shows singular when one day old', function(done) {
      relativeTime.returns('1 day');
      const dob = moment().subtract(1, 'days');
      const actual = service.age(dob);
      chai.expect(actual).to.equal('1 day');
      chai.expect(relativeTime.args[0][0]).to.equal(1);
      chai.expect(relativeTime.args[0][1]).to.equal(true);
      chai.expect(relativeTime.args[0][2]).to.equal('d');
      done();
    });

    it('shows zero days old when just born', function(done) {
      relativeTime.returns('0 days');
      const dob = moment();
      const actual = service.age(dob);
      chai.expect(actual).to.equal('0 days');
      chai.expect(relativeTime.args[0][0]).to.equal(0);
      chai.expect(relativeTime.args[0][1]).to.equal(true);
      chai.expect(relativeTime.args[0][2]).to.equal('dd');
      done();
    });

    it('calculates age at death if known', function(done) {
      relativeTime.returns('100 years');
      const dob = moment().subtract(120, 'years');
      const dod = moment().subtract(20, 'years');
      const actual = service.age(dob, { end: dod });
      chai.expect(actual).to.equal('100 years');
      chai.expect(relativeTime.args[0][0]).to.equal(100);
      chai.expect(relativeTime.args[0][1]).to.equal(true);
      chai.expect(relativeTime.args[0][2]).to.equal('yy');
      done();
    });

  });

  describe('relative without time', function() {

    it('returns "today" when between now and tomorrow', function(done) {
      translateInstant.returns('pretty soon');
      const actual = service.relative(moment(), { withoutTime: true });
      chai.expect(actual).to.equal('pretty soon');
      chai.expect(translateInstant.args[0][0]).to.equal('today');
      done();
    });

    it('returns "today" when between midnigh and now', function(done) {
      translateInstant.returns('pretty soon');
      const actual = service.relative(moment().startOf('day'), { withoutTime: true });
      chai.expect(actual).to.equal('pretty soon');
      chai.expect(translateInstant.args[0][0]).to.equal('today');
      done();
    });

    /**
     * It doesn't matter how many hours away something is, if we cross
     * two day boundaries then we call that 'in 2 days'.
     * https://github.com/medic/medic/issues/1757
     */
    it('returns "in 2 days" when two sleeps away', function(done) {
      relativeTime.returns('2 days');
      pastFuture.returns('in 2 days');
      const date = moment().add(2, 'days').startOf('day').add(1, 'hours');
      const actual = service.relative(date, { withoutTime: true });
      chai.expect(actual).to.equal('in 2 days');
      chai.expect(relativeTime.args[0][0]).to.equal(2);
      chai.expect(relativeTime.args[0][1]).to.equal(true);
      chai.expect(relativeTime.args[0][2]).to.equal('dd');
      chai.expect(pastFuture.args[0][0]).to.equal(2);
      chai.expect(pastFuture.args[0][1]).to.equal('2 days');
      done();
    });

    it('returns "2 days ago" when two sleeps have passed', function(done) {
      relativeTime.returns('2 days');
      pastFuture.returns('2 days ago');
      const date = moment().subtract(2, 'days').startOf('day').add(1, 'hours');
      const actual = service.relative(date, { withoutTime: true });
      chai.expect(actual).to.equal('2 days ago');
      chai.expect(relativeTime.args[0][0]).to.equal(2);
      chai.expect(relativeTime.args[0][1]).to.equal(true);
      chai.expect(relativeTime.args[0][2]).to.equal('dd');
      chai.expect(pastFuture.args[0][0]).to.equal(-2);
      chai.expect(pastFuture.args[0][1]).to.equal('2 days');
      done();
    });

    it('returns "yesterday" when 1 day ago', function(done) {
      translateInstant.returns('yesterday');
      const actual = service.relative(moment().subtract(1, 'days'), { withoutTime: true });
      chai.expect(actual).to.equal('yesterday');
      chai.expect(translateInstant.args[0][0]).to.equal('yesterday');
      done();
    });

    it('returns "tomorrow" when in 1 day', function(done) {
      translateInstant.returns('tomorrow');
      const actual = service.relative(moment().add(1, 'days'), { withoutTime: true });
      chai.expect(actual).to.equal('tomorrow');
      chai.expect(translateInstant.args[0][0]).to.equal('tomorrow');
      done();
    });

  });

  describe('relative with time', function() {

    it('falls through to moment fromNow', function(done) {
      const actual = service.relative(moment().add(5, 'hours'));
      chai.expect(actual).to.equal('in 5 hours');
      done();
    });

  });

  describe('time', () => {
    it('returns just the time of a given date', done => {
      const now = moment();
      const time = now.format(LONG_DATE_FORMAT);
      const actual = service.time(now);
      chai.expect(actual).to.equal(time);
      done();
    });
  });
});
