import sinon, { SinonStub } from 'sinon';
import contactTypeUtils from '@medic/contact-types-utils';
import logger from '@medic/logger';
import { Doc } from '../../src/libs/doc';
import * as Place from '../../src/local/place';
import * as LocalDoc from '../../src/local/libs/doc';
import { expect } from 'chai';
import { LocalDataContext } from '../../src/local/libs/data-context';
import * as Lineage from '../../src/local/libs/lineage';
import { NotFoundError } from '../../src/libs/error';

describe('local place', () => {
  let localContext: LocalDataContext;
  let settingsGetAll: SinonStub;
  let warn: SinonStub;
  let debug: SinonStub;
  let isPlace: SinonStub;

  beforeEach(() => {
    settingsGetAll = sinon.stub();
    localContext = {
      medicDb: {} as PouchDB.Database<Doc>,
      settings: { getAll: settingsGetAll }
    } as unknown as LocalDataContext;
    warn = sinon.stub(logger, 'warn');
    debug = sinon.stub(logger, 'debug');
    isPlace = sinon.stub(contactTypeUtils, 'isPlace');
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

      it('returns a place by UUID', async () => {
        const doc = { type: 'clinic' };
        getDocByIdInner.resolves(doc);
        settingsGetAll.returns(settings);
        isPlace.returns(true);

        const result = await Place.v1.get(localContext)(identifier);

        expect(result).to.equal(doc);
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isPlace.calledOnceWithExactly(settings, doc)).to.be.true;
        expect(warn.notCalled).to.be.true;
      });

      it('returns null if the identified doc does not have a place type', async () => {
        const doc = { type: 'not-place', '_id': 'id' };
        getDocByIdInner.resolves(doc);
        settingsGetAll.returns(settings);
        isPlace.returns(false);

        const result = await Place.v1.get(localContext)(identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isPlace.calledOnceWithExactly(settings, doc)).to.be.true;
        expect(warn.calledOnceWithExactly(`Document [${doc._id}] is not a valid place.`)).to.be.true;
      });

      it('returns null if the identified doc is not found', async () => {
        getDocByIdInner.resolves(null);

        const result = await Place.v1.get(localContext)(identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(settingsGetAll.notCalled).to.be.true;
        expect(isPlace.notCalled).to.be.true;
        expect(warn.calledOnceWithExactly(`No place found for identifier [${identifier.uuid}].`)).to.be.true;
      });
    });

    describe('getWithLineage', () => {
      const identifier = { uuid: 'place0' } as const;
      let mockFetchHydratedDoc: SinonStub;

      beforeEach(() => {
        mockFetchHydratedDoc = sinon.stub(Lineage, 'fetchHydratedDoc');
      });

      it('returns a place with lineage', async () => {
        const placeWithLineage = { type: 'place', _id: 'place0', _rev: 'rev', 
          contact: { _id: 'contact0', _rev: 'rev' } };
        const mockFunction = sinon.stub().resolves(placeWithLineage);
        mockFetchHydratedDoc.returns(mockFunction);
        isPlace.returns(true);
        settingsGetAll.returns(settings);

        const result = await Place.v1.getWithLineage(localContext)(identifier);

        expect(result).to.equal(placeWithLineage);
        expect(mockFetchHydratedDoc.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(mockFunction.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isPlace.calledOnceWithExactly(settings, placeWithLineage)).to.be.true;
        expect(warn.notCalled).to.be.true;
        expect(debug.notCalled).to.be.true;
      });

      it('returns null when no place or lineage is found', async () => {
        const mockFunction = sinon.stub().resolves(null);
        mockFetchHydratedDoc.returns(mockFunction);

        const result = await Place.v1.getWithLineage(localContext)(identifier);

        expect(result).to.be.null;
        expect(mockFetchHydratedDoc.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(mockFunction.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isPlace.notCalled).to.be.true;
        expect(warn.calledOnceWithExactly(`No place found for identifier [${identifier.uuid}].`)).to.be.true;
        expect(debug.notCalled).to.be.true;
      });

      it('returns null if the doc returned is not a place', async () => {
        const notPlace = { type: 'not-place', _id: 'place0', _rev: 'rev' };
        const mockFunction = sinon.stub().resolves(notPlace);
        mockFetchHydratedDoc.returns(mockFunction);
        isPlace.returns(false);
        settingsGetAll.returns(settings);

        const result = await Place.v1.getWithLineage(localContext)(identifier);

        expect(result).to.be.null;
        expect(mockFetchHydratedDoc.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(mockFunction.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isPlace.calledOnceWithExactly(settings, notPlace)).to.be.true;
        expect(warn.calledOnceWithExactly(`Document [${identifier.uuid}] is not a valid place.`)).to.be.true;
        expect(debug.notCalled).to.be.true;
      });
    });

    describe('getPage', () => {
      const limit = 3;
      const cursor = null;
      const notNullCursor = '5';
      const placeIdentifier = 'place';
      const placeTypeQualifier = {contactType: placeIdentifier} as const;
      const invalidPlaceTypeQualifier = { contactType: 'invalid' } as const;
      const placeType = [{person: true, id: placeIdentifier}] as Record<string, unknown>[];
      let getPlaceTypes: SinonStub;
      let queryDocsByKeyInner: SinonStub;
      let queryDocsByKeyOuter: SinonStub;
      let fetchAndFilterInner: SinonStub;
      let fetchAndFilterOuter: SinonStub;

      beforeEach(() => {
        queryDocsByKeyInner = sinon.stub();
        queryDocsByKeyOuter = sinon.stub(LocalDoc, 'queryDocsByKey').returns(queryDocsByKeyInner);
        getPlaceTypes = sinon.stub(contactTypeUtils, 'getPlaceTypes').returns(placeType);
        settingsGetAll.returns(settings);
        fetchAndFilterInner = sinon.stub();
        fetchAndFilterOuter = sinon.stub(LocalDoc, 'fetchAndFilter').returns(fetchAndFilterInner);
      });

      it('returns a page of places', async () => {
        const doc = { type: 'place' };
        const docs = [doc, doc, doc];
        const expectedResult = {
          cursor: '3',
          data: docs
        };
        fetchAndFilterInner.resolves(expectedResult);

        const res = await Place.v1.getPage(localContext)(placeTypeQualifier, cursor, limit);

        expect(res).to.deep.equal(expectedResult);
        expect(settingsGetAll.callCount).to.equal(1);
        expect(getPlaceTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(
          queryDocsByKeyOuter.calledOnceWithExactly(localContext.medicDb, 'medic-client/contacts_by_type')
        ).to.be.true;
        expect(queryDocsByKeyInner.notCalled).to.be.true;
        expect(fetchAndFilterOuter.calledOnce).to.be.true;
        expect(fetchAndFilterOuter.firstCall.args[0]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[1]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[2]).to.be.equal(limit);
        expect(fetchAndFilterInner.calledOnceWithExactly(limit, Number(cursor))).to.be.true;
        expect(isPlace.notCalled).to.be.true;
      });

      it('returns a page of places when cursor is not null', async () => {
        const doc = { type: 'place' };
        const docs = [doc, doc, doc];
        const expectedResult = {
          cursor: '8',
          data: docs
        };
        fetchAndFilterInner.resolves(expectedResult);

        const res = await Place.v1.getPage(localContext)(placeTypeQualifier, notNullCursor, limit);

        expect(res).to.deep.equal(expectedResult);
        expect(settingsGetAll.callCount).to.equal(1);
        expect(getPlaceTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(
          queryDocsByKeyOuter.calledOnceWithExactly(localContext.medicDb, 'medic-client/contacts_by_type')
        ).to.be.true;
        expect(queryDocsByKeyInner.notCalled).to.be.true;
        expect(fetchAndFilterOuter.firstCall.args[0]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[1]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[2]).to.be.equal(limit);
        expect(fetchAndFilterInner.calledOnceWithExactly(limit, Number(notNullCursor))).to.be.true;
        expect(isPlace.notCalled).to.be.true;
      });

      it('throws an error if place type is invalid/does not exist', async () => {
        await expect(Place.v1.getPage(localContext)(invalidPlaceTypeQualifier, cursor, limit)).to.be.rejectedWith(
          `Invalid contact type [${invalidPlaceTypeQualifier.contactType}].`
        );

        expect(settingsGetAll.calledOnce).to.be.true;
        expect(getPlaceTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(queryDocsByKeyOuter.calledOnceWithExactly(localContext.medicDb, 'medic-client/contacts_by_type'))
          .to.be.true;
        expect(queryDocsByKeyInner.notCalled).to.be.true;
        expect(fetchAndFilterInner.notCalled).to.be.true;
        expect(fetchAndFilterOuter.notCalled).to.be.true;
        expect(isPlace.notCalled).to.be.true;
      });

      [
        {},
        '-1',
        undefined,
      ].forEach((invalidSkip ) => {
        it(`throws an error if cursor is invalid: ${JSON.stringify(invalidSkip)}`, async () => {
          await expect(Place.v1.getPage(localContext)(placeTypeQualifier, invalidSkip as string, limit))
            .to.be.rejectedWith(`The cursor must be a string or null for first page: [${JSON.stringify(invalidSkip)}]`);

          expect(settingsGetAll.calledOnce).to.be.true;
          expect(getPlaceTypes.calledOnceWithExactly(settings)).to.be.true;
          expect(queryDocsByKeyOuter.calledOnceWithExactly(
            localContext.medicDb, 'medic-client/contacts_by_type'
          )).to.be.true;
          expect(queryDocsByKeyInner.notCalled).to.be.true;
          expect(fetchAndFilterInner.notCalled).to.be.true;
          expect(fetchAndFilterOuter.notCalled).to.be.true;
          expect(isPlace.notCalled).to.be.true;
        });
      });

      it('returns empty array if places does not exist', async () => {
        const expectedResult = {
          data: [],
          cursor
        };
        fetchAndFilterInner.resolves(expectedResult);

        const res = await Place.v1.getPage(localContext)(placeTypeQualifier, cursor, limit);

        expect(res).to.deep.equal(expectedResult);
        expect(settingsGetAll.calledOnce).to.be.true;
        expect(getPlaceTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(
          queryDocsByKeyOuter.calledOnceWithExactly(localContext.medicDb, 'medic-client/contacts_by_type')
        ).to.be.true;
        expect(queryDocsByKeyInner.notCalled).to.be.true;
        expect(fetchAndFilterOuter.firstCall.args[0]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[1]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[2]).to.be.equal(limit);
        expect(fetchAndFilterInner.calledOnceWithExactly(limit, Number(cursor))).to.be.true;
        expect(isPlace.notCalled).to.be.true;
      });
    });

    describe('create', () => {
      let createDocInner: SinonStub;
      let createDocOuter: SinonStub;
      let getDocByIdInner: SinonStub;
      let getDocByIdOuter: SinonStub;
      let getPlaceTypes: SinonStub;
      let getTypeId: SinonStub;
      let fetchHydratedDocInner: SinonStub;
      let fetchHydratedDocOuter: SinonStub;

      beforeEach(() => {
        createDocInner = sinon.stub();
        createDocOuter = sinon.stub(LocalDoc, 'createDoc').returns(createDocInner);
        getDocByIdInner = sinon.stub();
        getDocByIdOuter = sinon.stub(LocalDoc, 'getDocById').returns(getDocByIdInner);
        getPlaceTypes = sinon.stub(contactTypeUtils, 'getPlaceTypes');
        getTypeId = sinon.stub(contactTypeUtils, 'getTypeId');
        fetchHydratedDocInner = sinon.stub();
        fetchHydratedDocOuter = sinon.stub(Lineage, 'fetchHydratedDoc').returns(fetchHydratedDocInner);
        settingsGetAll.returns(settings);
      });

      it('creates a place with minimal data', async () => {
        const placeType = { id: 'clinic', parents: [] };
        const qualifier = { type: 'clinic', name: 'Test Clinic' };
        const createdDoc = { _id: 'generated-uuid', _rev: '1-abc', ...qualifier, reported_date: 12345 };

        getPlaceTypes.returns([placeType]);
        createDocInner.resolves(createdDoc);
        isPlace.returns(true);

        const result = await Place.v1.create(localContext)(qualifier);

        expect(result).to.deep.equal(createdDoc);
        expect(getPlaceTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(createDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(createDocInner.calledOnce).to.be.true;
        expect(createDocInner.firstCall.args[0]).to.include({ type: 'clinic', name: 'Test Clinic' });
        expect(createDocInner.firstCall.args[0]).to.have.property('reported_date');
        expect(isPlace.calledOnceWithExactly(settings, createdDoc)).to.be.true;
      });

      it('creates a place with provided reported_date', async () => {
        const placeType = { id: 'clinic', parents: [] };
        const qualifier = { type: 'clinic', name: 'Test Clinic', reported_date: 99999 };
        const createdDoc = { _id: 'generated-uuid', _rev: '1-abc', ...qualifier };

        getPlaceTypes.returns([placeType]);
        createDocInner.resolves(createdDoc);
        isPlace.returns(true);

        const result = await Place.v1.create(localContext)(qualifier);

        expect(result).to.deep.equal(createdDoc);
        expect(createDocInner.calledOnce).to.be.true;
        expect(createDocInner.firstCall.args[0]).to.include({ reported_date: 99999 });
      });

      it('converts ISO string reported_date to epoch milliseconds', async () => {
        const placeType = { id: 'clinic', parents: [] };
        const isoDate = '2025-01-15T10:30:00.000Z';
        const expectedEpoch = new Date(isoDate).getTime();
        const qualifier = { type: 'clinic', name: 'Test Clinic', reported_date: isoDate };
        const createdDoc = {
          _id: 'generated-uuid',
          _rev: '1-abc',
          type: 'clinic',
          name: 'Test Clinic',
          reported_date: expectedEpoch
        };

        getPlaceTypes.returns([placeType]);
        createDocInner.resolves(createdDoc);
        isPlace.returns(true);

        const result = await Place.v1.create(localContext)(qualifier);

        expect(result).to.deep.equal(createdDoc);
        expect(createDocInner.calledOnce).to.be.true;
        expect(createDocInner.firstCall.args[0]).to.have.property('reported_date', expectedEpoch);
        expect(createDocInner.firstCall.args[0].reported_date).to.be.a('number');
      });

      it('converts ISO string with milliseconds to epoch milliseconds', async () => {
        const placeType = { id: 'clinic', parents: [] };
        const isoDate = '2025-01-15T10:30:00.123Z';
        const expectedEpoch = new Date(isoDate).getTime();
        const qualifier = { type: 'clinic', name: 'Test Clinic', reported_date: isoDate };
        const createdDoc = {
          _id: 'generated-uuid',
          _rev: '1-abc',
          type: 'clinic',
          name: 'Test Clinic',
          reported_date: expectedEpoch
        };

        getPlaceTypes.returns([placeType]);
        createDocInner.resolves(createdDoc);
        isPlace.returns(true);

        const result = await Place.v1.create(localContext)(qualifier);

        expect(result).to.deep.equal(createdDoc);
        expect(createDocInner.calledOnce).to.be.true;
        expect(createDocInner.firstCall.args[0]).to.have.property('reported_date', expectedEpoch);
      });

      it('throws an error for invalid reported_date string', async () => {
        const placeType = { id: 'clinic', parents: [] };
        const qualifier = { type: 'clinic', name: 'Test Clinic', reported_date: 'invalid-date' };

        getPlaceTypes.returns([placeType]);

        await expect(Place.v1.create(localContext)(qualifier))
          .to.be.rejectedWith('Invalid reported_date [invalid-date]. Must be a valid date string or timestamp.');

        expect(createDocInner.notCalled).to.be.true;
      });

      it('throws an error if place type is invalid', async () => {
        const qualifier = { type: 'invalid-type', name: 'Test Place' };

        getPlaceTypes.returns([{ id: 'clinic', parents: [] }]);

        await expect(Place.v1.create(localContext)(qualifier))
          .to.be.rejectedWith('Invalid place type [invalid-type].');

        expect(getPlaceTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(createDocInner.notCalled).to.be.true;
      });

      it('throws an error if _rev is provided for create', async () => {
        const placeType = { id: 'clinic', parents: [] };
        const qualifier = { type: 'clinic', name: 'Test Clinic', _rev: '1-abc' };

        getPlaceTypes.returns([placeType]);

        await expect(Place.v1.create(localContext)(qualifier))
          .to.be.rejectedWith('_rev is not allowed for create operations.');

        expect(getPlaceTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(createDocInner.notCalled).to.be.true;
      });

      it('throws an error if parent is required but not provided', async () => {
        const placeType = { id: 'health_center', parents: ['district'] };
        const qualifier = { type: 'health_center', name: 'Health Center' };

        getPlaceTypes.returns([placeType]);

        await expect(Place.v1.create(localContext)(qualifier))
          .to.be.rejectedWith('parent is required for place type [health_center].');

        expect(getPlaceTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(createDocInner.notCalled).to.be.true;
      });

      it('throws an error if parent is provided for top-level place type', async () => {
        const placeType = { id: 'district', parents: [] };
        const qualifier = { type: 'district', name: 'District', parent: 'parent-uuid' };

        getPlaceTypes.returns([placeType]);

        await expect(Place.v1.create(localContext)(qualifier))
          .to.be.rejectedWith('parent is not allowed for place type [district]. This is a top-level place type.');

        expect(getPlaceTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(createDocInner.notCalled).to.be.true;
      });

      it('throws an error if parent document is not found', async () => {
        const placeType = { id: 'health_center', parents: ['district'] };
        const qualifier = { type: 'health_center', name: 'Health Center', parent: 'parent-uuid' };

        getPlaceTypes.returns([placeType]);
        getDocByIdInner.resolves(null);

        await expect(Place.v1.create(localContext)(qualifier))
          .to.be.rejectedWith('Parent document [parent-uuid] not found.');

        expect(getPlaceTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly('parent-uuid')).to.be.true;
        expect(createDocInner.notCalled).to.be.true;
      });

      it('throws an error if parent type is invalid', async () => {
        const placeType = { id: 'health_center', parents: ['district'] };
        const qualifier = { type: 'health_center', name: 'Health Center', parent: 'parent-uuid' };
        const parentDoc = { _id: 'parent-uuid', type: 'wrong_parent' };

        getPlaceTypes.returns([placeType]);
        getDocByIdInner.resolves(parentDoc);
        getTypeId.returns('wrong_parent');

        await expect(Place.v1.create(localContext)(qualifier))
          .to.be.rejectedWith(
            'Invalid parent type [wrong_parent] for place type [health_center]. Allowed parent types: [district].'
          );

        expect(getPlaceTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly('parent-uuid')).to.be.true;
        expect(getTypeId.calledOnceWithExactly(parentDoc)).to.be.true;
        expect(createDocInner.notCalled).to.be.true;
      });

      it('creates a place with parent as string UUID', async () => {
        const placeType = { id: 'health_center', parents: ['district'] };
        const qualifier = { type: 'health_center', name: 'Health Center', parent: 'parent-uuid' };
        const parentDoc = { _id: 'parent-uuid', type: 'district' };
        const hydratedParent = { _id: 'parent-uuid' };
        const createdDoc = {
          _id: 'generated-uuid',
          _rev: '1-abc',
          type: 'health_center',
          name: 'Health Center',
          parent: hydratedParent,
          reported_date: 12345
        };

        getPlaceTypes.returns([placeType]);
        getDocByIdInner.resolves(parentDoc);
        getTypeId.returns('district');
        fetchHydratedDocInner.resolves(hydratedParent);
        createDocInner.resolves(createdDoc);
        isPlace.returns(true);

        const result = await Place.v1.create(localContext)(qualifier);

        expect(result).to.deep.equal(createdDoc);
        expect(getDocByIdInner.calledOnceWithExactly('parent-uuid')).to.be.true;
        expect(fetchHydratedDocOuter.calledWith(localContext.medicDb)).to.be.true;
        expect(fetchHydratedDocInner.calledWith('parent-uuid')).to.be.true;
        expect(createDocInner.calledOnce).to.be.true;
        expect(createDocInner.firstCall.args[0]).to.have.property('parent');
      });

      it('creates a place with contact field', async () => {
        const placeType = { id: 'clinic', parents: [] };
        const qualifier = { type: 'clinic', name: 'Clinic', contact: 'contact-uuid' };
        const hydratedContact = { _id: 'contact-uuid' };
        const createdDoc = {
          _id: 'generated-uuid',
          _rev: '1-abc',
          type: 'clinic',
          name: 'Clinic',
          contact: hydratedContact,
          reported_date: 12345
        };

        getPlaceTypes.returns([placeType]);
        fetchHydratedDocInner.resolves(hydratedContact);
        createDocInner.resolves(createdDoc);
        isPlace.returns(true);

        const result = await Place.v1.create(localContext)(qualifier);

        expect(result).to.deep.equal(createdDoc);
        expect(fetchHydratedDocOuter.calledWith(localContext.medicDb)).to.be.true;
        expect(fetchHydratedDocInner.calledWith('contact-uuid')).to.be.true;
        expect(createDocInner.calledOnce).to.be.true;
        expect(createDocInner.firstCall.args[0]).to.have.property('contact');
      });

      it('throws an error if created document is not a valid place', async () => {
        const placeType = { id: 'clinic', parents: [] };
        const qualifier = { type: 'clinic', name: 'Test Clinic' };
        const createdDoc = { _id: 'generated-uuid', _rev: '1-abc', ...qualifier, reported_date: 12345 };

        getPlaceTypes.returns([placeType]);
        createDocInner.resolves(createdDoc);
        isPlace.returns(false);

        await expect(Place.v1.create(localContext)(qualifier))
          .to.be.rejectedWith(`Created document [${createdDoc._id}] is not a valid place.`);

        expect(isPlace.calledOnceWithExactly(settings, createdDoc)).to.be.true;
      });
    });

    describe('update', () => {
      let updateDocInner: SinonStub;
      let updateDocOuter: SinonStub;
      let getDocByIdInner: SinonStub;
      let getDocByIdOuter: SinonStub;
      let getPlaceTypes: SinonStub;
      let getTypeId: SinonStub;
      let fetchHydratedDocInner: SinonStub;
      let fetchHydratedDocOuter: SinonStub;

      beforeEach(() => {
        updateDocInner = sinon.stub();
        updateDocOuter = sinon.stub(LocalDoc, 'updateDoc').returns(updateDocInner);
        getDocByIdInner = sinon.stub();
        getDocByIdOuter = sinon.stub(LocalDoc, 'getDocById').returns(getDocByIdInner);
        getPlaceTypes = sinon.stub(contactTypeUtils, 'getPlaceTypes');
        getTypeId = sinon.stub(contactTypeUtils, 'getTypeId');
        fetchHydratedDocInner = sinon.stub();
        fetchHydratedDocOuter = sinon.stub(Lineage, 'fetchHydratedDoc').returns(fetchHydratedDocInner);
        settingsGetAll.returns(settings);
      });

      it('updates a place successfully', async () => {
        const placeType = { id: 'clinic', parents: [] };
        const existingDoc = {
          _id: 'place-uuid',
          _rev: '1-abc',
          type: 'clinic',
          name: 'Old Name',
          reported_date: 12345
        };
        const qualifier = {
          _id: 'place-uuid',
          _rev: '1-abc',
          type: 'clinic',
          name: 'New Name',
          reported_date: 12345
        };
        const updatedDoc = { ...qualifier, _rev: '2-def' };

        getPlaceTypes.returns([placeType]);
        getDocByIdInner.resolves(existingDoc);
        updateDocInner.resolves(updatedDoc);
        isPlace.returns(true);

        const result = await Place.v1.update(localContext)(qualifier);

        expect(result).to.deep.equal(updatedDoc);
        expect(getPlaceTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly('place-uuid')).to.be.true;
        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(updateDocInner.calledOnce).to.be.true;
        expect(isPlace.calledOnceWithExactly(settings, updatedDoc)).to.be.true;
      });

      it('throws an error if place type is invalid', async () => {
        const qualifier = { _id: 'place-uuid', _rev: '1-abc', type: 'invalid-type', name: 'Name' };

        getPlaceTypes.returns([{ id: 'clinic', parents: [] }]);

        await expect(Place.v1.update(localContext)(qualifier))
          .to.be.rejectedWith('Invalid place type [invalid-type].');

        expect(getPlaceTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(updateDocInner.notCalled).to.be.true;
      });

      it('throws an error if _id is not provided', async () => {
        const placeType = { id: 'clinic', parents: [] };
        const qualifier = { _rev: '1-abc', type: 'clinic', name: 'Name' };

        getPlaceTypes.returns([placeType]);

        await expect(Place.v1.update(localContext)(qualifier))
          .to.be.rejectedWith('_id is required for update operations.');

        expect(updateDocInner.notCalled).to.be.true;
      });

      it('throws an error if _rev is not provided', async () => {
        const placeType = { id: 'clinic', parents: [] };
        const qualifier = { _id: 'place-uuid', type: 'clinic', name: 'Name' };

        getPlaceTypes.returns([placeType]);

        await expect(Place.v1.update(localContext)(qualifier))
          .to.be.rejectedWith('_rev is required for update operations.');

        expect(updateDocInner.notCalled).to.be.true;
      });

      it('throws NotFoundError if document is not found', async () => {
        const placeType = { id: 'clinic', parents: [] };
        const qualifier = { _id: 'place-uuid', _rev: '1-abc', type: 'clinic', name: 'Name' };

        getPlaceTypes.returns([placeType]);
        getDocByIdInner.resolves(null);

        await expect(Place.v1.update(localContext)(qualifier))
          .to.be.rejectedWith(NotFoundError, 'Document [place-uuid] not found.');

        expect(getDocByIdInner.calledOnceWithExactly('place-uuid')).to.be.true;
        expect(updateDocInner.notCalled).to.be.true;
      });

      it('throws an error if type is changed', async () => {
        const placeType = { id: 'new-type', parents: [] };
        const existingDoc = { _id: 'place-uuid', _rev: '1-abc', type: 'old-type', name: 'Name', reported_date: 12345 };
        const qualifier = { _id: 'place-uuid', _rev: '1-abc', type: 'new-type', name: 'Name', reported_date: 12345 };

        getPlaceTypes.returns([placeType]);
        getDocByIdInner.resolves(existingDoc);

        await expect(Place.v1.update(localContext)(qualifier))
          .to.be.rejectedWith(
            'Field [type] is immutable and cannot be changed. Current value: [old-type], Attempted value: [new-type].'
          );

        expect(getDocByIdInner.calledOnceWithExactly('place-uuid')).to.be.true;
        expect(updateDocInner.notCalled).to.be.true;
      });

      it('throws an error if reported_date is changed', async () => {
        const placeType = { id: 'clinic', parents: [] };
        const existingDoc = {
          _id: 'place-uuid',
          _rev: '1-abc',
          type: 'clinic',
          name: 'Name',
          reported_date: 12345
        };
        const qualifier = {
          _id: 'place-uuid',
          _rev: '1-abc',
          type: 'clinic',
          name: 'Name',
          reported_date: 99999
        };

        getPlaceTypes.returns([placeType]);
        getDocByIdInner.resolves(existingDoc);

        await expect(Place.v1.update(localContext)(qualifier))
          .to.be.rejectedWith(
            'Field [reported_date] is immutable and cannot be changed. Current value: [12345], Attempted value: [99999].'
          );

        expect(getDocByIdInner.calledOnceWithExactly('place-uuid')).to.be.true;
        expect(updateDocInner.notCalled).to.be.true;
      });

      it('throws an error if contact is changed', async () => {
        const placeType = { id: 'clinic', parents: [] };
        const existingDoc = {
          _id: 'place-uuid',
          _rev: '1-abc',
          type: 'clinic',
          name: 'Name',
          contact: 'old-contact-uuid',
          reported_date: 12345
        };
        const qualifier = {
          _id: 'place-uuid',
          _rev: '1-abc',
          type: 'clinic',
          name: 'Name',
          contact: 'new-contact-uuid',
          reported_date: 12345
        };

        getPlaceTypes.returns([placeType]);
        getDocByIdInner.resolves(existingDoc);

        await expect(Place.v1.update(localContext)(qualifier))
          .to.be.rejectedWith(
            'Field [contact] is immutable and cannot be changed. ' +
            'Current value: [old-contact-uuid], Attempted value: [new-contact-uuid].'
          );

        expect(updateDocInner.notCalled).to.be.true;
      });

      it('throws an error if updated document is not a valid place', async () => {
        const placeType = { id: 'clinic', parents: [] };
        const existingDoc = { _id: 'place-uuid', _rev: '1-abc', type: 'clinic', name: 'Name', reported_date: 12345 };
        const qualifier = { _id: 'place-uuid', _rev: '1-abc', type: 'clinic', name: 'New Name', reported_date: 12345 };
        const updatedDoc = { ...qualifier, _rev: '2-def' };

        getPlaceTypes.returns([placeType]);
        getDocByIdInner.resolves(existingDoc);
        updateDocInner.resolves(updatedDoc);
        isPlace.returns(false);

        await expect(Place.v1.update(localContext)(qualifier))
          .to.be.rejectedWith(`Updated document [${updatedDoc._id}] is not a valid place.`);

        expect(isPlace.calledOnceWithExactly(settings, updatedDoc)).to.be.true;
      });
    });
  });
});
