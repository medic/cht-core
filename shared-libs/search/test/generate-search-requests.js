const chai = require('chai');
const GenerateSeachRequests = require('../src/generate-search-requests');
const service = GenerateSeachRequests.generate;

describe('GenerateSearchRequests service', () => {

  'use strict';

  const date20130208 = 1360321199999;
  const date20130612 = 1371038399999;

  it('creates unfiltered request for no filter', () => {
    const result = service('reports', {});
    chai.expect(result.length).to.equal(1);
    chai.expect(result[0]).to.deep.equal({
      view: 'medic-client/reports_by_date',
      ordered: true,
      params: {
        descending: true
      }
    });
  });

  describe('form filter', () => {

    it('all selected executes the unfiltered search', () => {
      const filters = {
        forms: {
          selected: [ { code: 'P' }, { code: 'R' } ],
          options: [ { code: 'P' }, { code: 'R' } ]
        }
      };
      const result = service('reports', filters);
      chai.expect(result.length).to.equal(1);
      chai.expect(result[0]).to.deep.equal({
        view: 'medic-client/reports_by_date',
        ordered: true,
        params: {
          descending: true
        }
      });
    });

    it('some selected', () => {
      const filters = {
        forms: {
          selected: [ { code: 'P' }, { code: 'R' } ],
          options: [ { code: 'P' }, { code: 'R' }, { code: 'D' } ]
        }
      };
      const result = service('reports', filters);
      chai.expect(result.length).to.equal(1);
      chai.expect(result[0].view).to.equal('medic-client/reports_by_form');
      chai.expect(result[0].params).to.deep.equal({
        keys: [ [ 'P' ], [ 'R' ] ],
        reduce: false
      });
    });

  });

  describe('validity filter', () => {

    it('true', () => {
      const result = service('reports', { valid: true });
      chai.expect(result.length).to.equal(1);
      chai.expect(result[0].view).to.equal('medic-client/reports_by_validity');
      chai.expect(result[0].params).to.deep.equal({
        key: [ true ]
      });
    });

    it('false', () => {
      const result = service('reports', { valid: false });
      chai.expect(result.length).to.equal(1);
      chai.expect(result[0].view).to.equal('medic-client/reports_by_validity');
      chai.expect(result[0].params).to.deep.equal({
        key: [ false ]
      });
    });

  });

  describe('verification filter', () => {

    it('queries', () => {
      const verifiedValues = [[true], [false], [undefined], [false, undefined]];
      verifiedValues.forEach((value) => {
        const result = service('reports', { verified: value });
        chai.expect(result.length).to.equal(1);
        chai.expect(result[0].view).to.equal('medic-client/reports_by_verification');
        chai.expect(result[0].params).to.deep.equal({
          keys: value.map((v) => [v])
        });
      });
    });

  });

  it('creates requests for reports with places filter', () => {
    const filters = {
      facilities: {
        selected: [ 'a', 'b', 'c' ],
        options: [ 'a', 'b', 'c', 'd', 'e', 'f' ]
      }
    };
    const result = service('reports', filters);
    chai.expect(result.length).to.equal(1);
    chai.expect(result[0].view).to.equal('medic-client/reports_by_place');
    chai.expect(result[0].params).to.deep.equal({
      keys: [ [ 'a' ], [ 'b' ], [ 'c' ] ]
    });
  });

  it('creates requests for reports with subjectIds filter', () => {
    const filters = {
      subjectIds: [ 'a', 'b', 'c' ]
    };
    const result = service('reports', filters);
    chai.expect(result.length).to.equal(1);
    chai.expect(result[0].view).to.equal('medic-client/reports_by_subject');
    chai.expect(result[0].params).to.deep.equal({
      keys: [ 'a', 'b', 'c' ]
    });
  });

  it('creates requests for reports with date filter', () => {
    const filters = {
      date: {
        from: date20130208,
        to: date20130612
      }
    };
    const result = service('reports', filters);
    chai.expect(result.length).to.equal(1);
    chai.expect(result[0].view).to.equal('medic-client/reports_by_date');
    chai.expect(result[0].params.startkey[0]).to.equal(1360321199999);
    chai.expect(result[0].params.endkey[0]).to.equal(1371038399999);
  });

  const assertUnfilteredContactRequest = (result) => {
    chai.expect(result.length).to.equal(1);
    chai.expect(result[0]).to.deep.equal({
      ordered: true,
      view: 'medic-client/contacts_by_type'
    });
  };

  it('creates unfiltered contacts request for no filter', () => {
    const result = service('contacts', {});
    assertUnfilteredContactRequest(result);
  });

  it('creates contacts type request for types filter', () => {
    const filters = {
      types: {
        selected: [ 'person', 'clinic' ],
        options: [ 'person', 'clinic', 'district_hospital' ]
      }
    };
    const result = service('contacts', filters);
    chai.expect(result.length).to.equal(1);
    chai.expect(result[0]).to.deep.equal({
      view: 'medic-client/contacts_by_type',
      params: {
        keys: [ [ 'person' ], [ 'clinic' ] ]
      }
    });
  });

  it('creates request to filter contacts by parent when contact ID and types are provided', () => {
    const filters = {
      types: {
        selected: [ 'person' ],
      },
      parent: 'S-123',
    };

    const result = service('contacts', filters);

    chai.expect(result.length).to.equal(1);
    chai.expect(result[0]).to.deep.equal({
      view: 'medic-client/contacts_by_parent',
      params: {
        keys: [ [ 'S-123', 'person' ] ],
      },
    });
  });

  it('creates request to filter contacts by parent and freetext', () => {
    const filters = {
      types: { selected: [ 'person' ] },
      search: 'someth',
      parent: 'S-123',
    };

    const result = service('contacts', filters);

    chai.expect(result.length).to.equal(2);
    chai.expect(result[0]).to.deep.equal({
      view: 'medic-client/contacts_by_parent',
      params: {
        keys: [ [ 'S-123', 'person' ] ],
      },
    });
    chai.expect(result[1]).to.deep.equal({
      view: 'medic-client/contacts_by_type_freetext',
      union: false,
      params: {
        endkey: [ 'person', 'someth\ufff0' ],
        startkey: [ 'person', 'someth' ],
      },
    });
  });

  it('creates request to filter contacts by parent when types are not provided', () => {
    const filters = { parent: 'S-123' };

    const result = service('contacts', filters);

    chai.expect(result.length).to.equal(1);
    chai.expect(result[0]).to.deep.equal({
      view: 'medic-client/contacts_by_parent',
      params: { keys: [ 'S-123' ] },
    });
  });

  it('creates unfiltered contacts request for types filter when all options are selected', () => {
    const filters = {
      types: {
        selected: [ 'person', 'clinic', 'district_hospital' ],
        options: [ 'person', 'clinic', 'district_hospital' ]
      }
    };
    const result = service('contacts', filters);
    assertUnfilteredContactRequest(result);
  });

  it('creates unfiltered contacts request for types filter when no options are selected', () => {
    const filters = {
      types: {
        selected: [],
        options: [ 'person', 'clinic', 'district_hospital' ]
      }
    };
    const result = service('contacts', filters);
    assertUnfilteredContactRequest(result);
  });

  // format used by select2search
  it('creates contacts type request for type filter without options', () => {
    const filters = {
      types: {
        selected: [ 'person', 'clinic' ]
        // no options.
      }
    };
    const result = service('contacts', filters);
    chai.expect(result.length).to.equal(1);
    chai.expect(result[0]).to.deep.equal({
      view: 'medic-client/contacts_by_type',
      params: {
        keys: [ [ 'person' ], [ 'clinic' ] ]
      }
    });
  });

  describe('freetext filter', () => {

    it('reports with exact matching', () => {
      const result = service('reports', { search: 'patient_id:123 form:D' });
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

    it('reports ignores short words - #7288', () => {
      const result = service('reports', { search: 'a be' });
      chai.expect(result.length).to.equal(1);
      chai.expect(result[0].view).to.equal('medic-client/reports_by_date'); // default
    });

    it('reports ignores short words but keeps long ones - #7288', () => {
      const result = service('reports', { search: 'a be see d elephant' });
      chai.expect(result.length).to.equal(2);
      chai.expect(result[0].view).to.equal('medic-client/reports_by_freetext');
      chai.expect(result[0].params).to.deep.equal({
        startkey: [ 'see' ],
        endkey: [ 'see\ufff0' ],
      });
      chai.expect(result[1].view).to.equal('medic-client/reports_by_freetext');
      chai.expect(result[1].params).to.deep.equal({
        startkey: [ 'elephant' ],
        endkey: [ 'elephant\ufff0' ],
      });
    });

    it('reports starts with', () => {
      const result = service('reports', { search: 'someth' });
      chai.expect(result.length).to.equal(1);
      chai.expect(result[0].view).to.equal('medic-client/reports_by_freetext');
      chai.expect(result[0].params).to.deep.equal({
        startkey: [ 'someth' ],
        endkey: [ 'someth\ufff0' ],
      });
    });

    it('contacts starts with', () => {
      const result = service('contacts', { search: 'someth' });
      chai.expect(result.length).to.equal(1);
      chai.expect(result[0].view).to.equal('medic-client/contacts_by_freetext');
      chai.expect(result[0].params).to.deep.equal({
        startkey: [ 'someth' ],
        endkey: [ 'someth\ufff0' ],
      });
    });

    it('contacts multiple words', () => {
      const result = service('contacts', { search: 'some thing' });
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

    it('mixing starts with and exact matching', () => {
      const result = service('contacts', { search: 'patient_id:123 visit' });
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
    it('contacts freetext with a single document type - #2445', () => {
      const filters = {
        search: 'someth',
        types: {
          selected: [ 'clinic' ],
          options: [ 'person', 'clinic', 'district_hospital' ]
        }
      };
      const result = service('contacts', filters);
      chai.expect(result.length).to.equal(1);
      chai.expect(result[0].view).to.equal('medic-client/contacts_by_type_freetext');
      chai.expect(result[0].params).to.deep.equal({
        startkey: [ 'clinic', 'someth' ],
        endkey: [ 'clinic', 'someth\ufff0' ],
      });
    });

    it('reports ignores short words - #7288', () => {
      const result = service('contacts', { search: 'a be' });
      chai.expect(result.length).to.equal(1);
      chai.expect(result[0].view).to.equal('medic-client/contacts_by_type'); // default
    });

    it('contacts ignores short words but keeps long ones - #7288', () => {
      const filters = {
        search: 'a be see d elephant',
        types: {
          selected: [ 'clinic' ],
          options: [ 'person', 'clinic', 'district_hospital' ]
        }
      };
      const result = service('contacts', filters);
      chai.expect(result.length).to.equal(2);
      chai.expect(result[0].view).to.equal('medic-client/contacts_by_type_freetext');
      chai.expect(result[0].params).to.deep.equal({
        startkey: [ 'clinic', 'see' ],
        endkey: [ 'clinic', 'see\ufff0' ],
      });
      chai.expect(result[1].view).to.equal('medic-client/contacts_by_type_freetext');
      chai.expect(result[1].params).to.deep.equal({
        startkey: [ 'clinic', 'elephant' ],
        endkey: [ 'clinic', 'elephant\ufff0' ],
      });
    });

    it('contacts multiple word freetext with a single document type', () => {
      const filters = {
        search: 'some thing',
        types: {
          selected: [ 'clinic' ],
          options: [ 'person', 'clinic', 'district_hospital' ]
        }
      };
      const result = service('contacts', filters);
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

    it('contacts multiple word freetext with multiple document types', () => {
      const filters = {
        search: 'some thing',
        types: {
          selected: [ 'clinic', 'district_hospital' ],
          options: [ 'person', 'clinic', 'district_hospital' ]
        }
      };
      const result = service('contacts', filters);
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

    it('trim whitespace from search query - #2769', () => {
      const result = service('contacts', { search: '\t  some     thing    ' });
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

  describe('shouldSortByLastVisitedDate', () => {
    it('should return false for falsy or empty inputs', () => {
      chai.expect(GenerateSeachRequests.shouldSortByLastVisitedDate()).to.equal(false);
      chai.expect(GenerateSeachRequests.shouldSortByLastVisitedDate(false)).to.equal(false);
      chai.expect(GenerateSeachRequests.shouldSortByLastVisitedDate({})).to.equal(false);
      chai.expect(GenerateSeachRequests.shouldSortByLastVisitedDate([])).to.equal(false);
    });

    it('should return false when not sorting by last visited date', () => {
      chai.expect(GenerateSeachRequests.shouldSortByLastVisitedDate({ a: 1 })).to.equal(false);
      chai.expect(GenerateSeachRequests.shouldSortByLastVisitedDate({ sortByLastVisitedDate: false })).to.equal(false);
      chai.expect(GenerateSeachRequests.shouldSortByLastVisitedDate({ sortByLastVisitedDate: null })).to.equal(false);
    });

    it('should return true when sorting by last visited date', () => {
      chai.expect(GenerateSeachRequests.shouldSortByLastVisitedDate({ sortByLastVisitedDate: true })).to.equal(true);
      chai.expect(GenerateSeachRequests.shouldSortByLastVisitedDate({ sortByLastVisitedDate: 'aaa' })).to.equal(true);
    });
  });

  it('should add map function to contact type request if sorting by date last visited', () => {
    const result = service('contacts', { types: { selected: [ 'clinic' ] } }, { sortByLastVisitedDate: true } );
    chai.expect(result.length).to.equal(2);
    chai.expect(result[0].view).to.equal('medic-client/contacts_by_type');
    chai.expect(result[0].params).to.deep.equal({ keys: [ [ 'clinic' ] ]});
    chai.expect(result[0].map).to.be.ok;
    const map = result[0].map;

    chai.expect(map({ value: 'true true Maria' })).to.deep.equal({ value: 'true true Maria', sort: 'true true' });
    chai.expect(map({ value: 'false false Felicia' }))
      .to.deep.equal({ value: 'false false Felicia', sort: 'false false' });
    chai.expect(map({ value: 'true false Moses' })).to.deep.equal({ value: 'true false Moses', sort: 'true false' });
  });
});
