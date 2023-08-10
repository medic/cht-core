import { TestBed } from '@angular/core/testing';
import { assert, expect } from 'chai';
import sinon from 'sinon';
import { TranslateService } from '@ngx-translate/core';

import { ContactViewModelGeneratorService } from '@mm-services/contact-view-model-generator.service';
import { SearchService } from '@mm-services/search.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { GetDataRecordsService } from '@mm-services/get-data-records.service';
import { DbService } from '@mm-services/db.service';

describe('ContactViewModelGenerator service', () => {
  let service: ContactViewModelGeneratorService;
  let lineageModelGenerator;
  let childContactPerson;
  let deceasedChildPerson;
  let childPerson;
  let childPerson2;
  let childPlace;
  let childPlace2;
  let dbGet;
  let dbQuery;
  let doc;
  let search;
  let getDataRecords;
  let forms;
  let contactTypesService;
  let types;

  const childPlaceIcon = 'fa-mushroom';

  const stubDbGet = (err, doc) => {
    if (err) {
      return dbGet.rejects(err);
    }
    if (dbGet.withArgs(doc._id)) {
      return dbGet.resolves(doc);
    }
    return () => ({ query: dbQuery });
  };

  const stubLineageModelGenerator = (contact, lineage?) => {
    return lineageModelGenerator.contact.resolves({
      _id: contact && contact._id,
      doc: contact,
      lineage: lineage
    });
  };

  const stubDbQueryChildren = (parentId, docs: any[] = []) => {
    docs = docs.map(doc => {
      return { doc: doc, id: doc._id };
    });
    dbQuery.resolves({ rows: docs });
  };

  const stubSearch = (reports) => {
    search.resolves(reports);
  };

  const stubGetDataRecords = (dataRecords) => {
    getDataRecords.resolves(dataRecords);
  };

  beforeEach(() => {
    search = sinon.stub();
    dbGet = sinon.stub();
    dbQuery = sinon.stub();
    getDataRecords = sinon.stub();
    types = [
      { id: 'family' },
      { id: 'person', sort_by_dob: true, icon: childPlaceIcon, person: true, parents: [ 'family', 'clinic' ] },
      { id: 'chp', person: true, parents: [ 'mushroom' ] },
      { id: 'red-herring' },
      { id: 'clinic', parents: [ 'mushroom' ] },
      { id: 'mushroom', name_key: 'label.mushroom' }
    ];
    lineageModelGenerator = { contact: sinon.stub() };
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

    contactTypesService = {
      getAll: sinon.stub().resolves(types),
      getTypeId: sinon.stub().callsFake(contact => contact.type === 'contact' ? contact.contact_type : contact.type),
      getTypeById: sinon.stub().callsFake((types, id) => types.find(type => type.id === id)),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: TranslateService, useValue: { instant: sinon.stub().returnsArg(0) } },
        { provide: SearchService, useValue: { search } },
        { provide: ContactTypesService, useValue: contactTypesService },
        { provide: LineageModelGeneratorService, useValue: lineageModelGenerator },
        { provide: GetDataRecordsService, useValue: { get: getDataRecords } },
        { provide: DbService, useValue: { get: () => ({ query: dbQuery, get: dbGet }) } },
      ]
    });

    service = TestBed.inject(ContactViewModelGeneratorService);
  });

  afterEach(() => {
    sinon.restore();
  });

  const waitForModelToLoad = (model) => {
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
  };

  describe('Place', () => {
    const runPlaceTest = (childrenArray) => {
      stubLineageModelGenerator(doc);
      stubDbGet(null, childContactPerson);
      stubSearch([]);
      stubGetDataRecords([]);
      stubDbQueryChildren(doc._id, childrenArray);

      return service.getContact(doc._id)
        .then(waitForModelToLoad);
    };

    it('model returns the correct keys', () => {
      return runPlaceTest([childContactPerson, childPlace]).then(model => {
        assert.equal(model.children[0].contacts.length, 1);
        expect(Object.keys(model)).to.have.members(
          ['_id', 'doc', 'lineage', 'type', 'isPrimaryContact', 'children', 'reports']
        );
        expect(Object.keys(model.doc)).to.have.members(
          ['_id', 'type', 'contact', 'muted']
        );
      });
    });

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

    it('should load external primary contact correctly', () => {
      return runPlaceTest([childPerson]).then(model => {
        assert.equal(model.children[0].contacts.length, 2);
        assert.equal(model.children[0].contacts[0].id, childContactPerson._id);
        assert.equal(model.children[0].contacts[0].isPrimaryContact, true);
        assert.equal(model.children[0].contacts[1].id, childPerson._id);
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
      stubLineageModelGenerator(doc);
      stubDbGet({ status: 404 }, childContactPerson);
      stubSearch([]);
      stubGetDataRecords([]);
      stubDbQueryChildren(doc._id, [childPerson]);
      return service.getContact(doc._id)
        .then(waitForModelToLoad)
        .then(model => {
          assert.equal(model.children[0].contacts.length, 1);
        });
    });

    it('if contact does not belong to place, it still gets displayed', () => {
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

    it('sets correct contact types', () => {
      doc.contact_type = 'whatever';
      childContactPerson.contact_type = 'something';
      childPlace.contact_type = 'otherthing';

      contactTypesService.getTypeId
        .withArgs(doc).returns('correct doc type')
        .withArgs(childContactPerson).returns('correct childContactPerson type')
        .withArgs(childPlace).returns('correct childPlace type');

      types.push(
        { id: 'correct doc type', parents: ['correct parent type'], person: false, },
        { id: 'correct childContactPerson type', parents: ['correct doc type'], person: true },
        { id: 'correct childPlace type', parents: ['correct doc type'], person: false },
      );
      contactTypesService.getAll.resolves(types);

      return runPlaceTest([childContactPerson, childPlace]).then(model => {
        expect(model.doc).to.deep.equal({ ...doc, muted: false });
        expect(model.type).to.deep.equal({ id: 'correct doc type', parents: ['correct parent type'], person: false });
        expect(model.children.length).to.equal(2);
        expect(model.children[0].type)
          .to.deep.equal({ id: 'correct childContactPerson type', parents: ['correct doc type'], person: true });
        expect(model.children[0].contacts)
          .to.deep.equal([{ isPrimaryContact: true, doc: childContactPerson, id: childContactPerson._id }]);

        expect(model.children[1].type)
          .to.deep.equal({ id: 'correct childPlace type', parents: ['correct doc type'], person: false });
        expect(model.children[1].contacts)
          .to.deep.equal([{ doc: childPlace, id: childPlace._id }]);

        expect(contactTypesService.getTypeId.callCount).to.deep.equal(3);
        expect(contactTypesService.getTypeId.args).to.deep.equal([[doc], [childContactPerson], [childPlace]]);
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
      stubLineageModelGenerator(childContactPerson, [ parentDoc ]);
      stubSearch([]);
      stubGetDataRecords([]);
      return service.getContact(childContactPerson._id);
    };

    describe('isPrimaryContact flag', () => {

      it('model returns the correct keys', () => {
        return runPersonTest(doc).then(model => {
          expect(Object.keys(model)).to.have.members(
            ['_id', 'doc', 'lineage', 'type', 'isPrimaryContact', ]
          );
          expect(Object.keys(model.doc)).to.have.members(
            ['_id', 'name', 'type', 'parent', 'muted']
          );
        });
      });

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
      stubLineageModelGenerator(doc);
      stubDbGet({ status: 404 }, childContactPerson);
      stubDbQueryChildren(doc._id, childrenArray);
      return service.getContact(doc._id);
    };

    it('sets the returned reports as selected', () => {
      stubSearch([ { _id: 'ab' } ]);
      stubGetDataRecords([]);
      return runReportsTest([])
        .then(waitForModelToLoad)
        .then(model => {
          expect(model.reports.length).to.equal(1);
          expect(model.reports[0]._id).to.equal('ab');
        });
    });

    it('sorts reports by reported_date', () => {
      const report1 = { _id: 'ab', reported_date: 123 };
      const report2 = { _id: 'cd', reported_date: 456 };
      stubSearch([ report1, report2 ]);
      stubGetDataRecords([]);
      return runReportsTest([])
        .then(waitForModelToLoad)
        .then(model => {
          expect(model.reports.length).to.equal(2);
          expect(model.reports[0]._id).to.equal(report2._id);
          expect(model.reports[1]._id).to.equal(report1._id);
        });
    });

    it('includes reports from children', () => {
      stubSearch([ { _id: 'ab' }, { _id: 'cd' } ]);
      stubGetDataRecords([]);
      return runReportsTest([childPerson, childPerson2, deceasedChildPerson])
        .then(waitForModelToLoad)
        .then(model => {
          expect(search.args[0][1].subjectIds)
            .to.have.members([ doc._id, childPerson._id, childPerson2._id, deceasedChildPerson._id ]);
          expect(search.callCount).to.equal(1);
          expect(model.reports.length).to.equal(2);
          expect(model.reports[0]._id).to.equal('ab');
          expect(model.reports[1]._id).to.equal('cd');
        });
    });

    it('adds patient name to reports', () => {
      childPerson.patient_id = '12345';
      const report1 = { _id: 'ab', fields: { patient_id: childPerson.patient_id } };
      const report2 = { _id: 'cd', fields: { patient_id: childPerson.patient_id, patient_name: 'Jack' } };
      stubSearch([ report1, report2 ]);
      stubGetDataRecords([]);
      return runReportsTest([childPerson, childPerson2])
        .then(waitForModelToLoad)
        .then(model => {
          expect(search.callCount).to.equal(1);
          expect(model.reports.length).to.equal(2);
          expect(model.reports[0]._id).to.equal('ab');
          expect(model.reports[0].fields.patient_name).to.equal(childPerson.name);
          expect(model.reports[1]._id).to.equal('cd');
          expect(model.reports[1].fields.patient_name).to.equal('Jack'); // don't add if name already defined
        });
    });

    it('sorts reports by reported_date, not by parent vs. child', () => {
      const expectedReports = [
        { _id: 'aa', reported_date: 123 },
        { _id: 'bb', reported_date: 345 }
      ];
      stubSearch([ expectedReports[0], expectedReports[1] ]);
      stubGetDataRecords([]);
      return runReportsTest([childPerson, childPerson2])
        .then(waitForModelToLoad)
        .then(model => {
          expect(search.callCount).to.equal(1);
          expect(search.args[0][1].subjectIds).to.have.members([ doc._id, childPerson._id, childPerson2._id ]);
          assert.deepEqual(model.reports, [ expectedReports[1], expectedReports[0]]);
        });
    });

    it('includes subjectIds in reports search so JSON reports are found', () => {
      doc.patient_id = 'cd';
      doc.place_id = 'ef';
      stubSearch([ { _id: 'ab' } ]);
      stubGetDataRecords([]);
      return runReportsTest([])
        .then(waitForModelToLoad)
        .then(() => {
          expect(search.callCount).to.equal(1);
          expect(search.args[0][0]).to.equal('reports');
          expect(search.args[0][1].subjectIds.length).to.equal(3);
          expect(search.args[0][1].subjectIds).to.include(doc._id);
          expect(search.args[0][1].subjectIds).to.include('cd');
          expect(search.args[0][1].subjectIds).to.include('ef');
        });
    });

    it('adds patient_name to reports', () => {
      childPerson.patient_id = '12345';
      const report = { _id: 'ab', fields: { patient_id: childPerson.patient_id } };
      stubSearch([ report ]);
      stubGetDataRecords([]);
      return runReportsTest([childPerson])
        .then(waitForModelToLoad)
        .then(model => {
          // search queried
          expect(search.callCount).to.equal(1);
          expect(search.args[0][0]).to.equal('reports');
          expect(search.args[0][1].subjectIds).to.include(doc._id);
          expect(search.args[0][1].subjectIds.length).to.equal(3);

          expect(model.reports.length).to.equal(1);
          expect(model.reports[0]._id).to.equal('ab');
          expect(model.reports[0].fields.patient_name).to.equal(childPerson.name);
        });
    });

    it('adds heading to reports', () => {
      const report = { _id: 'ab' };
      const dataRecord = { _id: 'ab', validSubject: 'ac', subject: { value: 'ad' } };
      stubSearch([ report ]);
      stubGetDataRecords([ dataRecord ]);
      return runReportsTest([])
        .then(waitForModelToLoad)
        .then(model => {
          expect(model.reports[0].heading).to.equal(dataRecord.subject.value);
        });
    });

    it('adds heading to reports using form subject_key if available', () => {
      const report = { _id: 'ab' };
      const dataRecord = { _id: 'ab', form: 'a', validSubject: 'ac', subject: { value: 'ad' } };
      forms = [ { code: 'a', subjectKey: 'some.key' } ];
      stubSearch([ report ]);
      stubGetDataRecords([ dataRecord ]);
      return runReportsTest([])
        .then(waitForModelToLoad)
        .then(model => {
          expect(model.reports[0].heading).to.equal('some.key');
        });
    });

    it('does not add heading to reports when there are no valid subject', () => {
      const report = { _id: 'ab' };
      const dataRecord = { _id: 'ab', subject: { value: 'ad' } };
      stubSearch([ report ]);
      stubGetDataRecords([ dataRecord ]);
      return runReportsTest([])
        .then(waitForModelToLoad)
        .then(model => {
          expect(model.reports[0].heading).to.equal('report.subject.unknown');
        });
    });

    it('does not add heading to reports when there are no valid subject value', () => {
      const report = { _id: 'ab' };
      const dataRecord = { _id: 'ab', validSubject: 'ac' };
      stubSearch([ report ]);
      stubGetDataRecords([ dataRecord ]);
      return runReportsTest([])
        .then(waitForModelToLoad)
        .then(model => {
          expect(model.reports[0].heading).to.equal('report.subject.unknown');
        });
    });

    it('does not add heading to reports when no data record is found', () => {
      const report = { _id: 'ab' };
      stubSearch([ report ]);
      stubGetDataRecords([ ]);
      return runReportsTest([])
        .then(waitForModelToLoad)
        .then(model => {
          expect(model.reports[0].heading).to.be.an('undefined');
        });
    });

    it('adds heading to reports when an array of data records is returned', () => {
      const report = { _id: 'a' };
      const dataRecordA = { _id: 'a', validSubject: 'avs', subject: { value: 'asv' } };
      const dataRecordB = { _id: 'b', validSubject: 'bvs', subject: { value: 'bsv' } };
      stubSearch([ report ]);
      stubGetDataRecords([ dataRecordB, dataRecordA ]);
      return runReportsTest([])
        .then(waitForModelToLoad)
        .then(model => {
          expect(model.reports[0].heading).to.equal(dataRecordA.subject.value);
        });
    });
  });

  describe('muting', () => {
    const runMutingTest = (doc, lineage) => {
      stubLineageModelGenerator(doc, lineage);
      stubDbGet(null, {});
      stubSearch([]);
      stubGetDataRecords([]);
      stubDbQueryChildren(doc._id, []);
      return service.getContact(doc._id);
    };

    it('should reflect self muted state when muted', () => {
      const doc = { _id: 'doc', muted: true, contact_type: 'family' };
      return runMutingTest(doc, []).then(result => {
        expect(result.doc.muted).to.equal(true);
      });
    });

    it('should reflect self unmuted state when no lineage', () => {
      const doc = { _id: 'doc', contact_type: 'family' };
      return runMutingTest(doc, []).then(result => {
        expect(result.doc.muted).to.equal(false);
      });
    });

    it('should reflect self unmuted state when no muted lineage', () => {
      const doc = { _id: 'doc', contact_type: 'family' };
      const lineage = [{ _id: 'p1' }, { _id: 'p2' }];

      return runMutingTest(doc, lineage).then(result => {
        expect(result.doc.muted).to.equal(false);
      });
    });

    it('should reflect muted in lineage state', () => {
      const doc = { _id: 'doc', contact_type: 'family' };
      const lineage = [{ _id: 'p1' }, { _id: 'p2', muted: true }, { _id: 'p3' }];

      return runMutingTest(doc, lineage).then(result => {
        expect(result.doc.muted).to.equal(true);
      });
    });
  });

});
