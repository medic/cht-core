describe('XmlFormsContextUtils service', function() {
  'use strict';

  var service;

  beforeEach(function() {
    module('inboxApp');
    inject(function(XmlFormsContextUtils) {
      service = XmlFormsContextUtils;
    });
  });

  describe('ageInDays util', function() {

    it('exists', function() {
      chai.expect(service.ageInDays).to.not.equal(undefined);
    });

    it('handles null dob', function() {
      var actual = service.ageInDays({});
      chai.expect(actual).to.equal(undefined);
    });

    it('returns 0 when born today', function() {
      var dob = new Date();
      dob.setHours(0);
      var actual = service.ageInDays({ date_of_birth: dob });
      chai.expect(actual).to.equal(0);
    });

    it('returns 25 when exactly 25 days old', function() {
      var dob = new Date();
      dob.setDate(dob.getDate() - 25);
      var actual = service.ageInDays({ date_of_birth: dob });
      chai.expect(actual).to.equal(25);
    });

    it('returns 1000 when exactly 1000 days old', function() {
      var dob = new Date();
      dob.setDate(dob.getDate() - 1000);
      var actual = service.ageInDays({ date_of_birth: dob });
      chai.expect(actual).to.equal(1000);
    });

    it('returns 1 when born yesterday even if less than 24 hours ago', function() {
      var dob = new Date();
      dob.setDate(dob.getDate() - 1);
      dob.setHours(23);
      dob.setMinutes(59);
      var actual = service.ageInDays({ date_of_birth: dob });
      chai.expect(actual).to.equal(1);
    });

  });

  describe('ageInMonths util', function() {

    it('exists', function() {
      chai.expect(service.ageInMonths).to.not.equal(undefined);
    });

    it('handles null dob', function() {
      var actual = service.ageInMonths({});
      chai.expect(actual).to.equal(undefined);
    });

    it('returns 0 when less than 1 month old', function() {
      var dob = new Date();
      dob.setDate(dob.getDate() - 25);
      var actual = service.ageInMonths({ date_of_birth: dob });
      chai.expect(actual).to.equal(0);
    });

    it('returns 11 when 11 months old', function() {
      var dob = new Date();
      dob.setMonth(dob.getMonth() - 11, 1);
      var actual = service.ageInMonths({ date_of_birth: dob });
      chai.expect(actual).to.equal(11);
    });

    it('returns 13 when 13 months old', function() {
      var dob = new Date();
      dob.setMonth(dob.getMonth() - 13, 1);
      var actual = service.ageInMonths({ date_of_birth: dob });
      chai.expect(actual).to.equal(13);
    });

  });

  describe('ageInYears util', function() {

    it('exists', function() {
      chai.expect(service.ageInYears).to.not.equal(undefined);
    });

    it('handles null dob', function() {
      var actual = service.ageInYears({});
      chai.expect(actual).to.equal(undefined);
    });

    it('returns 0 when less than 1 year old', function() {
      var dob = new Date();
      dob.setMonth(dob.getMonth() - 11, 1);
      var actual = service.ageInYears({ date_of_birth: dob });
      chai.expect(actual).to.equal(0);
    });

    it('returns 18 when exactly 18 years', function() {
      var dob = new Date();
      dob.setFullYear(dob.getFullYear() - 18);
      var actual = service.ageInYears({ date_of_birth: dob });
      chai.expect(actual).to.equal(18);
    });

  });

});
