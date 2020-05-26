describe('ContactViewModelGenerator service', () => {

  'use strict';

  const assert = chai.assert;
  let service;
  let ContactTypes;
  let lineageModelGenerator;
  let childContactPerson;
  let deceasedChildPerson;
  let childPerson;
  let childPerson2;
  let childPlace;
  let childPlace2;
  let dbGet;
  let dbQuery;
  let dbAllDocs;
  let doc;
  let search;
  let GetDataRecords;
  let Session;
  let forms;

  const childPlaceIcon = 'fa-mushroom';

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

  const stubDbQueryChildren = (err, parentId, docs = []) => {
    docs = docs.map(doc => {
      return { doc: doc };
    });
    dbQuery.returns(KarmaUtils.promise(err, { rows: docs }));
  };

  const stubSearch = (err, reports) => {
    search.returns(KarmaUtils.promise(err, reports));
  };

  const stubGetDataRecords = (err, dataRecords) => {
    GetDataRecords.returns(KarmaUtils.promise(err, dataRecords));
  };

  beforeEach(() => {
    module('inboxApp');
    module($provide => {
      search = sinon.stub();
      dbGet = sinon.stub();
      dbQuery = sinon.stub();
      dbAllDocs = sinon.stub();
      const types = [
        { id: 'family' },
        { id: 'person', sort_by_dob: true, icon: childPlaceIcon, person: true, parents: [ 'family', 'clinic' ] },
        { id: 'chp', person: true, parents: [ 'mushroom' ] },
        { id: 'red-herring' },
        { id: 'clinic', parents: [ 'mushroom' ] },
        { id: 'mushroom', name_key: 'label.mushroom' }
      ];
      ContactTypes = { getAll: sinon.stub().resolves(types) };
      lineageModelGenerator = { contact: sinon.stub() };
      GetDataRecords = sinon.stub();
      Session = { isOnlineOnly: function() {} };

      $provide.factory('DB', KarmaUtils.mockDB({ get: dbGet, query: dbQuery, allDocs: dbAllDocs }));
      $provide.value('Search', search);
      $provide.value('ContactTypes', ContactTypes);
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('LineageModelGenerator', lineageModelGenerator);
      $provide.value('GetDataRecords', GetDataRecords);
      $provide.value('Session', Session);

      const parentId = 'districtsdistrict';
      const contactId = 'mario';
      childContactPerson = { _id: contactId, name: 'sandy', type: 'person', parent: { _id: parentId } };
      deceasedChildPerson = {
        _id: 'deceaseduuid',
        name: 'casper',
        type: 'person',
        date_of_death: 123456789,
        parent: { _id: parentId }
      };

      childPerson = { _id: 'peach', type: 'person', name: 'Peach', date_of_birth: '1986-01-01' };

      childPerson2 = { _id: 'zelda', type: 'person', name: 'Zelda', date_of_birth: '1985-01-01' };
      childPlace = { _id: 'happyplace', type: 'mushroom', name: 'Happy Place', contact: { _id: contactId } };
      childPlace2 = { _id: 'happyplace2', type: 'mushroom', name: 'Happy Place 2' };

      doc = {
        _id: parentId,
        type: 'clinic',
        contact: { _id: contactId }
      };
      forms = [];
    });
    inject(_ContactViewModelGenerator_ => service = _ContactViewModelGenerator_);
  });

  afterEach(function() {
    KarmaUtils.restore(GetDataRecords);
  });

  function waitForModelToLoad(model) {
    return service
      .loadChildren(model)
      .then(children => {
        model.children = children;
        return service.loadReports(model, forms);
      })
      .then(reports => {
        model.reports = reports;
        return model;
      });
  }

  describe('Place', () => {
    const runPlaceTest = (childrenArray) => {
      stubLineageModelGenerator(null, doc);
      stubDbGet(null, childContactPerson);
      stubSearch(null, []);
      stubGetDataRecords(null, []);
      stubDbQueryChildren(null, doc._id, childrenArray);
      return service.getContact(doc._id)
        .then(waitForModelToLoad);
    };

    it('child places and persons get displayed separately', () => {
      return runPlaceTest([childContactPerson, childPlace]).then(model => {
        assert.equal(model.children[0].contacts.length, 1);
        assert.deepEqual(model.children[0].contacts[0].doc, childContactPerson);
        assert.equal(model.children[1].contacts.length, 1);
        assert.deepEqual(model.children[1].contacts[0].doc, childPlace);
      });
    });

    it('if no child places, child persons get displayed', () => {
      return runPlaceTest([childContactPerson, childPerson]).then(model => {
        assert.equal(model.children[0].contacts.length, 2);
      });
    });

    it('if no child persons, child places get displayed', () => {
      delete doc.contact;
      return runPlaceTest([childPlace]).then(model => {
        assert.equal(model.children[0].contacts.length, 1);
        assert.deepEqual(model.children[0].contacts[0].doc, childPlace);
        assert.equal(model.children[0].type.name_key, 'label.mushroom');
      });
    });

    it('contact person gets displayed on top', () => {
      return runPlaceTest([childPerson, childContactPerson]).then(model => {
        assert.deepEqual(model.children[0].contacts[0].doc, childContactPerson);
        assert(model.children[0].contacts[0].isPrimaryContact, 'has isPrimaryContact flag');
      });
    });

    it('contact person loaded from children', () => {
      return runPlaceTest([childContactPerson]).then(model => {
        assert.equal(dbGet.callCount, 0);
        assert.equal(model.children[0].contacts.length, 1);
        const firstPerson = model.children[0].contacts[0];
        assert.deepEqual(firstPerson.doc, childContactPerson);
        assert(firstPerson.isPrimaryContact, 'has isPrimaryContact flag');
      });
    });

    it('if no contact in parent, persons still get displayed', () => {
      delete doc.contact;
      return runPlaceTest([childPerson, childContactPerson]).then(model => {
        assert.equal(model.children[0].contacts.length, 2);
      });
    });

    it('if no contact person in children, persons still get displayed', () => {
      stubLineageModelGenerator(null, doc);
      stubDbGet({ status: 404 }, childContactPerson);
      stubSearch(null, []);
      stubGetDataRecords(null, []);
      stubDbQueryChildren(null, doc._id, [childPerson]);
      return service.getContact(doc._id)
        .then(waitForModelToLoad)
        .then(model => {
          assert.equal(model.children[0].contacts.length, 1);
        });
    });

    it(`if contact doesn't belong to place, it still gets displayed`, () => {
      return runPlaceTest([]).then(model => {
        assert.equal(model.children[0].contacts.length, 1);
        assert.equal(model.children[0].contacts[0].doc._id, childContactPerson._id);
        assert.equal(model.children[0].contacts[0].isPrimaryContact, true);
      });
    });

    it('child places are sorted in alphabetical order', () => {
      return runPlaceTest([childPlace2, childPlace]).then(model => {
        assert.equal(model.children[1].contacts[0].doc._id, childPlace._id);
        assert.equal(model.children[1].contacts[1].doc._id, childPlace2._id);
      });
    });

    it('when selected doc is a clinic, child places are sorted in alphabetical order (like for other places)', () => {
      doc.type = 'clinic';
      return runPlaceTest([childPlace2, childPlace]).then(model => {
        assert.equal(model.children[1].contacts[0].doc._id, childPlace._id);
        assert.equal(model.children[1].contacts[1].doc._id, childPlace2._id);
      });
    });

    it('when selected contact type specifies sort_by_dob, child persons are sorted by age', () => {
      doc.type = 'clinic';
      return runPlaceTest([childPerson2, childPerson]).then(model => {
        assert.equal(model.children[0].contacts.length, 3);
        assert.equal(model.children[0].contacts[1].doc._id, childPerson2._id);
        assert.equal(model.children[0].contacts[2].doc._id, childPerson._id);
      });
    });

    it('deceased people are marked and counted', () => {
      return runPlaceTest([childContactPerson, deceasedChildPerson]).then(model => {
        assert.equal(model.children[0].contacts.length, 2);
        assert.deepEqual(model.children[0].contacts[0].doc, childContactPerson);
        assert.deepEqual(model.children[0].contacts[1].doc, deceasedChildPerson);
        assert.equal(model.children[0].contacts[1].deceased, true);
        assert.equal(model.children[0].deceasedCount, 1);
      });
    });

    describe('muted sorting', () => {
      it('when child type has sort_by_dob should sort muted persons on the bottom sorted by age', () => {
        doc.type = 'clinic';
        const childPerson1 = { _id: 'childPerson1', type: 'person', name: 'person 1', date_of_birth: '2000-01-01' };
        const childPerson2 = { _id: 'childPerson2', type: 'person', name: 'person 2', date_of_birth: '1999-01-01' };
        const mutedChildPerson1 =
          { _id: 'mutedChildPerson1', type: 'person', name: 'muted 1', date_of_birth: '2000-01-01', muted: 123 };
        const mutedChildPerson2 =
          { _id: 'mutedChildPerson2', type: 'person', name: 'muted 2', date_of_birth: '1999-01-01', muted: 124 };

        return runPlaceTest([childPerson1, mutedChildPerson2, mutedChildPerson1, childPerson2]).then(model => {
          assert.equal(model.children[0].contacts.length, 5);
          assert.equal(model.children[0].contacts[0].doc._id, childContactPerson._id); // primary contact on top

          assert.equal(model.children[0].contacts[1].doc._id, childPerson2._id);
          assert.equal(model.children[0].contacts[2].doc._id, childPerson1._id);
          assert.equal(model.children[0].contacts[3].doc._id, mutedChildPerson2._id);
          assert.equal(model.children[0].contacts[4].doc._id, mutedChildPerson1._id);
        });
      });

      it('when child type does not have sort_by_dob should sort muted persons on the bottom sorted by name', () => {
        doc.type = 'clinic';
        const childPerson1 = { _id: 'childPerson1', type: 'chp', name: 'person 1', date_of_birth: '2000-01-01' };
        const childPerson2 = { _id: 'childPerson2', type: 'chp', name: 'person 2', date_of_birth: '1999-01-01' };
        const mutedChildPerson1 =
          { _id: 'mutedChildPerson1', type: 'chp', name: 'muted 1', date_of_birth: '2000-01-01', muted: 123 };
        const mutedChildPerson2 =
          { _id: 'mutedChildPerson2', type: 'chp', name: 'muted 2', date_of_birth: '1999-01-01', muted: 124 };

        return runPlaceTest([mutedChildPerson2, mutedChildPerson1, childPerson2, childPerson1]).then(model => {
          assert.equal(model.children[0].contacts.length, 4);

          assert.equal(model.children[0].contacts[0].doc._id, childPerson1._id);
          assert.equal(model.children[0].contacts[1].doc._id, childPerson2._id);
          assert.equal(model.children[0].contacts[2].doc._id, mutedChildPerson1._id);
          assert.equal(model.children[0].contacts[3].doc._id, mutedChildPerson2._id);
        });
      });

      it('should sort muted places to the bottom, alphabetically', () => {
        doc.type = 'mushroom';
        const childPlace1 = { _id: 'childPlace1', type: 'clinic', name: 'place 1' };
        const childPlace2 = { _id: 'childPlace2', type: 'clinic', name: 'place 2' };
        const mutedChildPlace1 = { _id: 'mutedChildPlace1', type: 'clinic', name: 'muted 1', muted: 123 };
        const mutedChildPlace2 = { _id: 'mutedChildPlace2', type: 'clinic', name: 'muted 2', muted: 124 };

        return runPlaceTest([mutedChildPlace2, mutedChildPlace1, childPlace2, childPlace1]).then(model => {
          assert.equal(model.children[1].contacts.length, 4);
          assert.equal(model.children[1].contacts[0].doc._id, childPlace1._id);
          assert.equal(model.children[1].contacts[1].doc._id, childPlace2._id);
          assert.equal(model.children[1].contacts[2].doc._id, mutedChildPlace1._id);
          assert.equal(model.children[1].contacts[3].doc._id, mutedChildPlace2._id);
        });
      });

      it('should propagate muted state to not yet muted children and sort correctly', () => {
        doc.type = 'mushroom';
        doc.muted = 123456;
        const childPerson1 = { _id: 'childPerson1', type: 'chp', name: 'person 1', date_of_birth: '2000-01-01' };
        const childPerson2 = { _id: 'childPerson2', type: 'chp', name: 'person 2', date_of_birth: '1999-01-01' };
        const mutedChildPerson1 =
          { _id: 'mutedChildPerson1', type: 'chp', name: 'muted 1', date_of_birth: '2000-01-01', muted: 123 };
        const mutedChildPerson2 =
          { _id: 'mutedChildPerson2', type: 'chp', name: 'muted 2', date_of_birth: '1999-01-01', muted: 124 };
        const childPlace1 = { _id: 'childPlace1', type: 'clinic', name: 'place 1' };
        const childPlace2 = { _id: 'childPlace2', type: 'clinic', name: 'place 2' };
        const mutedChildPlace1 = { _id: 'mutedChildPlace1', type: 'clinic', name: 'muted 1', muted: 123 };
        const mutedChildPlace2 = { _id: 'mutedChildPlace2', type: 'clinic', name: 'muted 2', muted: 124 };

        const children = [
          childPerson2, childPerson1, mutedChildPerson2, mutedChildPerson1,
          childPlace2, childPlace1, mutedChildPlace2, mutedChildPlace1
        ];

        return runPlaceTest(children).then(model => {
          assert.equal(model.children[0].contacts.length, 4);
          assert.equal(model.children[0].contacts[0].doc._id, mutedChildPerson1._id);
          assert.equal(model.children[0].contacts[1].doc._id, mutedChildPerson2._id);
          assert.equal(model.children[0].contacts[2].doc._id, childPerson1._id);
          assert.equal(model.children[0].contacts[3].doc._id, childPerson2._id);

          assert.equal(model.children[2].contacts.length, 4);
          assert.equal(model.children[2].contacts[0].doc._id, mutedChildPlace1._id);
          assert.equal(model.children[2].contacts[1].doc._id, mutedChildPlace2._id);
          assert.equal(model.children[2].contacts[2].doc._id, childPlace1._id);
          assert.equal(model.children[2].contacts[3].doc._id, childPlace2._id);
        });
      });
    });

  });

  describe('Person', () => {
    const runPersonTest = parentDoc => {
      stubLineageModelGenerator(null, childContactPerson, [ parentDoc ]);
      stubSearch(null, []);
      stubGetDataRecords(null, []);
      return service.getContact(childContactPerson._id);
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
      return service.getContact(doc._id);
    };

    it('sets the returned reports as selected', () => {
      sinon.stub(Session, 'isOnlineOnly').returns(true);
      stubSearch(null, [ { _id: 'ab' } ]);
      stubGetDataRecords(null, []);
      return runReportsTest([])
        .then(waitForModelToLoad)
        .then(model => {
          chai.expect(model.reports.length).to.equal(1);
          chai.expect(model.reports[0]._id).to.equal('ab');
        });
    });

    it('sorts reports by reported_date', () => {
      const report1 = { _id: 'ab', reported_date: 123 };
      const report2 = { _id: 'cd', reported_date: 456 };
      stubSearch(null, [ report1, report2 ]);
      stubGetDataRecords(null, []);
      return runReportsTest([])
        .then(waitForModelToLoad)
        .then(model => {
          chai.expect(model.reports.length).to.equal(2);
          chai.expect(model.reports[0]._id).to.equal(report2._id);
          chai.expect(model.reports[1]._id).to.equal(report1._id);
        });
    });

    it('includes reports from children', () => {
      stubSearch(null, [ { _id: 'ab' },{ _id: 'cd' } ]);
      stubGetDataRecords(null, []);
      return runReportsTest([childPerson, childPerson2, deceasedChildPerson])
        .then(waitForModelToLoad)
        .then(model => {
          chai.expect(search.args[0][1].subjectIds)
            .to.have.members([ doc._id, childPerson._id, childPerson2._id, deceasedChildPerson._id ]);
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
      stubGetDataRecords(null, []);
      return runReportsTest([childPerson, childPerson2])
        .then(waitForModelToLoad)
        .then(model => {
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
      stubGetDataRecords(null, []);
      return runReportsTest([childPerson, childPerson2])
        .then(waitForModelToLoad)
        .then(model => {
          chai.expect(search.callCount).to.equal(1);
          chai.expect(search.args[0][1].subjectIds).to.have.members([ doc._id, childPerson._id, childPerson2._id ]);
          chai.assert.deepEqual(model.reports, [ expectedReports[1], expectedReports[0]]);
        });
    });

    it('includes subjectIds in reports search so JSON reports are found', () => {
      doc.patient_id = 'cd';
      doc.place_id = 'ef';
      stubSearch(null, [ { _id: 'ab' } ]);
      stubGetDataRecords(null, []);
      return runReportsTest([])
        .then(waitForModelToLoad)
        .then(() => {
          chai.expect(search.callCount).to.equal(1);
          chai.expect(search.args[0][0]).to.equal('reports');
          chai.expect(search.args[0][1].subjectIds.length).to.equal(3);
          chai.expect(search.args[0][1].subjectIds).to.include(doc._id);
          chai.expect(search.args[0][1].subjectIds).to.include('cd');
          chai.expect(search.args[0][1].subjectIds).to.include('ef');
        });
    });

    it('adds patient_name to reports', () => {
      childPerson.patient_id = '12345';
      const report = { _id: 'ab', fields: { patient_id: childPerson.patient_id } };
      stubSearch(null, [ report ]);
      stubGetDataRecords(null, []);
      return runReportsTest([childPerson])
        .then(waitForModelToLoad)
        .then(model => {
          // search queried
          chai.expect(search.callCount).to.equal(1);
          chai.expect(search.args[0][0]).to.equal('reports');
          chai.expect(search.args[0][1].subjectIds).to.include(doc._id);
          chai.expect(search.args[0][1].subjectIds.length).to.equal(3);

          chai.expect(model.reports.length).to.equal(1);
          chai.expect(model.reports[0]._id).to.equal('ab');
          chai.expect(model.reports[0].fields.patient_name).to.equal(childPerson.name);
        });
    });

    it('adds heading to reports', () => {
      const report = { _id: 'ab' };
      const dataRecord = { _id: 'ab', validSubject: 'ac', subject: { value: 'ad' } };
      stubSearch(null, [ report ]);
      stubGetDataRecords(null, [ dataRecord ]);
      return runReportsTest([])
        .then(waitForModelToLoad)
        .then(model => {
          chai.expect(model.reports[0].heading).to.equal(dataRecord.subject.value);
        });
    });

    it('adds heading to reports using form subject_key if available', () => {
      const report = { _id: 'ab' };
      const dataRecord = { _id: 'ab', form: 'a', validSubject: 'ac', subject: { value: 'ad' } };
      forms = [ { code: 'a', subjectKey: 'some.key' } ];
      stubSearch(null, [ report ]);
      stubGetDataRecords(null, [ dataRecord ]);
      return runReportsTest([])
        .then(waitForModelToLoad)
        .then(model => {
          chai.expect(model.reports[0].heading).to.equal('some.key');
        });
    });

    it('does not add heading to reports when there are no valid subject', () => {
      const report = { _id: 'ab' };
      const dataRecord = { _id: 'ab', subject: { value: 'ad' } };
      stubSearch(null, [ report ]);
      stubGetDataRecords(null, [ dataRecord ]);
      return runReportsTest([])
        .then(waitForModelToLoad)
        .then(model => {
          chai.expect(model.reports[0].heading).to.equal('report.subject.unknown');
        });
    });

    it('does not add heading to reports when there are no valid subject value', () => {
      const report = { _id: 'ab' };
      const dataRecord = { _id: 'ab', validSubject: 'ac' };
      stubSearch(null, [ report ]);
      stubGetDataRecords(null, [ dataRecord ]);
      return runReportsTest([])
        .then(waitForModelToLoad)
        .then(model => {
          chai.expect(model.reports[0].heading).to.equal('report.subject.unknown');
        });
    });

    it('does not add heading to reports when no data record is found', () => {
      const report = { _id: 'ab' };
      stubSearch(null, [ report ]);
      stubGetDataRecords(null, [ ]);
      return runReportsTest([])
        .then(waitForModelToLoad)
        .then(model => {
          chai.expect(model.reports[0].heading).to.be.an('undefined');
        });
    });

    it('adds heading to reports when an array of data records is returned', () => {
      const report = { _id: 'a' };
      const dataRecordA = { _id: 'a', validSubject: 'avs', subject: { value: 'asv' } };
      const dataRecordB = { _id: 'b', validSubject: 'bvs', subject: { value: 'bsv' } };
      stubSearch(null, [ report ]);
      stubGetDataRecords(null, [ dataRecordB, dataRecordA ]);
      return runReportsTest([])
        .then(waitForModelToLoad)
        .then(model => {
          chai.expect(model.reports[0].heading).to.equal(dataRecordA.subject.value);
        });
    });
  });

  describe('muting', () => {
    const runMutingTest = (doc, lineage) => {
      stubLineageModelGenerator(null, doc, lineage);
      stubDbGet(null, {});
      stubSearch(null, []);
      stubGetDataRecords(null, []);
      stubDbQueryChildren(null, doc._id, []);
      return service.getContact(doc._id);
    };

    it('should reflect self muted state when muted', () => {
      const doc = { _id: 'doc', muted: true, contact_type: 'family' };
      return runMutingTest(doc, []).then(result => {
        chai.expect(result.doc.muted).to.equal(true);
      });
    });

    it('should reflect self unmuted state when no lineage', () => {
      const doc = { _id: 'doc', contact_type: 'family' };
      return runMutingTest(doc, []).then(result => {
        chai.expect(result.doc.muted).to.equal(false);
      });
    });

    it('should reflect self unmuted state when no muted lineage', () => {
      const doc = { _id: 'doc', contact_type: 'family' };
      const lineage = [{ _id: 'p1' }, { _id: 'p2' }];

      return runMutingTest(doc, lineage).then(result => {
        chai.expect(result.doc.muted).to.equal(false);
      });
    });

    it('should reflect muted in lineage state', () => {
      const doc = { _id: 'doc', contact_type: 'family' };
      const lineage = [{ _id: 'p1' }, { _id: 'p2', muted: true }, { _id: 'p3' }];

      return runMutingTest(doc, lineage).then(result => {
        chai.expect(result.doc.muted).to.equal(true);
      });
    });
  });

});
