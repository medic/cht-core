describe('ContactViewModelGenerator service', () => {

  'use strict';

  let assert = chai.assert,
      service,
      contactSchema,
      lineageModelGenerator,
      childContactPerson,
      childPerson,
      childPerson2,
      childPlace,
      childPlace2,
      dbGet,
      dbQuery,
      doc,
      search;

  const childPlacePluralLabel = 'mushroompodes',
        childPlaceIcon = 'fa-mushroom';

  const stubDbGet = (err, doc) => {
    dbGet.withArgs(doc._id).returns(KarmaUtils.mockPromise(err, doc));
  };

  const stubLineageModelGenerator = (err, contact, lineage) => {
    lineageModelGenerator.contact.returns(KarmaUtils.mockPromise(err, {
      _id: contact && contact._id,
      doc: contact,
      lineage: lineage
    }));
  };

  const stubDbQueryChildren = (err, parentId, docs) => {
    const options = {
      key: parentId,
      include_docs: true
    };
    docs = (docs || []).map(function(doc) {
      return { doc: doc };
    });
    dbQuery.withArgs('medic-client/contacts_by_parent', options)
      .returns(KarmaUtils.mockPromise(err, { rows: docs }));
  };

  const stubSearch = (err, reports) => {
    search.returns(KarmaUtils.mockPromise(err, reports));
  };

  beforeEach(() => {
    module('inboxApp');
    module($provide => {
      search = sinon.stub();
      dbGet = sinon.stub();
      dbQuery = sinon.stub();
      contactSchema = { get: sinon.stub() };
      contactSchema.get.returns({
        pluralLabel: childPlacePluralLabel,
        icon: childPlaceIcon
      });
      lineageModelGenerator = { contact: sinon.stub() };

      $provide.factory('DB', KarmaUtils.mockDB({ get: dbGet, query: dbQuery }));
      $provide.value('Search', search);
      $provide.value('ContactSchema', contactSchema);
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('LineageModelGenerator', lineageModelGenerator);

      const parentId = 'districtsdistrict';
      const contactId = 'mario';
      childContactPerson = { _id: contactId, type: 'person', parent: { _id: parentId } };
      childPerson = { _id: 'peach', type: 'person', name: 'Peach', date_of_birth: '1986-01-01' };
      childPerson2 = { _id: 'zelda', type: 'person', name: 'Zelda', date_of_birth: '1985-01-01' };
      childPlace = { _id: 'happyplace', type: 'mushroom', name: 'Happy Place' };
      childPlace2 = { _id: 'happyplace2', type: 'mushroom', name: 'Happy Place 2' };

      doc = {
        _id: parentId,
        type: 'clinic',
        contact: { _id: contactId }
      };
    });
    inject(_ContactViewModelGenerator_ => service = _ContactViewModelGenerator_);
  });

  describe('Place', () => {
    const runPlaceTest = childrenArray => {
      stubLineageModelGenerator(null, doc);
      stubDbGet(null, childContactPerson);
      stubSearch(null, []);
      stubDbQueryChildren(null, doc._id, childrenArray);
      return service(doc._id);
    };

    it('child places and persons get displayed separately', () => {
      return runPlaceTest([childContactPerson, childPlace]).then(model => {
        assert.equal(model.children.persons.length, 1);
        assert.deepEqual(model.children.persons[0].doc, childContactPerson);
        assert.equal(model.children.places.length, 1);
        assert.deepEqual(model.children.places[0].doc, childPlace);
        assert.deepEqual(model.children.childPlacesLabel, childPlacePluralLabel);
        assert.deepEqual(model.children.childPlacesIcon, childPlaceIcon);
      });
    });

    it('if no child places, child persons get displayed', () => {
      return runPlaceTest([childContactPerson, childPerson]).then(model => {
        assert.equal(model.children.persons.length, 2);
        assert.equal(model.children.places, undefined);
      });
    });

    it('if no child persons, child places get displayed', () => {
      delete doc.contact;
      return runPlaceTest([childPlace]).then(model => {
        assert.equal(model.children.persons, undefined);
        assert.equal(model.children.places.length, 1);
        assert.deepEqual(model.children.places[0].doc, childPlace);
        assert.deepEqual(model.children.childPlacesLabel, childPlacePluralLabel);
        assert.deepEqual(model.children.childPlacesIcon, childPlaceIcon);
      });
    });

    it('contact person gets displayed on top', () => {
      return runPlaceTest([childPerson, childContactPerson]).then(model => {
        assert.deepEqual(model.children.persons[0].doc, childContactPerson);
        assert(model.children.persons[0].isPrimaryContact, 'has isPrimaryContact flag');
      });
    });

    it('if no contact in parent, persons still get displayed', () => {
      delete doc.contact;
      return runPlaceTest([childPerson, childContactPerson]).then(model => {
        assert.equal(model.children.persons.length, 2);
      });
    });

    it('if no contact person in children, persons still get displayed', () => {
      stubLineageModelGenerator(null, doc);
      stubDbGet({ status: 404 }, childContactPerson);
      stubSearch(null, []);
      stubDbQueryChildren(null, doc._id, [childPerson]);
      return service(doc._id).then(model => {
        assert.equal(model.children.persons.length, 1);
      });
    });

    it('if contact doesn\'t belong to place, it still gets displayed', () => {
      return runPlaceTest([]).then(model => {
        assert.equal(model.children.persons.length, 1);
        assert.equal(model.children.persons[0].id, childContactPerson._id);
        assert.equal(model.children.persons[0].isPrimaryContact, true);
      });
    });

    it('child places are sorted in alphabetical order', () => {
      return runPlaceTest([childPlace2, childPlace]).then(model => {
        assert.equal(model.children.places[0].doc._id, childPlace._id);
        assert.equal(model.children.places[1].doc._id, childPlace2._id);
      });
    });

    it('child persons are sorted in alphabetical order', () => {
      doc.type = 'star';
      return runPlaceTest([childPerson2, childPerson]).then(model => {
        // Remove the primary contact
        model.children.persons.splice(0, 1);
        assert.equal(model.children.persons[0].doc._id, childPerson._id);
        assert.equal(model.children.persons[1].doc._id, childPerson2._id);
      });
    });

    it('when selected doc is a clinic, child places are sorted in alphabetical order (like for other places)', () => {
      doc.type = 'clinic';
      return runPlaceTest([childPlace2, childPlace]).then(model => {
        assert.equal(model.children.places[0].doc._id, childPlace._id);
        assert.equal(model.children.places[1].doc._id, childPlace2._id);
      });
    });

    it('when selected doc is a clinic, child persons are sorted by age', () => {
      doc.type = 'clinic';
      return runPlaceTest([childPerson2, childPerson]).then(model => {
        // Remove the primary contact
        model.children.persons.splice(0, 1);
        assert.equal(model.children.persons[0].doc._id, childPerson2._id);
        assert.equal(model.children.persons[1].doc._id, childPerson._id);
      });
    });
  });

  describe('Person', () => {
    const runPersonTest = parentDoc => {
      stubLineageModelGenerator(null, childContactPerson, [ parentDoc ]);
      stubSearch(null, []);
      return service(childContactPerson._id);
    };

    describe('isPrimaryContact flag', () => {

      it('if selected doc is primary contact, the isPrimaryContact flag should be true', () => {
        return runPersonTest(doc).then(model => {
          assert(model.isPrimaryContact, 'isPrimaryContact flag should be true');
        });
      });

      it('if selected doc has no parent field, the isPrimaryContact flag should be false', () => {
        delete childContactPerson.parent;
        return runPersonTest(null).then(model => {
          assert(!model.isPrimaryContact, 'isPrimaryContact flag should be false');
        });
      });

    });
  });

  describe('Reports', () => {
    const runReportsTest = childrenArray => {
      stubLineageModelGenerator(null, doc);
      stubDbGet({ status: 404 }, childContactPerson);
      stubDbQueryChildren(null, doc._id, childrenArray);
      return service(doc._id);
    };

    it('sets the returned reports as selected', () => {
      stubSearch(null, [ { _id: 'ab' } ]);
      return runReportsTest([]).then(model => {
        chai.expect(model.reports.length).to.equal(1);
        chai.expect(model.reports[0]._id).to.equal('ab');
      });
    });

    it('sorts reports by reported_date', () => {
      const report1 = { _id: 'ab', reported_date: 123 };
      const report2 = { _id: 'cd', reported_date: 456 };
      stubSearch(null, [ report1, report2 ]);
      return runReportsTest([]).then(model => {
        chai.expect(model.reports.length).to.equal(2);
        chai.expect(model.reports[0]._id).to.equal(report2._id);
        chai.expect(model.reports[1]._id).to.equal(report1._id);
      });
    });

    it('includes reports from child places', () => {
      stubSearch(null, [ { _id: 'ab' },{ _id: 'cd' } ]);
      return runReportsTest([childPerson, childPerson2]).then(model => {
        chai.expect(search.args[0][1].subjectIds).to.deep.equal([ doc._id, childPerson2._id, childPerson._id ]);
        chai.expect(search.callCount).to.equal(1);
        chai.expect(model.reports.length).to.equal(2);
        chai.expect(model.reports[0]._id).to.equal('ab');
        chai.expect(model.reports[1]._id).to.equal('cd');
      });
    });

    it('sorts reports by reported_date, not by parent vs. child', () => {
      const expectedReports = [
        { _id: 'aa', reported_date: 123 },
        { _id: 'bb', reported_date: 345 }
      ];
      stubSearch(null, [ expectedReports[0], expectedReports[1] ]);
      return runReportsTest([childPerson, childPerson2]).then(model => {
        chai.expect(search.callCount).to.equal(1);
        chai.expect(search.args[0][1].subjectIds).to.deep.equal([ doc._id, childPerson2._id, childPerson._id ]);
        chai.assert.deepEqual(model.reports, [ expectedReports[1], expectedReports[0]]);
      });
    });

    it('includes subjectIds in reports search so JSON reports are found', () => {
      doc.patient_id = 'cd';
      doc.place_id = 'ef';
      stubSearch(null, [ { _id: 'ab' } ]);
      return runReportsTest([], () => {
        chai.expect(search.callCount).to.equal(1);
        chai.expect(search.args[0][0]).to.equal('reports');
        chai.expect(search.args[0][1].subjectIds.length).to.equal(3);
        chai.expect(search.args[0][1].subjectIds).to.include(doc._id);
        chai.expect(search.args[0][1].subjectIds).to.include('cd');
        chai.expect(search.args[0][1].subjectIds).to.include('ef');
      });
    });

    it('adds patient_name to reports', () => {
      const report = { _id: 'ab', fields: { patient_id: childPerson._id} };
      stubSearch(null, [ report ]);
      return runReportsTest([childPerson], (model) => {
        // search queried
        chai.expect(search.callCount).to.equal(1);
        chai.expect(search.args[0][0]).to.equal('reports');
        chai.expect(search.args[0][1].subjectIds.length).to.equal(3);
        chai.expect(search.args[0][1].subjectIds).to.include(doc._id);

        chai.expect(model.reports.length).to.equal(1);
        chai.expect(model.reports[0]._id).to.equal('ab');
        chai.expect(model.reports[0].fields.patient_name).to.equal(childPerson.name);
      });
    });
  });

});
