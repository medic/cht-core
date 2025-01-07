import { LocalDataContext } from '../../src/local/libs/data-context';
import sinon, { SinonStub } from 'sinon';
import { Doc } from '../../src/libs/doc';
import logger from '@medic/logger';
import contactTypeUtils from '@medic/contact-types-utils';
import * as LocalDoc from '../../src/local/libs/doc';
import * as Contact from '../../src/local/contact';
import { expect } from 'chai';
import * as Lineage from '../../src/local/libs/lineage';
import { END_OF_ALPHABET_MARKER } from '../../src/libs/constants';

describe('local contact', () => {
  let localContext: LocalDataContext;
  let settingsGetAll: SinonStub;
  let warn: SinonStub;
  let debug: SinonStub;
  let getContactTypes: SinonStub;
  let isContact: SinonStub;

  beforeEach(() => {
    settingsGetAll = sinon.stub();
    localContext = {
      medicDb: {} as PouchDB.Database<Doc>,
      settings: { getAll: settingsGetAll }
    } as unknown as LocalDataContext;
    warn = sinon.stub(logger, 'warn');
    debug = sinon.stub(logger, 'debug');
    getContactTypes = sinon.stub(contactTypeUtils, 'getContactTypes');
    isContact = sinon.stub(contactTypeUtils, 'isContact');
  });
  
  afterEach(() => sinon.restore());

  describe('v1', () => {
    const settings = { hello: 'world' } as const;
    
    describe('get', () => {
      const identifier = { uuid: 'uuid' } as const;
      let getDocByIdOuter: SinonStub;
      let getDocByIdInner: SinonStub;

      beforeEach(() => {
        getDocByIdInner = sinon.stub();
        getDocByIdOuter = sinon.stub(LocalDoc, 'getDocById').returns(getDocByIdInner);
      });

      it('returns a contact by UUID', async () => {
        const doc = { type: 'person' };
        getDocByIdInner.resolves(doc);
        settingsGetAll.returns(settings);
        isContact.returns(true);

        const result = await Contact.v1.get(localContext)(identifier);

        expect(result).to.equal(doc);
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isContact.calledOnceWithExactly(settingsGetAll(), doc)).to.be.true;
        expect(warn.notCalled).to.be.true;
      });

      it('returns null if the identified doc does not have a contact type', async () => {
        const doc = { type: 'not-contact', _id: '_id' };
        getDocByIdInner.resolves(doc);
        settingsGetAll.returns(settings);
        isContact.returns(false);

        const result = await Contact.v1.get(localContext)(identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isContact.calledOnceWithExactly(settingsGetAll(), doc)).to.be.true;
        expect(warn.calledOnceWithExactly(`Document [${doc._id}] is not a valid contact.`)).to.be.true;
      });

      it('returns null if the identified doc is not found', async () => {
        getDocByIdInner.resolves(null);

        const result = await Contact.v1.get(localContext)(identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(settingsGetAll.notCalled).to.be.true;
        expect(isContact.notCalled).to.be.true;
        expect(warn.calledOnceWithExactly(`No contact found for identifier [${identifier.uuid}].`)).to.be.true;
      });
    });

    describe('getWithLineage', () => {
      const identifier = { uuid: 'uuid' } as const;
      let getLineageDocsByIdInner: SinonStub;
      let getLineageDocsByIdOuter: SinonStub;
      let getContactLineageInner: SinonStub;
      let getContactLineageOuter: SinonStub;
      let isPerson: SinonStub;

      beforeEach(() => {
        getLineageDocsByIdInner = sinon.stub();
        getLineageDocsByIdOuter = sinon
          .stub(Lineage, 'getLineageDocsById')
          .returns(getLineageDocsByIdInner);
        getContactLineageInner = sinon.stub();
        getContactLineageOuter = sinon
          .stub(Lineage, 'getContactLineage')
          .returns(getContactLineageInner);
      });

      afterEach(() => {
        expect(getLineageDocsByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
      });

      it('returns a contact with lineage for person type contact', async () => {
        const person = { type: 'person', _id: 'uuid', _rev: 'rev' };
        const place0 = { _id: 'place0', _rev: 'rev' };
        const place1 = { _id: 'place1', _rev: 'rev' };
        const place2 = { _id: 'place2', _rev: 'rev' };
        const lineageDocs = [place0, place1, place2];
        getLineageDocsByIdInner.resolves([person, ...lineageDocs]);
        isContact.returns(true);
        settingsGetAll.returns(settings);
        const personWithLineage = { ...person, lineage: true };
        const copiedPerson = { ...personWithLineage };
        getContactLineageInner.returns(copiedPerson);
        isPerson = sinon.stub(contactTypeUtils, 'isPerson').returns(true);

        const result = await Contact.v1.getWithLineage(localContext)(identifier);

        expect(result).to.equal(copiedPerson);
        expect(getLineageDocsByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isContact.calledOnceWithExactly(settingsGetAll(), person)).to.be.true;
        expect(warn.notCalled).to.be.true;
        expect(debug.notCalled).to.be.true;
        expect(isPerson.calledOnceWithExactly(settingsGetAll(), person)).to.be.true;
        expect(getContactLineageOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getContactLineageInner.calledOnceWithExactly(lineageDocs, person, true)).to.be.true;
      });

      it('returns a contact with lineage for place type contact', async () => {
        const place0 = {_id: 'place0', _rev: 'rev'};
        const place1 = {_id: 'place1', _rev: 'rev'};
        const place2 = {_id: 'place2', _rev: 'rev'};
        const contact0 = { _id: 'contact0', _rev: 'rev' };
        const lineageDocs = [ place0, place1, place2 ];
        getLineageDocsByIdInner.resolves(lineageDocs);
        isContact.returns(true);
        settingsGetAll.returns(settings);
        const place0WithContact = { ...place0, contact: contact0 };
        const place0WithLineage = { ...place0WithContact, lineage: true };
        const copiedPlace = { ...place0WithLineage };
        getContactLineageInner.returns(copiedPlace);
        isPerson = sinon.stub(contactTypeUtils, 'isPerson').returns(false);

        const result = await Contact.v1.getWithLineage(localContext)(identifier);

        expect(result).to.equal(copiedPlace);
        expect(getLineageDocsByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isContact.calledOnceWithExactly(settingsGetAll(), place0)).to.be.true;
        expect(warn.notCalled).to.be.true;
        expect(debug.notCalled).to.be.true;
        expect(isPerson.calledOnceWithExactly(settingsGetAll(), place0)).to.be.true;
        expect(getContactLineageOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getContactLineageInner.calledOnceWithExactly(lineageDocs)).to.be.true;
      });

      it('returns null when no contact or lineage is found', async () => {
        getLineageDocsByIdInner.resolves([]);

        const result = await Contact.v1.getWithLineage(localContext)(identifier);

        expect(result).to.be.null;
        expect(getLineageDocsByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(getContactTypes.notCalled).to.be.true;
        expect(isContact.notCalled).to.be.true;
        expect(warn.calledOnceWithExactly(`No contact found for identifier [${identifier.uuid}].`)).to.be.true;
        expect(debug.notCalled).to.be.true;
        expect(getContactLineageInner.notCalled).to.be.true;
        expect(getContactLineageOuter.notCalled).to.be.true;
      });

      it('returns null if the doc returned is not a contact', async () => {
        const person = { type: 'not-person', _id: 'uuid', _rev: 'rev' };
        const place0 = { _id: 'place0', _rev: 'rev' };
        const place1 = { _id: 'place1', _rev: 'rev' };
        const place2 = { _id: 'place2', _rev: 'rev' };
        getLineageDocsByIdInner.resolves([person, place0, place1, place2]);
        isContact.returns(false);
        settingsGetAll.returns(settings);

        const result = await Contact.v1.getWithLineage(localContext)(identifier);

        expect(result).to.be.null;
        expect(getLineageDocsByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isContact.calledOnceWithExactly(settingsGetAll(), person)).to.be.true;
        expect(warn.calledOnceWithExactly(`Document [${identifier.uuid}] is not a valid contact.`)).to.be.true;
        expect(debug.notCalled).to.be.true;
        expect(getContactLineageInner.notCalled).to.be.true;
        expect(getContactLineageOuter.notCalled).to.be.true;
      });

      it('returns a contact if no lineage is found', async () => {
        const person = { type: 'person', _id: 'uuid', _rev: 'rev' };
        getLineageDocsByIdInner.resolves([person]);
        isContact.returns(true);
        settingsGetAll.returns(settings);

        const result = await Contact.v1.getWithLineage(localContext)(identifier);

        expect(result).to.equal(person);
        expect(getLineageDocsByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isContact.calledOnceWithExactly(settingsGetAll(), person)).to.be.true;
        expect(warn.notCalled).to.be.true;
        expect(debug.calledOnceWithExactly(`No lineage contacts found for person [${identifier.uuid}].`)).to.be.true;
        expect(getContactLineageInner.notCalled).to.be.true;
        expect(getContactLineageOuter.notCalled).to.be.true;
      });
    });

    describe('getUuidsPage', () => {
      const limit = 3;
      const cursor = null;
      const notNullCursor = '5';
      const contactType = 'person';
      const invalidContactTypeQualifier = { contactType: 'invalid' } as const;
      const validContactTypes = [{ id: 'person' }, { id: 'place' }];
      let getByTypeExactMatchFreetext: SinonStub;
      let getByExactMatchFreetext: SinonStub;
      let getByType: SinonStub;
      let getByTypeStartsWithFreetext: SinonStub;
      let getByStartsWithFreetext: SinonStub;
      let queryDocsByKeyOuter: SinonStub;
      let queryDocsByRangeOuter: SinonStub;
      let fetchAndFilterInner: SinonStub;
      let fetchAndFilterOuter: SinonStub;

      beforeEach(() => {
        getByTypeExactMatchFreetext = sinon.stub();
        getByExactMatchFreetext = sinon.stub();
        getByType = sinon.stub();
        getByTypeStartsWithFreetext = sinon.stub();
        getByStartsWithFreetext = sinon.stub();
        // comment to encapsulate assigning of exact match functions
        queryDocsByKeyOuter = sinon.stub(LocalDoc, 'queryDocsByKey');
        queryDocsByKeyOuter.withArgs(
          localContext.medicDb, 'medic-client/contacts_by_type_freetext'
        ).returns(getByTypeExactMatchFreetext);
        queryDocsByKeyOuter.withArgs(
          localContext.medicDb, 'medic-client/contacts_by_freetext'
        ).returns(getByExactMatchFreetext);
        queryDocsByKeyOuter.withArgs(localContext.medicDb, 'medic-client/contacts_by_type').returns(getByType);
        // end comment
        // comment to encapsulate assigning of "StartsWith" functions
        queryDocsByRangeOuter = sinon.stub(LocalDoc, 'queryDocsByRange');
        queryDocsByRangeOuter.withArgs(
          localContext.medicDb, 'medic-client/contacts_by_type_freetext'
        ).returns(getByTypeStartsWithFreetext);
        queryDocsByRangeOuter.withArgs(
          localContext.medicDb, 'medic-client/contacts_by_freetext'
        ).returns(getByStartsWithFreetext);
        // end comment
        getContactTypes.returns(validContactTypes);
        settingsGetAll.returns(settings);
        fetchAndFilterInner = sinon.stub();
        fetchAndFilterOuter = sinon.stub(LocalDoc, 'fetchAndFilter').returns(fetchAndFilterInner);
      });

      it('returns a page of contact identifiers for contactType only qualifier', async () => {
        const qualifier = { contactType } as const;
        const docs = [
          { type: contactType, _id: '1' },
          { type: contactType, _id: '2' },
          { type: contactType, _id: '3' }
        ];
        const fetchAndFilterResult = {
          cursor: '3',
          data: docs
        };
        const expectedResult = {
          cursor: '3',
          data: ['1', '2', '3']
        };
        fetchAndFilterInner.resolves(fetchAndFilterResult);

        const res = await Contact.v1.getUuidsPage(localContext)(qualifier, cursor, limit);
        const fetchAndFilterOuterFirstArg = fetchAndFilterOuter.firstCall.args[0] as (...args: unknown[]) => unknown;

        expect(res).to.deep.equal(expectedResult);
        expect(settingsGetAll.callCount).to.equal(1);
        expect(getContactTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(queryDocsByKeyOuter.callCount).to.be.equal(3);
        expect(
          queryDocsByKeyOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type_freetext']);
        expect(
          queryDocsByKeyOuter.getCall(1).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_freetext']);
        expect(
          queryDocsByKeyOuter.getCall(2).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type']);
        expect(queryDocsByRangeOuter.callCount).to.be.equal(2);
        expect(
          queryDocsByRangeOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type_freetext']);
        expect(
          queryDocsByRangeOuter.getCall(1).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_freetext']);
        expect(fetchAndFilterOuter.calledOnce).to.be.true;
        expect(fetchAndFilterOuter.firstCall.args[0]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[1]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[2]).to.be.equal(limit);
        expect(fetchAndFilterInner.calledOnceWithExactly(limit, Number(cursor))).to.be.true;
        // call the argument to check which one of the inner functions was called
        fetchAndFilterOuterFirstArg(limit, Number(cursor));
        expect(getByType.calledWithExactly([qualifier.contactType], limit, Number(cursor))).to.be.true;
        expect(getByTypeExactMatchFreetext.notCalled).to.be.true;
        expect(getByExactMatchFreetext.notCalled).to.be.true;
        expect(getByTypeStartsWithFreetext.notCalled).to.be.true;
        expect(getByStartsWithFreetext.notCalled).to.be.true;
      });

      it('returns a page of contact identifiers for freetext only qualifier with : delimiter', async () => {
        const freetext = 'has : delimiter';
        const qualifier = {
          freetext
        };
        const docs = [
          { type: contactType, _id: '1' },
          { type: contactType, _id: '2' },
          { type: contactType, _id: '3' }
        ];
        const fetchAndFilterResult = {
          cursor: '3',
          data: docs
        };
        const expectedResult = {
          cursor: '3',
          data: ['1', '2', '3']
        };
        fetchAndFilterInner.resolves(fetchAndFilterResult);

        const res = await Contact.v1.getUuidsPage(localContext)(qualifier, cursor, limit);
        const fetchAndFilterOuterFirstArg = fetchAndFilterOuter.firstCall.args[0] as (...args: unknown[]) => unknown;

        expect(res).to.deep.equal(expectedResult);
        expect(settingsGetAll.notCalled).to.be.true;
        expect(getContactTypes.notCalled).to.be.true;
        expect(queryDocsByKeyOuter.callCount).to.be.equal(3);
        expect(
          queryDocsByKeyOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type_freetext']);
        expect(
          queryDocsByKeyOuter.getCall(1).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_freetext']);
        expect(
          queryDocsByKeyOuter.getCall(2).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type']);
        expect(queryDocsByRangeOuter.callCount).to.be.equal(2);
        expect(
          queryDocsByRangeOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type_freetext']);
        expect(
          queryDocsByRangeOuter.getCall(1).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_freetext']);
        expect(fetchAndFilterOuter.calledOnce).to.be.true;
        expect(fetchAndFilterOuter.firstCall.args[0]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[1]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[2]).to.be.equal(limit);
        expect(fetchAndFilterInner.calledOnceWithExactly(limit, Number(cursor))).to.be.true;
        // call the argument to check which one of the inner functions was called
        fetchAndFilterOuterFirstArg(limit, Number(cursor));
        expect(getByExactMatchFreetext.calledWithExactly([qualifier.freetext], limit, Number(cursor))).to.be.true;
        expect(getByTypeExactMatchFreetext.notCalled).to.be.true;
        expect(getByType.notCalled).to.be.true;
        expect(getByTypeStartsWithFreetext.notCalled).to.be.true;
        expect(getByStartsWithFreetext.notCalled).to.be.true;
      });

      it('returns a page of contact identifiers for freetext only qualifier without : delimiter', async () => {
        const freetext = 'does not have colon delimiter';
        const qualifier = {
          freetext
        };
        const docs = [
          { type: contactType, _id: '1' },
          { type: contactType, _id: '2' },
          { type: contactType, _id: '3' }
        ];
        const fetchAndFilterResult = {
          cursor: '3',
          data: docs
        };
        const expectedResult = {
          cursor: '3',
          data: ['1', '2', '3']
        };
        fetchAndFilterInner.resolves(fetchAndFilterResult);

        const res = await Contact.v1.getUuidsPage(localContext)(qualifier, cursor, limit);
        const fetchAndFilterOuterFirstArg = fetchAndFilterOuter.firstCall.args[0] as (...args: unknown[]) => unknown;

        expect(res).to.deep.equal(expectedResult);
        expect(settingsGetAll.notCalled).to.be.true;
        expect(getContactTypes.notCalled).to.be.true;
        expect(queryDocsByKeyOuter.callCount).to.be.equal(3);
        expect(
          queryDocsByKeyOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type_freetext']);
        expect(
          queryDocsByKeyOuter.getCall(1).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_freetext']);
        expect(
          queryDocsByKeyOuter.getCall(2).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type']);
        expect(queryDocsByRangeOuter.callCount).to.be.equal(2);
        expect(
          queryDocsByRangeOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type_freetext']);
        expect(
          queryDocsByRangeOuter.getCall(1).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_freetext']);
        expect(fetchAndFilterOuter.calledOnce).to.be.true;
        expect(fetchAndFilterOuter.firstCall.args[0]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[1]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[2]).to.be.equal(limit);
        expect(fetchAndFilterInner.calledOnceWithExactly(limit, Number(cursor))).to.be.true;
        // call the argument to check which one of the inner functions was called
        fetchAndFilterOuterFirstArg(limit, Number(cursor));
        expect(getByStartsWithFreetext.calledWithExactly(
          [qualifier.freetext], [qualifier.freetext + END_OF_ALPHABET_MARKER], limit, Number(cursor)
        )).to.be.true;
        expect(getByTypeExactMatchFreetext.notCalled).to.be.true;
        expect(getByExactMatchFreetext.notCalled).to.be.true;
        expect(getByType.notCalled).to.be.true;
        expect(getByTypeStartsWithFreetext.notCalled).to.be.true;
      });

      it('returns a page of contact identifiers for contactType and freetext qualifier with : delimiter', async () => {
        const freetext = 'has : delimiter';
        const qualifier = {
          contactType,
          freetext
        };
        const docs = [
          { type: contactType, _id: '1' },
          { type: contactType, _id: '2' },
          { type: contactType, _id: '3' }
        ];
        const fetchAndFilterResult = {
          cursor: '3',
          data: docs
        };
        const expectedResult = {
          cursor: '3',
          data: ['1', '2', '3']
        };
        fetchAndFilterInner.resolves(fetchAndFilterResult);

        const res = await Contact.v1.getUuidsPage(localContext)(qualifier, cursor, limit);
        const fetchAndFilterOuterFirstArg = fetchAndFilterOuter.firstCall.args[0] as (...args: unknown[]) => unknown;

        expect(res).to.deep.equal(expectedResult);
        expect(settingsGetAll.callCount).to.equal(1);
        expect(getContactTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(queryDocsByKeyOuter.callCount).to.be.equal(3);
        expect(
          queryDocsByKeyOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type_freetext']);
        expect(
          queryDocsByKeyOuter.getCall(1).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_freetext']);
        expect(
          queryDocsByKeyOuter.getCall(2).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type']);
        expect(queryDocsByRangeOuter.callCount).to.be.equal(2);
        expect(
          queryDocsByRangeOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type_freetext']);
        expect(
          queryDocsByRangeOuter.getCall(1).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_freetext']);
        expect(fetchAndFilterOuter.calledOnce).to.be.true;
        expect(fetchAndFilterOuter.firstCall.args[0]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[1]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[2]).to.be.equal(limit);
        expect(fetchAndFilterInner.calledOnceWithExactly(limit, Number(cursor))).to.be.true;
        // call the argument to check which one of the inner functions was called
        fetchAndFilterOuterFirstArg(limit, Number(cursor));
        expect(getByTypeExactMatchFreetext.calledWithExactly(
          [qualifier.contactType, qualifier.freetext], limit, Number(cursor)
        )).to.be.true;
        expect(getByExactMatchFreetext.notCalled).to.be.true;
        expect(getByType.notCalled).to.be.true;
        expect(getByTypeStartsWithFreetext.notCalled).to.be.true;
        expect(getByStartsWithFreetext.notCalled).to.be.true;
      });

      it('returns a page of contact identifiers for contactType and freetext qualifier without delimiter', async () => {
        const freetext = 'does not have colon delimiter';
        const qualifier = {
          contactType,
          freetext
        };
        const docs = [
          { type: contactType, _id: '1' },
          { type: contactType, _id: '2' },
          { type: contactType, _id: '3' }
        ];
        const fetchAndFilterResult = {
          cursor: '3',
          data: docs
        };
        const expectedResult = {
          cursor: '3',
          data: ['1', '2', '3']
        };
        fetchAndFilterInner.resolves(fetchAndFilterResult);

        const res = await Contact.v1.getUuidsPage(localContext)(qualifier, cursor, limit);
        const fetchAndFilterOuterFirstArg = fetchAndFilterOuter.firstCall.args[0] as (...args: unknown[]) => unknown;

        expect(res).to.deep.equal(expectedResult);
        expect(settingsGetAll.callCount).to.equal(1);
        expect(getContactTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(queryDocsByKeyOuter.callCount).to.be.equal(3);
        expect(
          queryDocsByKeyOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type_freetext']);
        expect(
          queryDocsByKeyOuter.getCall(1).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_freetext']);
        expect(
          queryDocsByKeyOuter.getCall(2).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type']);
        expect(queryDocsByRangeOuter.callCount).to.be.equal(2);
        expect(
          queryDocsByRangeOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type_freetext']);
        expect(
          queryDocsByRangeOuter.getCall(1).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_freetext']);
        expect(fetchAndFilterOuter.calledOnce).to.be.true;
        expect(fetchAndFilterOuter.firstCall.args[0]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[1]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[2]).to.be.equal(limit);
        expect(fetchAndFilterInner.calledOnceWithExactly(limit, Number(cursor))).to.be.true;
        // call the argument to check which one of the inner functions was called
        fetchAndFilterOuterFirstArg(limit, Number(cursor));
        expect(getByTypeStartsWithFreetext.calledWithExactly(
          [qualifier.contactType, qualifier.freetext],
          [qualifier.contactType, qualifier.freetext + END_OF_ALPHABET_MARKER],
          limit,
          Number(cursor)
        )).to.be.true;
        expect(getByTypeExactMatchFreetext.notCalled).to.be.true;
        expect(getByExactMatchFreetext.notCalled).to.be.true;
        expect(getByType.notCalled).to.be.true;
        expect(getByStartsWithFreetext.notCalled).to.be.true;
      });

      it('returns a page of contact identifiers for contactType only qualifier for not-null cursor', async () => {
        const qualifier = { contactType } as const;
        const docs = [
          { type: contactType, _id: '1' },
          { type: contactType, _id: '2' },
          { type: contactType, _id: '3' }
        ];
        const fetchAndFilterResult = {
          cursor: '8',
          data: docs
        };
        const expectedResult = {
          cursor: '8',
          data: ['1', '2', '3']
        };
        fetchAndFilterInner.resolves(fetchAndFilterResult);

        const res = await Contact.v1.getUuidsPage(localContext)(qualifier, notNullCursor, limit);
        const fetchAndFilterOuterFirstArg = fetchAndFilterOuter.firstCall.args[0] as (...args: unknown[]) => unknown;

        expect(res).to.deep.equal(expectedResult);
        expect(settingsGetAll.callCount).to.equal(1);
        expect(getContactTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(queryDocsByKeyOuter.callCount).to.be.equal(3);
        expect(
          queryDocsByKeyOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type_freetext']);
        expect(
          queryDocsByKeyOuter.getCall(1).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_freetext']);
        expect(
          queryDocsByKeyOuter.getCall(2).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type']);
        expect(queryDocsByRangeOuter.callCount).to.be.equal(2);
        expect(
          queryDocsByRangeOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type_freetext']);
        expect(
          queryDocsByRangeOuter.getCall(1).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_freetext']);
        expect(fetchAndFilterOuter.calledOnce).to.be.true;
        expect(fetchAndFilterOuter.firstCall.args[0]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[1]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[2]).to.be.equal(limit);
        expect(fetchAndFilterInner.calledOnceWithExactly(limit, Number(notNullCursor))).to.be.true;
        // call the argument to check which one of the inner functions was called
        fetchAndFilterOuterFirstArg(limit, Number(cursor));
        expect(getByType.calledWithExactly([qualifier.contactType], limit, Number(cursor))).to.be.true;
        expect(getByTypeExactMatchFreetext.notCalled).to.be.true;
        expect(getByExactMatchFreetext.notCalled).to.be.true;
        expect(getByTypeStartsWithFreetext.notCalled).to.be.true;
        expect(getByStartsWithFreetext.notCalled).to.be.true;
      });

      it('returns a page of contact identifiers for freetext only' +
        'qualifier with : delimiter for not-null cursor', async () => {
        const freetext = 'has : delimiter';
        const qualifier = {
          freetext
        };
        const docs = [
          { type: contactType, _id: '1' },
          { type: contactType, _id: '2' },
          { type: contactType, _id: '3' }
        ];
        const fetchAndFilterResult = {
          cursor: '8',
          data: docs
        };
        const expectedResult = {
          cursor: '8',
          data: ['1', '2', '3']
        };
        fetchAndFilterInner.resolves(fetchAndFilterResult);

        const res = await Contact.v1.getUuidsPage(localContext)(qualifier, notNullCursor, limit);
        const fetchAndFilterOuterFirstArg = fetchAndFilterOuter.firstCall.args[0] as (...args: unknown[]) => unknown;

        expect(res).to.deep.equal(expectedResult);
        expect(settingsGetAll.notCalled).to.be.true;
        expect(getContactTypes.notCalled).to.be.true;
        expect(queryDocsByKeyOuter.callCount).to.be.equal(3);
        expect(
          queryDocsByKeyOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type_freetext']);
        expect(
          queryDocsByKeyOuter.getCall(1).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_freetext']);
        expect(
          queryDocsByKeyOuter.getCall(2).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type']);
        expect(queryDocsByRangeOuter.callCount).to.be.equal(2);
        expect(
          queryDocsByRangeOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type_freetext']);
        expect(
          queryDocsByRangeOuter.getCall(1).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_freetext']);
        expect(fetchAndFilterOuter.calledOnce).to.be.true;
        expect(fetchAndFilterOuter.firstCall.args[0]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[1]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[2]).to.be.equal(limit);
        expect(fetchAndFilterInner.calledOnceWithExactly(limit, Number(notNullCursor))).to.be.true;
        // call the argument to check which one of the inner functions was called
        fetchAndFilterOuterFirstArg(limit, Number(cursor));
        expect(getByExactMatchFreetext.calledWithExactly([qualifier.freetext], limit, Number(cursor))).to.be.true;
        expect(getByTypeExactMatchFreetext.notCalled).to.be.true;
        expect(getByType.notCalled).to.be.true;
        expect(getByTypeStartsWithFreetext.notCalled).to.be.true;
        expect(getByStartsWithFreetext.notCalled).to.be.true;
      });

      it('returns a page of contact identifiers for freetext only qualifier' +
        ' without : delimiter for not-null cursor', async () => {
        const freetext = 'does not have colon delimiter';
        const qualifier = {
          freetext
        };
        const docs = [
          { type: contactType, _id: '1' },
          { type: contactType, _id: '2' },
          { type: contactType, _id: '3' }
        ];
        const fetchAndFilterResult = {
          cursor: '8',
          data: docs
        };
        const expectedResult = {
          cursor: '8',
          data: ['1', '2', '3']
        };
        fetchAndFilterInner.resolves(fetchAndFilterResult);

        const res = await Contact.v1.getUuidsPage(localContext)(qualifier, notNullCursor, limit);
        const fetchAndFilterOuterFirstArg = fetchAndFilterOuter.firstCall.args[0] as (...args: unknown[]) => unknown;

        expect(res).to.deep.equal(expectedResult);
        expect(settingsGetAll.notCalled).to.be.true;
        expect(getContactTypes.notCalled).to.be.true;
        expect(queryDocsByKeyOuter.callCount).to.be.equal(3);
        expect(
          queryDocsByKeyOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type_freetext']);
        expect(
          queryDocsByKeyOuter.getCall(1).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_freetext']);
        expect(
          queryDocsByKeyOuter.getCall(2).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type']);
        expect(queryDocsByRangeOuter.callCount).to.be.equal(2);
        expect(
          queryDocsByRangeOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type_freetext']);
        expect(
          queryDocsByRangeOuter.getCall(1).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_freetext']);
        expect(fetchAndFilterOuter.calledOnce).to.be.true;
        expect(fetchAndFilterOuter.firstCall.args[0]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[1]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[2]).to.be.equal(limit);
        expect(fetchAndFilterInner.calledOnceWithExactly(limit, Number(notNullCursor))).to.be.true;
        // call the argument to check which one of the inner functions was called
        fetchAndFilterOuterFirstArg(limit, Number(cursor));
        expect(getByStartsWithFreetext.calledWithExactly(
          [qualifier.freetext], [qualifier.freetext + END_OF_ALPHABET_MARKER], limit, Number(cursor)
        )).to.be.true;
        expect(getByTypeExactMatchFreetext.notCalled).to.be.true;
        expect(getByExactMatchFreetext.notCalled).to.be.true;
        expect(getByType.notCalled).to.be.true;
        expect(getByTypeStartsWithFreetext.notCalled).to.be.true;
      });

      it(
        'returns a page of contact identifiers for contactType and freetext qualifier' +
        'with : delimiter for not-null cursor', async () => {
          const freetext = 'has : delimiter';
          const qualifier = {
            contactType,
            freetext
          };
          const docs = [
            { type: contactType, _id: '1' },
            { type: contactType, _id: '2' },
            { type: contactType, _id: '3' }
          ];
          const fetchAndFilterResult = {
            cursor: '8',
            data: docs
          };
          const expectedResult = {
            cursor: '8',
            data: ['1', '2', '3']
          };
          fetchAndFilterInner.resolves(fetchAndFilterResult);

          const res = await Contact.v1.getUuidsPage(localContext)(qualifier, notNullCursor, limit);
          const fetchAndFilterOuterFirstArg = fetchAndFilterOuter.firstCall.args[0] as (...args: unknown[]) => unknown;

          expect(res).to.deep.equal(expectedResult);
          expect(settingsGetAll.callCount).to.equal(1);
          expect(getContactTypes.calledOnceWithExactly(settings)).to.be.true;
          expect(queryDocsByKeyOuter.callCount).to.be.equal(3);
          expect(
            queryDocsByKeyOuter.getCall(0).args
          ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type_freetext']);
          expect(
            queryDocsByKeyOuter.getCall(1).args
          ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_freetext']);
          expect(
            queryDocsByKeyOuter.getCall(2).args
          ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type']);
          expect(queryDocsByRangeOuter.callCount).to.be.equal(2);
          expect(
            queryDocsByRangeOuter.getCall(0).args
          ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type_freetext']);
          expect(
            queryDocsByRangeOuter.getCall(1).args
          ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_freetext']);
          expect(fetchAndFilterOuter.calledOnce).to.be.true;
          expect(fetchAndFilterOuter.firstCall.args[0]).to.be.a('function');
          expect(fetchAndFilterOuter.firstCall.args[1]).to.be.a('function');
          expect(fetchAndFilterOuter.firstCall.args[2]).to.be.equal(limit);
          expect(fetchAndFilterInner.calledOnceWithExactly(limit, Number(notNullCursor))).to.be.true;
          // call the argument to check which one of the inner functions was called
          fetchAndFilterOuterFirstArg(limit, Number(cursor));
          expect(getByTypeExactMatchFreetext.calledWithExactly(
            [qualifier.contactType, qualifier.freetext], limit, Number(cursor)
          )).to.be.true;
          expect(getByExactMatchFreetext.notCalled).to.be.true;
          expect(getByType.notCalled).to.be.true;
          expect(getByTypeStartsWithFreetext.notCalled).to.be.true;
          expect(getByStartsWithFreetext.notCalled).to.be.true;
        }
      );

      it('returns a page of contact identifiers for contactType and freetext qualifier' +
        'without delimiter for not-null cursor', async () => {
        const freetext = 'does not have colon delimiter';
        const qualifier = {
          contactType,
          freetext
        };
        const docs = [
          { type: contactType, _id: '1' },
          { type: contactType, _id: '2' },
          { type: contactType, _id: '3' }
        ];
        const fetchAndFilterResult = {
          cursor: '8',
          data: docs
        };
        const expectedResult = {
          cursor: '8',
          data: ['1', '2', '3']
        };
        fetchAndFilterInner.resolves(fetchAndFilterResult);

        const res = await Contact.v1.getUuidsPage(localContext)(qualifier, notNullCursor, limit);
        const fetchAndFilterOuterFirstArg = fetchAndFilterOuter.firstCall.args[0] as (...args: unknown[]) => unknown;

        expect(res).to.deep.equal(expectedResult);
        expect(settingsGetAll.callCount).to.equal(1);
        expect(getContactTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(queryDocsByKeyOuter.callCount).to.be.equal(3);
        expect(
          queryDocsByKeyOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type_freetext']);
        expect(
          queryDocsByKeyOuter.getCall(1).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_freetext']);
        expect(
          queryDocsByKeyOuter.getCall(2).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type']);
        expect(queryDocsByRangeOuter.callCount).to.be.equal(2);
        expect(
          queryDocsByRangeOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type_freetext']);
        expect(
          queryDocsByRangeOuter.getCall(1).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_freetext']);
        expect(fetchAndFilterOuter.calledOnce).to.be.true;
        expect(fetchAndFilterOuter.firstCall.args[0]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[1]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[2]).to.be.equal(limit);
        expect(fetchAndFilterInner.calledOnceWithExactly(limit, Number(notNullCursor))).to.be.true;
        // call the argument to check which one of the inner functions was called
        fetchAndFilterOuterFirstArg(limit, Number(cursor));
        expect(getByTypeStartsWithFreetext.calledWithExactly(
          [qualifier.contactType, qualifier.freetext],
          [qualifier.contactType, qualifier.freetext + END_OF_ALPHABET_MARKER],
          limit,
          Number(cursor)
        )).to.be.true;
        expect(getByTypeExactMatchFreetext.notCalled).to.be.true;
        expect(getByExactMatchFreetext.notCalled).to.be.true;
        expect(getByType.notCalled).to.be.true;
        expect(getByStartsWithFreetext.notCalled).to.be.true;
      });

      it('throws an error if contact type is invalid', async () => {
        await expect(
          Contact.v1.getUuidsPage(localContext)(invalidContactTypeQualifier, cursor, limit)
        ).to.be.rejectedWith(
          `Invalid contact type [${invalidContactTypeQualifier.contactType}].`
        );

        expect(settingsGetAll.calledOnce).to.be.true;
        expect(getContactTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(queryDocsByKeyOuter.callCount).to.be.equal(3);
        expect(
          queryDocsByKeyOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type_freetext']);
        expect(
          queryDocsByKeyOuter.getCall(1).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_freetext']);
        expect(
          queryDocsByKeyOuter.getCall(2).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type']);
        expect(queryDocsByRangeOuter.callCount).to.be.equal(2);
        expect(
          queryDocsByRangeOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type_freetext']);
        expect(
          queryDocsByRangeOuter.getCall(1).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_freetext']);
        expect(fetchAndFilterInner.notCalled).to.be.true;
        expect(fetchAndFilterOuter.notCalled).to.be.true;
        expect(getByTypeExactMatchFreetext.notCalled).to.be.true;
        expect(getByExactMatchFreetext.notCalled).to.be.true;
        expect(getByType.notCalled).to.be.true;
        expect(getByTypeStartsWithFreetext.notCalled).to.be.true;
        expect(getByStartsWithFreetext.notCalled).to.be.true;
      });

      [
        {},
        '-1',
        undefined,
      ].forEach((invalidCursor ) => {
        it(`throws an error if cursor is invalid: ${String(invalidCursor)}`, async () => {
          const qualifier = {
            contactType,
          };

          await expect(Contact.v1.getUuidsPage(localContext)(qualifier, invalidCursor as string, limit))
            .to.be.rejectedWith(`Invalid cursor token: [${String(invalidCursor)}]`);

          expect(settingsGetAll.calledOnce).to.be.true;
          expect(getContactTypes.calledOnceWithExactly(settings)).to.be.true;
          expect(queryDocsByKeyOuter.callCount).to.be.equal(3);
          expect(
            queryDocsByKeyOuter.getCall(0).args
          ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type_freetext']);
          expect(
            queryDocsByKeyOuter.getCall(1).args
          ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_freetext']);
          expect(
            queryDocsByKeyOuter.getCall(2).args
          ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type']);
          expect(queryDocsByRangeOuter.callCount).to.be.equal(2);
          expect(
            queryDocsByRangeOuter.getCall(0).args
          ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type_freetext']);
          expect(
            queryDocsByRangeOuter.getCall(1).args
          ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_freetext']);
          expect(fetchAndFilterInner.notCalled).to.be.true;
          expect(fetchAndFilterOuter.notCalled).to.be.true;
          expect(getByTypeExactMatchFreetext.notCalled).to.be.true;
          expect(getByExactMatchFreetext.notCalled).to.be.true;
          expect(getByType.notCalled).to.be.true;
          expect(getByTypeStartsWithFreetext.notCalled).to.be.true;
          expect(getByStartsWithFreetext.notCalled).to.be.true;
        });
      });
      
      it('returns empty array if contacts do not exist', async () => {
        const qualifier = {
          contactType
        };
        const expectedResult = {
          data: [],
          cursor
        };
        fetchAndFilterInner.resolves(expectedResult);

        const res = await Contact.v1.getUuidsPage(localContext)(qualifier, cursor, limit);
        const fetchAndFilterOuterFirstArg = fetchAndFilterOuter.firstCall.args[0] as (...args: unknown[]) => unknown;
        const fetchAndFilterOuterString = fetchAndFilterOuterFirstArg.toString();

        expect(res).to.deep.equal(expectedResult);
        expect(settingsGetAll.calledOnce).to.be.true;
        expect(getContactTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(queryDocsByKeyOuter.callCount).to.be.equal(3);
        expect(
          queryDocsByKeyOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type_freetext']);
        expect(
          queryDocsByKeyOuter.getCall(1).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_freetext']);
        expect(
          queryDocsByKeyOuter.getCall(2).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type']);
        expect(queryDocsByRangeOuter.callCount).to.be.equal(2);
        expect(
          queryDocsByRangeOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_type_freetext']);
        expect(
          queryDocsByRangeOuter.getCall(1).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/contacts_by_freetext']);
        expect(fetchAndFilterOuter.firstCall.args[0]).to.be.a('function');
        expect(fetchAndFilterOuterString.includes('getByType(')).to.be.true;
        expect(fetchAndFilterOuter.firstCall.args[1]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[2]).to.be.equal(limit);
        expect(fetchAndFilterInner.calledOnceWithExactly(limit, Number(cursor))).to.be.true;
        expect(getByTypeExactMatchFreetext.notCalled).to.be.true;
        expect(getByExactMatchFreetext.notCalled).to.be.true;
        expect(getByType.notCalled).to.be.true;
        expect(getByTypeStartsWithFreetext.notCalled).to.be.true;
        expect(getByStartsWithFreetext.notCalled).to.be.true;
      });
    });
  });
});
