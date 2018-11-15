var chai = require('chai'),
    GenerateSeachRequests = require('../src/generate-search-requests'),
    service = GenerateSeachRequests.generate;

describe('GenerateSearchRequests service', function() {

  'use strict';

  var date20130208 = 1360321199999;
  var date20130612 = 1371038399999;

  it('creates unfiltered request for no filter', function() {
    var result = service('reports', {});
    chai.expect(result.length).to.equal(1);
    chai.expect(result[0]).to.deep.equal({
      view: 'medic-client/reports_by_date',
      ordered: true,
      params: {
        descending: true
      }
    });
  });

  describe('form filter', function() {

    it('all selected executes the unfiltered search', function() {
      var filters = {
        forms: {
          selected: [ { code: 'P' }, { code: 'R' } ],
          options: [ { code: 'P' }, { code: 'R' } ]
        }
      };
      var result = service('reports', filters);
      chai.expect(result.length).to.equal(1);
      chai.expect(result[0]).to.deep.equal({
        view: 'medic-client/reports_by_date',
        ordered: true,
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
      chai.expect(result[0].view).to.equal('medic-client/reports_by_form');
      chai.expect(result[0].params).to.deep.equal({
        keys: [ [ 'P' ], [ 'R' ] ],
        reduce: false
      });
    });

  });

  describe('validity filter', function() {

    it('true', function() {
      var result = service('reports', { valid: true });
      chai.expect(result.length).to.equal(1);
      chai.expect(result[0].view).to.equal('medic-client/reports_by_validity');
      chai.expect(result[0].params).to.deep.equal({
        key: [ true ]
      });
    });

    it('false', function() {
      var result = service('reports', { valid: false });
      chai.expect(result.length).to.equal(1);
      chai.expect(result[0].view).to.equal('medic-client/reports_by_validity');
      chai.expect(result[0].params).to.deep.equal({
        key: [ false ]
      });
    });

  });

  describe('verification filter', function() {

    it('queries', function() {
      var verifiedValues = [[true], [false], [undefined], [false, undefined]];
      verifiedValues.forEach(function(value) {
        var result = service('reports', { verified: value });
        chai.expect(result.length).to.equal(1);
        chai.expect(result[0].view).to.equal('medic-client/reports_by_verification');
        chai.expect(result[0].params).to.deep.equal({
          keys: value.map(function(v){ return [v]; })
        });
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
    chai.expect(result[0].view).to.equal('medic-client/reports_by_place');
    chai.expect(result[0].params).to.deep.equal({
      keys: [ [ 'a' ], [ 'b' ], [ 'c' ] ]
    });
  });

  it('creates requests for reports with subjectIds filter', function() {
    var filters = {
      subjectIds: [ 'a', 'b', 'c' ]
    };
    var result = service('reports', filters);
    chai.expect(result.length).to.equal(1);
    chai.expect(result[0].view).to.equal('medic-client/reports_by_subject');
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
    chai.expect(result[0].view).to.equal('medic-client/reports_by_date');
    chai.expect(result[0].params.startkey[0]).to.equal(1360321199999);
    chai.expect(result[0].params.endkey[0]).to.equal(1371038399999);
  });

  var assertUnfilteredContactRequest = function(result) {
    chai.expect(result.length).to.equal(1);
    chai.expect(result[0]).to.deep.equal({
      ordered: true,
      view: 'medic-client/contacts_by_type_index_name'
    });
  };

  it('creates unfiltered contacts request for no filter', function() {
    var result = service('contacts', {});
    assertUnfilteredContactRequest(result);
  });

  it('creates contacts type request for types filter', function() {
    var filters = {
      types: {
        selected: [ 'person', 'clinic' ],
        options: [ 'person', 'clinic', 'district_hospital' ]
      }
    };
    var result = service('contacts', filters);
    chai.expect(result.length).to.equal(1);
    chai.expect(result[0]).to.deep.equal({
      view: 'medic-client/contacts_by_type',
      params: {
        keys: [ [ 'person' ], [ 'clinic' ] ]
      }
    });
  });

  it('creates unfiltered contacts request for types filter when all options are selected', function() {
    var filters = {
      types: {
        selected: [ 'person', 'clinic', 'district_hospital' ],
        options: [ 'person', 'clinic', 'district_hospital' ]
      }
    };
    var result = service('contacts', filters);
    assertUnfilteredContactRequest(result);
  });

  it('creates unfiltered contacts request for types filter when no options are selected', function() {
    var filters = {
      types: {
        selected: [],
        options: [ 'person', 'clinic', 'district_hospital' ]
      }
    };
    var result = service('contacts', filters);
    assertUnfilteredContactRequest(result);
  });

  // format used by select2search
  it('creates contacts type request for type filter without options', function() {
    var filters = {
      types: {
        selected: [ 'person', 'clinic' ]
        // no options.
      }
    };
    var result = service('contacts', filters);
    chai.expect(result.length).to.equal(1);
    chai.expect(result[0]).to.deep.equal({
      view: 'medic-client/contacts_by_type',
      params: {
        keys: [ [ 'person' ], [ 'clinic' ] ]
      }
    });
  });

  describe('freetext filter', function() {

    it('reports with exact matching', function() {
      var result = service('reports', { search: 'patient_id:123 form:D' });
      chai.expect(result.length).to.equal(2);
      chai.expect(result[0].view).to.equal('medic-client/reports_by_freetext');
      chai.expect(result[0].params).to.deep.equal({
        key: [ 'patient_id:123' ]
      });
      chai.expect(result[1].view).to.equal('medic-client/reports_by_freetext');
      chai.expect(result[1].params).to.deep.equal({
        key: [ 'form:d' ]
      });
    });

    it('reports starts with', function() {
      var result = service('reports', { search: 'someth' });
      chai.expect(result.length).to.equal(1);
      chai.expect(result[0].view).to.equal('medic-client/reports_by_freetext');
      chai.expect(result[0].params).to.deep.equal({
        startkey: [ 'someth' ],
        endkey: [ 'someth\ufff0' ],
      });
    });

    it('contacts starts with', function() {
      var result = service('contacts', { search: 'someth' });
      chai.expect(result.length).to.equal(1);
      chai.expect(result[0].view).to.equal('medic-client/contacts_by_freetext');
      chai.expect(result[0].params).to.deep.equal({
        startkey: [ 'someth' ],
        endkey: [ 'someth\ufff0' ],
      });
    });

    it('contacts multiple words', function() {
      var result = service('contacts', { search: 'some thing' });
      chai.expect(result.length).to.equal(2);
      chai.expect(result[0].view).to.equal('medic-client/contacts_by_freetext');
      chai.expect(result[0].params).to.deep.equal({
        startkey: [ 'some' ],
        endkey: [ 'some\ufff0' ],
      });
      chai.expect(result[1].view).to.equal('medic-client/contacts_by_freetext');
      chai.expect(result[1].params).to.deep.equal({
        startkey: [ 'thing' ],
        endkey: [ 'thing\ufff0' ],
      });
    });

    it('mixing starts with and exact matching', function() {
      var result = service('contacts', { search: 'patient_id:123 visit' });
      chai.expect(result.length).to.equal(2);
      chai.expect(result[0].view).to.equal('medic-client/contacts_by_freetext');
      chai.expect(result[0].params).to.deep.equal({
        key: [ 'patient_id:123' ]
      });
      chai.expect(result[1].view).to.equal('medic-client/contacts_by_freetext');
      chai.expect(result[1].params).to.deep.equal({
        startkey: [ 'visit' ],
        endkey: [ 'visit\ufff0' ],
      });
    });

    /*
      this is a very common use case so we have a custom view for handling it
    */
    it('contacts freetext with a single document type - #2445', function() {
      var filters = {
        search: 'someth',
        types: {
          selected: [ 'clinic' ],
          options: [ 'person', 'clinic', 'district_hospital' ]
        }
      };
      var result = service('contacts', filters);
      chai.expect(result.length).to.equal(1);
      chai.expect(result[0].view).to.equal('medic-client/contacts_by_type_freetext');
      chai.expect(result[0].params).to.deep.equal({
        startkey: [ 'clinic', 'someth' ],
        endkey: [ 'clinic', 'someth\ufff0' ],
      });
    });

    it('contacts multiple word freetext with a single document type', function() {
      var filters = {
        search: 'some thing',
        types: {
          selected: [ 'clinic' ],
          options: [ 'person', 'clinic', 'district_hospital' ]
        }
      };
      var result = service('contacts', filters);
      chai.expect(result.length).to.equal(2);
      chai.expect(result[0].view).to.equal('medic-client/contacts_by_type_freetext');
      chai.expect(result[0].params).to.deep.equal({
        startkey: [ 'clinic', 'some' ],
        endkey: [ 'clinic', 'some\ufff0' ],
      });
      chai.expect(result[1].view).to.equal('medic-client/contacts_by_type_freetext');
      chai.expect(result[1].params).to.deep.equal({
        startkey: [ 'clinic', 'thing' ],
        endkey: [ 'clinic', 'thing\ufff0' ],
      });
    });

    it('contacts multiple word freetext with multiple document types', function() {
      var filters = {
        search: 'some thing',
        types: {
          selected: [ 'clinic', 'district_hospital' ],
          options: [ 'person', 'clinic', 'district_hospital' ]
        }
      };
      var result = service('contacts', filters);
      chai.expect(result.length).to.equal(2);
      chai.expect(result[0].view).to.equal('medic-client/contacts_by_type_freetext');
      chai.expect(result[0].union).to.equal(true);
      chai.expect(result[0].paramSets).to.deep.equal([
        {
          startkey: [ 'clinic', 'some' ],
          endkey: [ 'clinic', 'some\ufff0' ],
        },
        {
          startkey: [ 'district_hospital', 'some' ],
          endkey: [ 'district_hospital', 'some\ufff0' ],
        }
      ]);
      chai.expect(result[1].view).to.equal('medic-client/contacts_by_type_freetext');
      chai.expect(result[1].union).to.equal(true);
      chai.expect(result[1].paramSets).to.deep.equal([
        {
          startkey: [ 'clinic', 'thing' ],
          endkey: [ 'clinic', 'thing\ufff0' ],
        },
        {
          startkey: [ 'district_hospital', 'thing' ],
          endkey: [ 'district_hospital', 'thing\ufff0' ],
        }
      ]);
    });

    it('trim whitespace from search query - #2769', function() {
      var result = service('contacts', { search: '\t  some     thing    ' });
      chai.expect(result.length).to.equal(2);
      chai.expect(result[0].view).to.equal('medic-client/contacts_by_freetext');
      chai.expect(result[0].params).to.deep.equal({
        startkey: [ 'some' ],
        endkey: [ 'some\ufff0' ],
      });
      chai.expect(result[1].view).to.equal('medic-client/contacts_by_freetext');
      chai.expect(result[1].params).to.deep.equal({
        startkey: [ 'thing' ],
        endkey: [ 'thing\ufff0' ],
      });
    });

  });

  describe('shouldSortByLastVisitedDate', function() {
    it('should return false for falsy or empty inputs', function() {
      chai.expect(GenerateSeachRequests.shouldSortByLastVisitedDate()).to.equal(false);
      chai.expect(GenerateSeachRequests.shouldSortByLastVisitedDate(false)).to.equal(false);
      chai.expect(GenerateSeachRequests.shouldSortByLastVisitedDate({})).to.equal(false);
      chai.expect(GenerateSeachRequests.shouldSortByLastVisitedDate([])).to.equal(false);
    });

    it('should return false when not sorting by last visited date', function() {
      chai.expect(GenerateSeachRequests.shouldSortByLastVisitedDate({ a: 1 })).to.equal(false);
      chai.expect(GenerateSeachRequests.shouldSortByLastVisitedDate({ sortByLastVisitedDate: false })).to.equal(false);
      chai.expect(GenerateSeachRequests.shouldSortByLastVisitedDate({ sortByLastVisitedDate: null })).to.equal(false);
    });

    it('should return true when sorting by last visited date', function() {
      chai.expect(GenerateSeachRequests.shouldSortByLastVisitedDate({ sortByLastVisitedDate: true })).to.equal(true);
      chai.expect(GenerateSeachRequests.shouldSortByLastVisitedDate({ sortByLastVisitedDate: 'aaa' })).to.equal(true);
    });
  });
});
