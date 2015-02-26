describe('Exports service', function() {

  'use strict';

  var service,
      district,
      districtErr,
      forms,
      formsErr;

  beforeEach(function() {
    module('inboxApp');
    module(function ($provide) {
      $provide.value('DownloadUrl', function(options) {
        return district + '/' + (options.messages ? 'messages' : 'forms/' + options.form.code);
      });
      $provide.value('UserDistrict', function(callback) {
        callback(districtErr, district);
      });
      $provide.value('Form', function() {
        return {
          then: function(callback, errCallback) {
            if (formsErr) {
              errCallback(formsErr);
            } else {
              callback(forms);
            }
          }
        };
      });
    });
    inject(function(_Exports_) {
      service = _Exports_;
    });
    district = 'gotham';
    districtErr = null;
    forms = [];
    formsErr = null;
  });

  it('returns UserDistrict errors', function() {
    districtErr = 'batman not found';
    service(function(err) {
      chai.expect(err).to.equal('batman not found');
    });
  });

  it('returns Form errors', function() {
    formsErr = 'robin not found';
    service(function(err) {
      chai.expect(err).to.equal('robin not found');
    });
  });

  it('returns only messages model when no forms configured', function() {
    service(function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual.messages.label).to.equal('Messages');
      chai.expect(actual.messages.url).to.equal('gotham/messages');
      chai.expect(actual.reports.length).to.equal(0);
    });
  });

  it('returns correctly', function() {
    forms = [
      { code: 'X', name: 'Xciting' },
      { code: 'Y', name: 'Ynot' }
    ];
    service(function(err, actual) {
      chai.expect(err).to.equal(null);

      chai.expect(actual.messages.label).to.equal('Messages');
      chai.expect(actual.messages.url).to.equal('gotham/messages');
      
      chai.expect(actual.reports.length).to.equal(2);
      chai.expect(actual.reports[0].label).to.equal('Xciting');
      chai.expect(actual.reports[0].url).to.equal('gotham/forms/X');
      chai.expect(actual.reports[1].label).to.equal('Ynot');
      chai.expect(actual.reports[1].url).to.equal('gotham/forms/Y');
    });
  });

});
