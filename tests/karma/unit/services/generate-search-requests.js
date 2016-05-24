describe('GenerateSearchRequests service', function() {

  'use strict';

  var service;

  var date20130208 = 1360321199999;
  var date20130612 = 1371038399999;

  beforeEach(function() {
    module('inboxApp');
    inject(function(_GenerateSearchRequests_) {
      service = _GenerateSearchRequests_;
    });
  });

  it('creates unfiltered request for no filter', function() {
    var result = service('reports', {});
    chai.expect(result.length).to.equal(1);
    chai.expect(result[0]).to.deep.equal({
      view: 'reports_by_date',
      params: {
        descending: true
      }
    });
  });

  describe('form filter', function() {

    it('all selected', function() {
      var filters = {
        forms: {
          selected: [ { code: 'P' }, { code: 'R' } ],
          options: [ { code: 'P' }, { code: 'R' } ]
        }
      };
      var result = service('reports', filters);
      chai.expect(result.length).to.equal(1);
      chai.expect(result[0]).to.deep.equal({
        view: 'reports_by_date',
        params: {
          descending: true
        }
      });
    });

    it('some selected', function() {
      var filters = {
        forms: {
          selected: [ { code: 'P' }, { code: 'R' } ],
          options: [ { code: 'P' }, { code: 'R' }, { code: 'D' } ]
        }
      };
      var result = service('reports', filters);
      chai.expect(result.length).to.equal(1);
      chai.expect(result[0].view).to.equal('reports_by_form');
      chai.expect(result[0].params).to.deep.equal({
        keys: [ [ 'P' ], [ 'R' ] ]
      });
    });

  });

  describe('validity filter', function() {

    it('true', function() {
      var result = service('reports', { valid: true });
      chai.expect(result.length).to.equal(1);
      chai.expect(result[0].view).to.equal('reports_by_validity');
      chai.expect(result[0].params).to.deep.equal({
        key: [ true ]
      });
    });

    it('false', function() {
      var result = service('reports', { valid: false });
      chai.expect(result.length).to.equal(1);
      chai.expect(result[0].view).to.equal('reports_by_validity');
      chai.expect(result[0].params).to.deep.equal({
        key: [ false ]
      });
    });

  });

  describe('verification filter', function() {

    it('true', function() {
      var result = service('reports', { verified: true });
      chai.expect(result.length).to.equal(1);
      chai.expect(result[0].view).to.equal('reports_by_verification');
      chai.expect(result[0].params).to.deep.equal({
        key: [ true ]
      });
    });

    it('false', function() {
      var result = service('reports', { verified: false });
      chai.expect(result.length).to.equal(1);
      chai.expect(result[0].view).to.equal('reports_by_verification');
      chai.expect(result[0].params).to.deep.equal({
        key: [ false ]
      });
    });

  });

  it('creates requests for reports with places filter', function() {
    var filters = {
      facilities: {
        selected: [ 'a', 'b', 'c' ],
        options: [ 'a', 'b', 'c', 'd', 'e', 'f' ]
      }
    };
    var result = service('reports', filters);
    chai.expect(result.length).to.equal(1);
    chai.expect(result[0].view).to.equal('reports_by_place');
    chai.expect(result[0].params).to.deep.equal({
      keys: [ [ 'a' ], [ 'b' ], [ 'c' ] ]
    });
  });

  it('creates requests for reports with subjectIds filter', function() {
    var result = service('reports', { subjectIds: [ 'a', 'b', 'c' ] });
    chai.expect(result.length).to.equal(1);
    chai.expect(result[0].view).to.equal('reports_by_subject');
    chai.expect(result[0].params).to.deep.equal({
      keys: [ [ 'a' ], [ 'b' ], [ 'c' ] ]
    });
  });

  it('creates requests for reports with date filter', function() {
    var filters = {
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    var result = service('reports', filters);
    chai.expect(result.length).to.equal(1);
    chai.expect(result[0].view).to.equal('reports_by_date');
    chai.expect(result[0].params).to.deep.equal({
      startkey: [ 1360321199999 ],
      endkey: [ 1371124799999 ]
    });
  });

  it('creates unfiltered contacts request for no filter', function() {
    var result = service('contacts', {});
    chai.expect(result.length).to.equal(1);
    chai.expect(result[0]).to.deep.equal({
      view: 'contacts_by_name'
    });
  });

  it('creates unfiltered contacts request for type filter', function() {
    var filters = {
      types: {
        selected: [ 'person', 'clinic' ],
        options: [ 'person', 'clinic', 'district_hospital' ]
      }
    };
    var result = service('contacts', filters);
    chai.expect(result.length).to.equal(1);
    chai.expect(result[0]).to.deep.equal({
      view: 'contacts_by_type',
      params: {
        keys: [ [ 'person' ], [ 'clinic' ] ]
      }
    });
  });

  it('creates unfiltered contacts request for places filter', function() {
    var filters = {
      facilities: {
        selected: [ 'a', 'b', 'c' ],
        options: [ 'a', 'b', 'c', 'd', 'e', 'f' ]
      }
    };
    var result = service('contacts', filters);
    chai.expect(result.length).to.equal(1);
    chai.expect(result[0].view).to.equal('contacts_by_place');
    chai.expect(result[0].params).to.deep.equal({
      keys: [ [ 'a' ], [ 'b' ], [ 'c' ] ]
    });
  });

  describe('freetext filter', function() {

    it('reports with exact matching', function() {
      var result = service('reports', { search: 'patient_id:123 form:D' });
      chai.expect(result.length).to.equal(2);
      chai.expect(result[0].view).to.equal('reports_by_freetext');
      chai.expect(result[0].params).to.deep.equal({
        key: [ 'patient_id:123' ]
      });
      chai.expect(result[1].view).to.equal('reports_by_freetext');
      chai.expect(result[1].params).to.deep.equal({
        key: [ 'form:d' ]
      });
    });

    it('reports starts with', function() {
      var result = service('reports', { search: 'someth' });
      chai.expect(result.length).to.equal(1);
      chai.expect(result[0].view).to.equal('reports_by_freetext');
      chai.expect(result[0].params).to.deep.equal({
        startkey: [ 'someth' ],
        endkey: [ 'someth\ufff0' ],
      });
    });

    it('contacts starts with', function() {
      var result = service('contacts', { search: 'someth' });
      chai.expect(result.length).to.equal(1);
      chai.expect(result[0].view).to.equal('contacts_by_freetext');
      chai.expect(result[0].params).to.deep.equal({
        startkey: [ 'someth' ],
        endkey: [ 'someth\ufff0' ],
      });
    });

    it('contacts multiple words', function() {
      var result = service('contacts', { search: 'some thing' });
      chai.expect(result.length).to.equal(2);
      chai.expect(result[0].view).to.equal('contacts_by_freetext');
      chai.expect(result[0].params).to.deep.equal({
        startkey: [ 'some' ],
        endkey: [ 'some\ufff0' ],
      });
      chai.expect(result[1].view).to.equal('contacts_by_freetext');
      chai.expect(result[1].params).to.deep.equal({
        startkey: [ 'thing' ],
        endkey: [ 'thing\ufff0' ],
      });
    });

    it('mixing starts with and exact matching', function() {
      var result = service('contacts', { search: 'patient_id:123 visit' });
      chai.expect(result.length).to.equal(2);
      chai.expect(result[0].view).to.equal('contacts_by_freetext');
      chai.expect(result[0].params).to.deep.equal({
        key: [ 'patient_id:123' ]
      });
      chai.expect(result[1].view).to.equal('contacts_by_freetext');
      chai.expect(result[1].params).to.deep.equal({
        startkey: [ 'visit' ],
        endkey: [ 'visit\ufff0' ],
      });
    });
  });
});
