import { expect } from 'chai';
import * as Lineage from '../../../src/local/libs/lineage';
import sinon, { SinonStub } from 'sinon';
import * as LocalDoc from '../../../src/local/libs/doc';
import { Doc } from '../../../src/libs/doc';
import logger from '@medic/logger';
import * as Core from '../../../src/libs/core';
import { InvalidArgumentError, NonEmptyArray, Nullable } from '../../../src';
import * as LocalContact from '../../../src/local/contact';
import contactTypeUtils from '@medic/contact-types-utils';
import { SettingsService } from '../../../src/local/libs/data-context';
import * as Input from '../../../src/input';
import * as Report from '../../../src/report';

describe('local lineage lib', () => {
  let debug: SinonStub;
  let medicGet: SinonStub;
  let medicDb: PouchDB.Database<Doc>;

  beforeEach(() => {
    debug = sinon.stub(logger, 'debug');
    medicGet = sinon.stub();
    medicDb = {
      query: sinon.stub().resolves({ rows: [] }),
      get: medicGet
    } as unknown as PouchDB.Database<Doc>;
  });
  afterEach(() => sinon.restore());

  it('getLineageDocsById', async () => {
    const uuid = '123';
    const queryFn = sinon.stub().resolves([]);
    const queryDocsByRange = sinon
      .stub(LocalDoc, 'queryDocsByRange')
      .returns(queryFn);
    const medicDb = { hello: 'world' } as unknown as PouchDB.Database<Doc>;

    const fn = Lineage.getLineageDocsById(medicDb);
    const result = await fn(uuid);

    expect(result).to.deep.equal([]);
    expect(queryDocsByRange.calledOnceWithExactly(medicDb, 'medic-client/docs_by_id_lineage')).to.be.true;
    expect(queryFn.calledOnceWithExactly([uuid], [uuid, {}])).to.be.true;
  });

  describe('getPrimaryContactIds', () => {
    it('returns the primary contact ids', () => {
      const place0 = { _id: 'place-0', _rev: 'rev-1', contact: { _id: 'contact-0' } };
      const place1 = { _id: 'place-1', _rev: 'rev-2', contact: { _id: 'contact-1' } };
      const place2 = { _id: 'place-2', _rev: 'rev-3', contact: { _id: 'contact-2' } };

      const result = Lineage.getPrimaryContactIds([place0, place1, place2]);

      expect(result).to.deep.equal([place0.contact._id, place1.contact._id, place2.contact._id]);
    });

    [
      null,
      { _id: 'place-0', _rev: 'rev-1' },
      { _id: 'place-0', _rev: 'rev-1', contact: { hello: 'contact-0' } },
      { _id: 'place-0', _rev: 'rev-1', contact: { _id: '' } }
    ].forEach((place) => {
      it(`returns nothing for ${JSON.stringify(place)}`, () => {
        const result = Lineage.getPrimaryContactIds([place]);
        expect(result).to.be.empty;
      });
    });
  });

  describe('hydratePrimaryContact', () => {
    it('returns a place with its contact hydrated', () => {
      const contact = { _id: 'contact-0', _rev: 'rev-0', type: 'person' };
      const contacts = [{ _id: 'contact-1', _rev: 'rev-1', type: 'person' }, contact];
      const place0 = { _id: 'place-0', _rev: 'rev-1', contact: { _id: 'contact-0' } };

      const result = Lineage.hydratePrimaryContact(contacts)(place0);

      expect(result).to.deep.equal({ ...place0, contact });
      expect(debug.notCalled).to.be.true;
    });

    it('returns a place unchanged if no contacts are provided', () => {
      const place0 = { _id: 'place-0', _rev: 'rev-1', contact: { _id: 'contact-0' } };

      const result = Lineage.hydratePrimaryContact([])(place0);

      expect(result).to.equal(place0);
      expect(debug.calledOnceWithExactly(
        `No contact found with identifier [${place0.contact._id}] for the place [${place0._id}].`
      )).to.be.true;
    });

    it('returns a place unchanged if no matching contact could be found', () => {
      const contacts = [
        { _id: 'contact-1', _rev: 'rev-1', type: 'person' },
        { _id: 'contact-2', _rev: 'rev-0', type: 'person' }
      ];
      const place0 = { _id: 'place-0', _rev: 'rev-1', contact: { _id: 'contact-0' } };

      const result = Lineage.hydratePrimaryContact(contacts)(place0);

      expect(result).to.equal(place0);
      expect(debug.calledOnceWithExactly(
        `No contact found with identifier [${place0.contact._id}] for the place [${place0._id}].`
      )).to.be.true;
    });

    it('returns a place unchanged if its contact is not identifiable', () => {
      const contacts = [
        { _id: 'contact-1', _rev: 'rev-1', type: 'person' },
        { _id: 'contact-2', _rev: 'rev-0', type: 'person' }
      ];
      const place0 = { _id: 'place-0', _rev: 'rev-1', contact: { hello: 'contact-1' } };

      const result = Lineage.hydratePrimaryContact(contacts)(place0);

      expect(result).to.equal(place0);
      expect(debug.notCalled).to.be.true;
    });

    it('returns null if no place is provided', () => {
      const contacts = [
        { _id: 'contact-1', _rev: 'rev-1', type: 'person' },
        { _id: 'contact-2', _rev: 'rev-0', type: 'person' }
      ];

      const result = Lineage.hydratePrimaryContact(contacts)(null);

      expect(result).to.be.null;
      expect(debug.notCalled).to.be.true;
    });
  });

  describe('hydrateLineage', () => {
    it('returns a contact with its lineage populated', () => {
      const contact = { _id: 'contact-0', _rev: 'rev-0', type: 'person' };
      const place0 = { _id: 'place-0', _rev: 'rev-1' };
      const place1 = { _id: 'place-1', _rev: 'rev-2' };
      const place2 = { _id: 'place-2', _rev: 'rev-3' };
      const places = [place0, place1, place2];

      const result = Lineage.hydrateLineage(contact, places);

      expect(result).to.deep.equal({
        ...contact,
        parent: {
          ...place0,
          parent: {
            ...place1,
            parent: place2
          }
        }
      });
      expect(debug.notCalled).to.be.true;
    });

    it('fills in missing lineage gaps from contact\'s denormalized parent data', () => {
      const contact = {
        _id: 'contact-0', _rev: 'rev-0', type: 'person', parent: {
          _id: 'place-0',
          parent: {
            _id: 'place-1',
            parent: {
              _id: 'place-2'
            }
          }
        }
      };
      const place0 = { _id: 'place-0', _rev: 'rev-1' };
      const place1 = null;
      const place2 = { _id: 'place-2', _rev: 'rev-3' };
      const places = [place0, place1, place2, null];

      const result = Lineage.hydrateLineage(contact, places);

      expect(result).to.deep.equal({
        ...contact,
        parent: {
          ...place0,
          parent: {
            _id: 'place-1',
            parent: {
              ...place2,
              parent: {
                _id: null
              }
            }
          }
        }
      });
      expect(debug.calledTwice).to.be.true;
      expect(debug.firstCall.calledWithExactly(
        `Lineage place with identifier [place-1] was not found when getting lineage for [${contact._id}].`
      )).to.be.true;
      expect(debug.secondCall.calledWithExactly(
        `Lineage place with identifier [] was not found when getting lineage for [${contact._id}].`
      )).to.be.true;
    });
  });

  describe('getContactLineage', () => {
    const medicDb = { hello: 'world' } as unknown as PouchDB.Database<Doc>;
    let getDocsByIdsInner: SinonStub;
    let getDocsByIdsOuter: SinonStub;
    let getPrimaryContactIds: SinonStub;
    let hydratePrimaryContactInner: SinonStub;
    let hydratePrimaryContactOuter: SinonStub;
    let hydrateLineage: SinonStub;
    let deepCopy: SinonStub;

    beforeEach(() => {
      getDocsByIdsInner = sinon.stub();
      getDocsByIdsOuter = sinon
        .stub(LocalDoc, 'getDocsByIds')
        .returns(getDocsByIdsInner);
      getPrimaryContactIds = sinon.stub(Lineage, 'getPrimaryContactIds');
      hydratePrimaryContactInner = sinon.stub();
      hydratePrimaryContactOuter = sinon
        .stub(Lineage, 'hydratePrimaryContact')
        .returns(hydratePrimaryContactInner);
      hydrateLineage = sinon.stub(Lineage, 'hydrateLineage');
      deepCopy = sinon.stub(Core, 'deepCopy');
    });

    afterEach(() => {
      sinon.restore();
    });

    it('returns a contact with lineage for no person', async () => {
      const place0 = { _id: 'place0', _rev: 'rev' };
      const place1 = { _id: 'place1', _rev: 'rev' };
      const place2 = { _id: 'place2', _rev: 'rev' };
      const contact0 = { _id: 'contact0', _rev: 'rev' };
      const contact1 = { _id: 'contact1', _rev: 'rev' };
      const lineageContacts = [place0, place1, place2];

      getPrimaryContactIds.returns([contact0._id, contact1._id]);
      getDocsByIdsInner.resolves([contact0, contact1]);
      const place0WithContact = { ...place0, contact: contact0 };
      const place1WithContact = { ...place1, contact: contact1 };
      hydratePrimaryContactInner.withArgs(place0).returns(place0WithContact);
      hydratePrimaryContactInner.withArgs(place1).returns(place1WithContact);
      hydratePrimaryContactInner.withArgs(place2).returns(place2);
      const contactWithLineage = { ...place0, lineage: true };
      hydrateLineage.returns(contactWithLineage);
      const copiedContact = { ...contactWithLineage };
      deepCopy.returns(copiedContact);

      const result = await Lineage.getContactLineage(medicDb)(lineageContacts as NonEmptyArray<Nullable<Doc>>);

      expect(result).to.equal(copiedContact);
      expect(getPrimaryContactIds.calledOnceWithExactly(lineageContacts)).to.be.true;
      expect(getDocsByIdsOuter.calledOnceWithExactly(medicDb)).to.be.true;
      expect(getDocsByIdsInner.calledOnceWithExactly([contact0._id, contact1._id])).to.be.true;
      expect(hydratePrimaryContactOuter.calledOnceWithExactly([contact0, contact1])).to.be.true;
      expect(hydratePrimaryContactInner.callCount).to.be.equal(3);
      expect(hydratePrimaryContactInner.calledWith(place0)).to.be.true;
      expect(hydratePrimaryContactInner.calledWith(place1)).to.be.true;
      expect(hydratePrimaryContactInner.calledWith(place2)).to.be.true;
      expect(hydrateLineage.calledOnceWithExactly(place0WithContact, [place1WithContact, place2])).to.be.true;
      expect(deepCopy.calledOnceWithExactly(contactWithLineage)).to.be.true;
    });

    it('deduplicates contact UUIDs before fetching', async () => {
      const place0 = { _id: 'place0', _rev: 'rev' };
      const place1 = { _id: 'place1', _rev: 'rev' };
      const contact0 = { _id: 'contact0', _rev: 'rev' };
      const lineageContacts = [place0, place1];

      // Same contact ID appears multiple times
      getPrimaryContactIds.returns([contact0._id, contact0._id, contact0._id]);
      getDocsByIdsInner.resolves([contact0]);
      hydratePrimaryContactInner.returnsArg(0);
      hydrateLineage.returnsArg(0);
      deepCopy.returnsArg(0);

      await Lineage.getContactLineage(medicDb)(lineageContacts as NonEmptyArray<Nullable<Doc>>);

      // Should only fetch each unique ID once
      expect(getDocsByIdsInner.calledOnceWithExactly([contact0._id])).to.be.true;
    });

    it('filters out null docs from fetched contacts', async () => {
      const place0 = { _id: 'place0', _rev: 'rev' };
      const place1 = { _id: 'place1', _rev: 'rev' };
      const contact0 = { _id: 'contact0', _rev: 'rev' };
      const lineageContacts = [place0, place1];

      getPrimaryContactIds.returns([contact0._id, 'missing-contact']);
      // Returns null for missing contact
      getDocsByIdsInner.resolves([contact0, null]);
      hydratePrimaryContactInner.returnsArg(0);
      hydrateLineage.returnsArg(0);
      deepCopy.returnsArg(0);

      await Lineage.getContactLineage(medicDb)(lineageContacts as NonEmptyArray<Nullable<Doc>>);

      // Only non-null contacts should be passed to hydratePrimaryContact
      expect(hydratePrimaryContactOuter.calledOnceWithExactly([contact0])).to.be.true;
    });

    it('returns a contact with lineage for a person', async () => {
      const person = { type: 'person', _id: 'uuid', _rev: 'rev' };
      const place0 = { _id: 'place0', _rev: 'rev' };
      const place1 = { _id: 'place1', _rev: 'rev' };
      const place2 = { _id: 'place2', _rev: 'rev' };
      const contact0 = { _id: 'contact0', _rev: 'rev' };
      const contact1 = { _id: 'contact1', _rev: 'rev' };
      const lineageContacts = [place0, place1, place2];

      getPrimaryContactIds.returns([contact0._id, contact1._id, person._id]);
      getDocsByIdsInner.resolves([contact0, contact1]);
      const place0WithContact = { ...place0, contact: contact0 };
      const place1WithContact = { ...place1, contact: contact1 };
      hydratePrimaryContactInner.withArgs(place0).returns(place0WithContact);
      hydratePrimaryContactInner.withArgs(place1).returns(place1WithContact);
      hydratePrimaryContactInner.withArgs(place2).returns(place2);
      const personWithLineage = { ...person, lineage: true };
      hydrateLineage.returns(personWithLineage);
      const copiedPerson = { ...personWithLineage };
      deepCopy.returns(copiedPerson);

      const result = await Lineage.getContactLineage(medicDb)(
        lineageContacts as NonEmptyArray<Nullable<Doc>>, person
      );

      expect(result).to.equal(copiedPerson);
      expect(getPrimaryContactIds.calledOnceWithExactly(lineageContacts)).to.be.true;
      expect(getDocsByIdsOuter.calledOnceWithExactly(medicDb)).to.be.true;
      expect(getDocsByIdsInner.calledOnceWithExactly([contact0._id, contact1._id])).to.be.true;
      expect(hydratePrimaryContactOuter.calledOnceWithExactly([person, contact0, contact1])).to.be.true;
      expect(hydratePrimaryContactInner.callCount).to.be.equal(3);
      expect(hydratePrimaryContactInner.calledWith(place0)).to.be.true;
      expect(hydratePrimaryContactInner.calledWith(place1)).to.be.true;
      expect(hydratePrimaryContactInner.calledWith(place2)).to.be.true;
      expect(hydrateLineage.calledOnceWithExactly(person, [place0WithContact, place1WithContact, place2])).to.be.true;
      expect(deepCopy.calledOnceWithExactly(personWithLineage)).to.be.true;
    });
  });

  describe('fetchHydratedDoc', () => {
    it('returns the result from shared-libs/lineage', async () => {
      const doc = { _id: '123', _rev: 'rev-1', type: 'data_record', form: 'test_form' };
      medicGet.resolves(doc);

      const result = await Lineage.fetchHydratedDoc(medicDb)(doc._id);

      expect(result).to.equal(doc);
    });

    it('returns null when no doc is found', async () => {
      const error = { status: 404 };
      medicGet.rejects(error);

      const result = await Lineage.fetchHydratedDoc(medicDb)('not-found');

      expect(result).to.be.null;
    });

    it('throws error if there is a problem calling shared-libs/lineage', async () => {
      const error = { message: 'some error' };
      medicGet.rejects(error);
      const fetchHydratedMedicDoc = Lineage.fetchHydratedDoc(medicDb);

      await expect(fetchHydratedMedicDoc('not-found')).to.be.rejectedWith(error.message);
    });
  });

  describe('minifyDoc', () => {
    const minified = {
      _id: 'doc-1',
      _rev: 'rev-1',
      type: 'data_record',
      parent: { _id: 'parent-1' }
    };
    const doc = {
      ...minified,
      parent: { _id: 'parent-1', _rev: 'rev-2', name: 'Parent' }
    };
    it('returns a minified copy of the document', () => {
      const result = Lineage.minifyDoc(medicDb)(doc);
      expect(result).to.deep.equal(minified);
    });
  });

  describe('minifyLineage', () => {
    const minified = {
      _id: 'doc-1',
      parent: { _id: 'parent-1' }
    };
    const doc = {
      ...minified,
      _rev: 'rev-1',
      type: 'data_record',
      parent: { _id: 'parent-1', _rev: 'rev-2', name: 'Parent' }
    };
    it('returns minified lineage', () => {
      const result = Lineage.minifyLineage(medicDb)(doc);
      expect(result).to.deep.equal(minified);
    });
  });

  describe('assertSameParentLineage', () => {
    it('does not throw when parent lineages match', () => {
      const a = { _id: 'a', parent: { _id: 'parent-1', parent: { _id: 'grandparent-1' } } };
      const b = { _id: 'b', parent: { _id: 'parent-1', parent: { _id: 'grandparent-1' } } };

      expect(() => Lineage.assertSameParentLineage(a, b)).to.not.throw();
    });

    it('throws InvalidArgumentError when parent lineages do not match', () => {
      const a = { _id: 'a', parent: { _id: 'parent-1' } };
      const b = { _id: 'b', parent: { _id: 'parent-2' } };

      expect(() => Lineage.assertSameParentLineage(a, b))
        .to.throw(InvalidArgumentError, 'Parent lineage does not match.');
    });

    it('does not throw when both have no parent', () => {
      const a = { _id: 'a' };
      const b = { _id: 'b' };

      expect(() => Lineage.assertSameParentLineage(a, b)).to.not.throw();
    });

    it('throws when one has a parent and the other does not', () => {
      const a = { _id: 'a', parent: { _id: 'parent-1' } };
      const b = { _id: 'b' };

      expect(() => Lineage.assertSameParentLineage(a, b))
        .to.throw(InvalidArgumentError, 'Parent lineage does not match.');
    });

    it('throws when nested parent lineages do not match', () => {
      const a = { _id: 'a', parent: { _id: 'parent-1', parent: { _id: 'grandparent-1' } } };
      const b = { _id: 'b', parent: { _id: 'parent-1', parent: { _id: 'grandparent-2' } } };

      expect(() => Lineage.assertSameParentLineage(a, b))
        .to.throw(InvalidArgumentError, 'Parent lineage does not match.');
    });
  });

  describe('getContactIdForUpdate', () => {
    it('returns the string when contact is a string', () => {
      const updated = { _id: 'report-1', _rev: 'rev-1', type: 'data_record', form: 'test', contact: 'contact-123' };

      const result = Lineage.getContactIdForUpdate(updated);

      expect(result).to.equal('contact-123');
    });

    it('returns the _id when contact is an object', () => {
      const updated = {
        _id: 'report-1',
        _rev: 'rev-1',
        type: 'data_record',
        form: 'test',
        contact: { _id: 'contact-456', parent: { _id: 'parent-1' } }
      };

      const result = Lineage.getContactIdForUpdate(updated);

      expect(result).to.equal('contact-456');
    });

    it('returns undefined when contact is undefined', () => {
      const updated = { _id: 'report-1', _rev: 'rev-1', type: 'data_record', form: 'test' };

      const result = Lineage.getContactIdForUpdate(updated);

      expect(result).to.be.undefined;
    });
  });

  describe('assertHasValidParentType', () => {
    let getTypeId: SinonStub;
    let isParentOf: SinonStub;

    beforeEach(() => {
      getTypeId = sinon.stub(contactTypeUtils, 'getTypeId');
      isParentOf = sinon.stub(contactTypeUtils, 'isParentOf');
    });

    it('does not throw when parent type is valid', () => {
      const childType = { id: 'health_center' };
      const parent = { _id: 'parent-1', _rev: 'rev-1', type: 'district_hospital' };
      getTypeId.returns('district_hospital');
      isParentOf.returns(true);

      expect(() => Lineage.assertHasValidParentType(childType, parent)).to.not.throw();
      expect(getTypeId.calledOnceWithExactly(parent)).to.be.true;
      expect(isParentOf.calledOnceWithExactly('district_hospital', childType)).to.be.true;
    });

    it('throws InvalidArgumentError when parent type is not valid', () => {
      const childType = { id: 'health_center' };
      const parent = { _id: 'parent-1', _rev: 'rev-1', type: 'clinic' };
      getTypeId.returns('clinic');
      isParentOf.returns(false);

      expect(() => Lineage.assertHasValidParentType(childType, parent))
        .to.throw(InvalidArgumentError, 'Parent contact of type [clinic] is not allowed for type [health_center].');
    });
  });

  describe('getUpdatedContact', () => {
    const doc = { _id: 'report-1', _rev: 'rev-1', type: 'data_record', form: 'test' } as const;

    let isContact: SinonStub;
    let minifyLineageInner: SinonStub;
    let minifyLineageOuter: SinonStub;
    const settings = {} as SettingsService;

    beforeEach(() => {
      isContact = sinon.stub(LocalContact.v1, 'isContact');
      minifyLineageInner = sinon.stub();
      minifyLineageOuter = sinon.stub(Lineage, 'minifyLineage').returns(minifyLineageInner);
    });

    it('returns undefined when updated.contact is not set', () => {
      const result = Lineage.getUpdatedContact(settings, medicDb)(doc, { ...doc }, null);

      expect(result).to.be.undefined;
      expect(isContact.notCalled).to.be.true;
      expect(minifyLineageOuter.calledOnceWithExactly(medicDb)).to.be.true;
      expect(minifyLineageInner.notCalled).to.be.true;
    });

    it('returns original.contact when contact data did not change (object)', () => {
      const contactRef = { _id: 'contact-1', parent: { _id: 'parent-1' } };
      const original = { ...doc, contact: contactRef };
      const updated = { ...doc, contact: { ...contactRef } };

      const result = Lineage.getUpdatedContact(settings, medicDb)(original, updated, null);

      expect(result).to.deep.equal(contactRef);
      expect(isContact.notCalled).to.be.true;
      expect(minifyLineageOuter.calledOnceWithExactly(medicDb)).to.be.true;
      expect(minifyLineageInner.notCalled).to.be.true;
    });

    [
      'contact-new',
      { _id: 'contact-new' }
    ].forEach(contact => {
      it('throws InvalidArgumentError when updated contact doc not found', () => {
        const updated = { ...doc, contact } as Input.v1.UpdateReportInput<Report.v1.Report>;

        expect(() => Lineage.getUpdatedContact(settings, medicDb)(doc, updated, null))
          .to.throw(InvalidArgumentError, 'No valid contact found for [contact-new].');

        expect(isContact.notCalled).to.be.true;
        expect(minifyLineageOuter.calledOnceWithExactly(medicDb)).to.be.true;
        expect(minifyLineageInner.notCalled).to.be.true;
      });
    });

    [
      'contact-new',
      { _id: 'contact-new' }
    ].forEach(updatedContact => {
      it('throws InvalidArgumentError when contact is not a valid contact type', () => {
        const updated = { ...doc, contact: updatedContact } as Input.v1.UpdateReportInput<Report.v1.Report>;
        const contact = { _id: 'contact-new', _rev: 'rev-1', type: 'not-a-contact' };
        isContact.returns(false);

        expect(() => Lineage.getUpdatedContact(settings, medicDb)(doc, updated, contact))
          .to.throw(InvalidArgumentError, 'No valid contact found for [contact-new].');

        expect(isContact.calledOnceWithExactly(settings, contact)).to.be.true;
        expect(minifyLineageOuter.calledOnceWithExactly(medicDb)).to.be.true;
        expect(minifyLineageInner.notCalled).to.be.true;
      });
    });

    it('throws InvalidArgumentError when nested lineage does not match', () => {
      const updated = {
        ...doc,
        contact: { _id: 'contact-1', parent: { _id: 'parent-1', parent: { _id: 'wrong-grandparent' } } }
      };
      const contact = {
        _id: 'contact-1', _rev: 'rev-1', type: 'person',
        parent: { _id: 'parent-1', parent: { _id: 'correct-grandparent' } }
      };
      isContact.returns(true);

      expect(() => Lineage.getUpdatedContact(settings, medicDb)(doc, updated, contact)).to.throw(
        InvalidArgumentError,
        'The given contact lineage does not match the current lineage for that contact.'
      );

      expect(isContact.calledOnceWithExactly(settings, contact)).to.be.true;
      expect(minifyLineageOuter.calledOnceWithExactly(medicDb)).to.be.true;
      expect(minifyLineageInner.notCalled).to.be.true;
    });

    [
      'contact-1',
      { _id: 'contact-1', parent: { _id: 'parent-1', parent: { _id: 'grandparent-1' } } },
    ].forEach(updatedContact => {
      it('returns minified contact', () => {
        const updated = {
          ...doc,
          contact: updatedContact
        } as Input.v1.UpdateReportInput<Report.v1.Report>;

        const contact = {
          _id: 'contact-1',
          _rev: 'rev-1',
          type: 'person',
          parent: { _id: 'parent-1', name: 'Parent', parent: { _id: 'grandparent-1', name: 'Grandparent' } }
        };
        const minifiedContact = { _id: 'contact-1', parent: { _id: 'parent-1', parent: { _id: 'grandparent-1' } } };
        isContact.returns(true);
        minifyLineageInner.returns(minifiedContact);

        const result = Lineage.getUpdatedContact(settings, medicDb)(doc, updated, contact);

        expect(result).to.deep.equal(minifiedContact);
        expect(isContact.calledOnceWithExactly(settings, contact)).to.be.true;
        expect(minifyLineageOuter.calledOnceWithExactly(medicDb)).to.be.true;
        expect(minifyLineageInner.calledOnceWithExactly(contact)).to.be.true;
      });
    });
  });
});
