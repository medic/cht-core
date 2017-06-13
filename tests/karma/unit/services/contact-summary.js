describe('ContactSummary service', function() {

  'use strict';

  var service,
      Settings = sinon.stub();

  beforeEach(function() {
    module('inboxApp');
    module(function($provide) {
      $provide.value('Settings', Settings);
      $provide.value('$filter', function(name) {
        if (name !== 'reversify') {
          throw new Error('unknown filter');
        }
        return function(value) {
          return value.split('').reverse().join('');
        };
      });
    });
    inject(function(_ContactSummary_) {
      service = _ContactSummary_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(Settings);
  });

  it('returns empty when no expression configured', function() {
    Settings.returns(KarmaUtils.mockPromise(null, { contact_summary: '' }));
    var contact = {};
    var reports = [];
    return service(contact, reports).then(function(actual) {
      chai.expect(actual.fields.length).to.equal(0);
      chai.expect(actual.cards.length).to.equal(0);
    });
  });

  it('evals expression with `reports` and `contact` in scope', function() {
    var expression = '{ fields: [ ' +
                       '{ label: "Notes", value: "Hello " + contact.name },' +
                       '{ label: "Num reports", value: reports.length }' +
                      '] }';
    Settings.returns(KarmaUtils.mockPromise(null, { contact_summary: expression }));
    var contact = { name: 'jack' };
    var reports = [ { _id: 1 }, { _id: 2} ];
    return service(contact, reports).then(function(actual) {
      chai.expect(actual.fields.length).to.equal(2);
      chai.expect(actual.fields[0].label).to.equal('Notes');
      chai.expect(actual.fields[0].value).to.equal('Hello jack');
      chai.expect(actual.fields[1].label).to.equal('Num reports');
      chai.expect(actual.fields[1].value).to.equal(2);
      chai.expect(actual.cards.length).to.equal(0);
    });
  });

  it('applies filters to values', function() {
    var expression = '{ fields: [ ' +
                       '{ label: "Notes", value: "Hello", filter: "reversify" }' +
                      '] }';
    Settings.returns(KarmaUtils.mockPromise(null, { contact_summary: expression }));
    var contact = {};
    var reports = [];
    return service(contact, reports).then(function(actual) {
      chai.expect(actual.fields.length).to.equal(1);
      chai.expect(actual.fields[0].label).to.equal('Notes');
      chai.expect(actual.fields[0].value).to.equal('olleH');
      chai.expect(actual.cards.length).to.equal(0);
    });
  });
});
