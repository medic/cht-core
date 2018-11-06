describe('ContactViewModelGenerator service', () => {

  'use strict';

  let assert = chai.assert,
      service,
      contactSchema,
      lineageModelGenerator,
      childContactPerson,
      deceasedChildPerson,
      childPerson,
      childPerson2,
      childPlace,
      childPlace2,
      dbGet,
      dbQuery,
      dbAllDocs,
      doc,
      search;

  const childPlacePluralLabel = 'mushroompodes',
        childPlaceIcon = 'fa-mushroom';

  const stubDbGet = (err, doc) => {
    dbGet.withArgs(doc._id).returns(KarmaUtils.promise(err, doc));
  };

  const stubLineageModelGenerator = (err, contact, lineage) => {
    lineageModelGenerator.contact.returns(KarmaUtils.promise(err, {
      _id: contact && contact._id,
      doc: contact,
      lineage: lineage
    }));
  };

  const stubDbQueryChildren = (err, parentId, docs = [], contacts = []) => {
    const options = {
      key: parentId,
      include_docs: true
    };
    docs = docs.map(doc => {
      return { doc: doc };
    });
    contacts = contacts.map(doc => {
      return { id: doc._id, doc: { name: doc.name }};
    });
    var ids = docs.map(child => child.doc.contact && child.doc.contact._id).filter(id => !!id);
    dbQuery.withArgs('medic-client/contacts_by_parent', options)
      .returns(KarmaUtils.promise(err, { rows: docs }));
    dbAllDocs.withArgs({ keys: ids, include_docs: true })
      .returns(KarmaUtils.promise(err, { rows: contacts }));
  };

  const stubSearch = (err, reports) => {
    search.returns(KarmaUtils.promise(err, reports));
  };

  beforeEach(() => {
    module('inboxApp');
    module($provide => {
      search = sinon.stub();
      dbGet = sinon.stub();
      dbQuery = sinon.stub();
      dbAllDocs = sinon.stub();
      contactSchema = { get: sinon.stub() };
      contactSchema.get.returns({
        pluralLabel: childPlacePluralLabel,
        icon: childPlaceIcon
      });
      lineageModelGenerator = { contact: sinon.stub() };

      $provide.factory('DB', KarmaUtils.mockDB({ get: dbGet, query: dbQuery, allDocs: dbAllDocs }));
      $provide.value('Search', search);
      $provide.value('ContactSchema', contactSchema);
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('LineageModelGenerator', lineageModelGenerator);

      const parentId = 'districtsdistrict';
      const contactId = 'mario';
      childContactPerson = { _id: contactId, name: 'sandy', type: 'person', parent: { _id: parentId } };
      deceasedChildPerson = { _id: 'deceaseduuid', name: 'casper', type: 'person', date_of_death: 123456789, parent: { _id: parentId } };
      childPerson = { _id: 'peach', type: 'person', name: 'Peach', date_of_birth: '1986-01-01' };
      childPerson2 = { _id: 'zelda', type: 'person', name: 'Zelda', date_of_birth: '1985-01-01' };
      childPlace = { _id: 'happyplace', type: 'mushroom', name: 'Happy Place', contact: { _id: contactId } };
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
    const runPlaceTest = (childrenArray, contactsArray) => {
      stubLineageModelGenerator(null, doc);
      stubDbGet(null, childContactPerson);
      stubSearch(null, []);
      stubDbQueryChildren(null, doc._id, childrenArray, contactsArray);
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

    it('child contacts are hydrated properly - #3807', () => {
      return runPlaceTest([childPlace], [childContactPerson]).then(model => {
        assert.equal(model.children.places[0].doc.contact.name, childContactPerson.name);
      });
    });

    it('child places and persons get displayed separately', () => {
      return runPlaceTest([childContactPerson, deceasedChildPerson]).then(model => {
        assert.equal(model.children.persons.length, 1);
        assert.deepEqual(model.children.persons[0].doc, childContactPerson);
        assert.equal(model.children.deceased.length, 1);
        assert.deepEqual(model.children.deceased[0].doc, deceasedChildPerson);
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

    it('includes reports from children', () => {
      stubSearch(null, [ { _id: 'ab' },{ _id: 'cd' } ]);
      return runReportsTest([childPerson, childPerson2, deceasedChildPerson]).then(model => {
        chai.expect(search.args[0][1].subjectIds).to.deep.equal([ doc._id, childPerson2._id, childPerson._id, deceasedChildPerson._id ]);
        chai.expect(search.callCount).to.equal(1);
        chai.expect(model.reports.length).to.equal(2);
        chai.expect(model.reports[0]._id).to.equal('ab');
        chai.expect(model.reports[1]._id).to.equal('cd');
      });
    });

    it('adds patient name to reports', () => {
      childPerson.patient_id = '12345';
      const report1 = { _id: 'ab', fields: { patient_id: childPerson.patient_id } };
      const report2 = { _id: 'cd', fields: { patient_id: childPerson.patient_id, patient_name: 'Jack' } };
      stubSearch(null, [ report1, report2 ]);
      return runReportsTest([childPerson, childPerson2]).then(model => {
        chai.expect(search.callCount).to.equal(1);
        chai.expect(model.reports.length).to.equal(2);
        chai.expect(model.reports[0]._id).to.equal('ab');
        chai.expect(model.reports[0].fields.patient_name).to.equal(childPerson.name);
        chai.expect(model.reports[1]._id).to.equal('cd');
        chai.expect(model.reports[1].fields.patient_name).to.equal('Jack'); // don't add if name already defined
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

  describe('muting', () => {
    const runMutingTest = (doc, lineage) => {
      stubLineageModelGenerator(null, doc, lineage);
      stubDbGet(null, {});
      stubSearch(null, []);
      stubDbQueryChildren(null, doc._id, [], []);
      return service(doc._id);
    };

    it('should reflect self muted state when muted', () => {
      const doc = { _id: 'doc', muted: true };
      return runMutingTest(doc, []).then(result => {
        chai.expect(result.doc.muted).to.equal(true);
      });
    });

    it('should reflect self unmuted state when no lineage', () => {
      const doc = { _id: 'doc' };
      return runMutingTest(doc, []).then(result => {
        chai.expect(result.doc.muted).to.equal(false);
      });
    });

    it('should reflect self unmuted state when no muted lineage', () => {
      const doc = { _id: 'doc' },
            lineage = [{ _id: 'p1' }, { _id: 'p2' }];

      return runMutingTest(doc, lineage).then(result => {
        chai.expect(result.doc.muted).to.equal(false);
      });
    });

    it('should reflect muted in lineage state', () => {
      const doc = { _id: 'doc' },
            lineage = [{ _id: 'p1' }, { _id: 'p2', muted: true }, { _id: 'p3' }];

      return runMutingTest(doc, lineage).then(result => {
        chai.expect(result.doc.muted).to.equal(true);
      });
    });
  });

});
