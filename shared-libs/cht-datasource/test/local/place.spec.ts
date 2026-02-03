import sinon, { SinonStub } from 'sinon';
import contactTypeUtils from '@medic/contact-types-utils';
import logger from '@medic/logger';
import { Doc } from '../../src/libs/doc';
import * as Place from '../../src/local/place';
import * as LocalDoc from '../../src/local/libs/doc';
import { expect } from 'chai';
import { LocalDataContext } from '../../src/local/libs/data-context';
import * as Lineage from '../../src/local/libs/lineage';
import * as LocalCore from '../../src/local/libs/core';
import * as Input from '../../src/input';
import { InvalidArgumentError, ResourceNotFoundError } from '../../src';
import * as LocalContact from '../../src/local/contact';

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
        // Doc needs _id and _rev for isDoc check to pass
        const doc = { type: 'clinic', _id: 'uuid', _rev: '1' };
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
        // Doc needs _id and _rev for isDoc check to pass, otherwise contactTypeUtils.isPlace isn't called
        const doc = { type: 'not-place', '_id': 'id', '_rev': '1' };
        getDocByIdInner.resolves(doc);
        settingsGetAll.returns(settings);
        isPlace.returns(false);

        const result = await Place.v1.get(localContext)(identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        // contactTypeUtils.isPlace is called with settings.getAll() (the data), not settings (the service)
        expect(isPlace.calledOnceWithExactly(settings, doc)).to.be.true;
        expect(warn.calledOnceWithExactly(`Document [${identifier.uuid}] is not a valid place.`)).to.be.true;
      });

      it('returns null if the identified doc is not found', async () => {
        getDocByIdInner.resolves(null);
        settingsGetAll.returns(settings);
        isPlace.returns(false);

        const result = await Place.v1.get(localContext)(identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        // contactTypeUtils.isPlace is NOT called when doc is null (isDoc check fails early)
        expect(isPlace.notCalled).to.be.true;
        expect(warn.calledOnceWithExactly(`Document [${identifier.uuid}] is not a valid place.`)).to.be.true;
      });
    });

    describe('getWithLineage', () => {
      const identifier = { uuid: 'place0' } as const;
      let mockFetchHydratedDoc: SinonStub;

      beforeEach(() => {
        mockFetchHydratedDoc = sinon.stub(Lineage, 'fetchHydratedDoc');
      });

      it('returns a place with lineage', async () => {
        const placeWithLineage = {
          type: 'place', _id: 'place0', _rev: 'rev',
          contact: { _id: 'contact0', _rev: 'rev' }
        };
        const mockFunction = sinon.stub().resolves(placeWithLineage);
        mockFetchHydratedDoc.returns(mockFunction);
        isPlace.returns(true);
        settingsGetAll.returns(settings);

        const result = await Place.v1.getWithLineage(localContext)(identifier);

        expect(result).to.equal(placeWithLineage);
        expect(mockFetchHydratedDoc.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(mockFunction.calledOnceWithExactly(identifier.uuid)).to.be.true;
        // contactTypeUtils.isPlace is called with settings.getAll() (the data)
        expect(isPlace.calledOnceWithExactly(settings, placeWithLineage)).to.be.true;
        expect(warn.notCalled).to.be.true;
        expect(debug.notCalled).to.be.true;
      });

      it('returns null when no place or lineage is found', async () => {
        const mockFunction = sinon.stub().resolves(null);
        mockFetchHydratedDoc.returns(mockFunction);
        settingsGetAll.returns(settings);
        isPlace.returns(false);

        const result = await Place.v1.getWithLineage(localContext)(identifier);

        expect(result).to.be.null;
        expect(mockFetchHydratedDoc.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(mockFunction.calledOnceWithExactly(identifier.uuid)).to.be.true;
        // contactTypeUtils.isPlace is NOT called when doc is null (isDoc check fails early)
        expect(isPlace.notCalled).to.be.true;
        expect(warn.calledOnceWithExactly(`Document [${identifier.uuid}] is not a valid place.`)).to.be.true;
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
      const placeTypeQualifier = { contactType: placeIdentifier } as const;
      const invalidPlaceTypeQualifier = { contactType: 'invalid' } as const;
      const placeType = [{ person: true, id: placeIdentifier }] as Record<string, unknown>[];
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
      ].forEach((invalidSkip) => {
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
      const minifiedParent = {
        _id: 'district-1',
        parent: { _id: 'district-2' }
      } as const;
      const parent = {
        ...minifiedParent,
        _rev: '1',
        type: 'district_hospital',
        name: 'parent'
      } as const;
      const minifiedContact = {
        _id: 'contact-1',
        parent: { _id: minifiedParent._id }
      };
      const contact = {
        ...minifiedContact,
        _rev: '1',
        type: 'person'
      } as const;
      const placeDoc = { hello: 'world' };
      const reportedDate = new Date().getTime();

      let getDocsByIdsOuter: SinonStub;
      let getDocsByIdsInner: SinonStub;
      let createDocOuter: SinonStub;
      let createDocInner: SinonStub;
      let getTypeById: SinonStub;
      let getReportedDateTimestamp: SinonStub;
      let isContact: SinonStub;

      beforeEach(() => {
        getDocsByIdsInner = sinon.stub();
        getDocsByIdsOuter = sinon.stub(LocalDoc, 'getDocsByIds').returns(getDocsByIdsInner);
        createDocInner = sinon.stub().resolves(placeDoc);
        createDocOuter = sinon.stub(LocalDoc, 'createDoc').returns(createDocInner);
        settingsGetAll.returns(settings);
        getTypeById = sinon.stub(contactTypeUtils, 'getTypeById');
        getReportedDateTimestamp = sinon.stub(LocalCore, 'getReportedDateTimestamp');
        isContact = sinon
          .stub(LocalContact.v1, 'isContact')
          .returns(true);
        isPlace.returns(true);
        getReportedDateTimestamp.returns(reportedDate);
      });

      it('throws error if input validation fails', async () => {
        const input = {
          name: 'place-1',
          type: 'health_center',
          _rev: '1-rev',
          parent: 'district-1'
        };

        await expect(
          Place.v1.create(localContext)(input as unknown as Input.v1.PlaceInput)
        ).to.be.rejectedWith('The [_rev] field must not be set.');

        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(createDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(settingsGetAll.notCalled).to.be.true;
        expect(getTypeById.notCalled).to.be.true;
        expect(isPlace.notCalled).to.be.true;
        expect(getDocsByIdsInner.notCalled).to.be.true;
        expect(getReportedDateTimestamp.notCalled).to.be.true;
        expect(isContact.notCalled).to.be.true;
        expect(createDocInner.notCalled).to.be.true;
      });

      [
        { id: 'not-a-place', person: true }, // Person type
        null // Non-existent type
      ].forEach((typeData) => {
        it(`throws error if input type is not a place: ${JSON.stringify(typeData)}`, async () => {
          getTypeById.returns(typeData);
          const placeInput = {
            type: 'not-a-place',
            name: 'place-1',
            parent: 'district-1'
          };

          await expect(Place.v1.create(localContext)(placeInput))
            .to.be.rejectedWith('[not-a-place] is not a valid place type.');

          expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(createDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(settingsGetAll.calledOnce).to.be.true;
          expect(getTypeById.calledOnceWithExactly(settings, placeInput.type)).to.be.true;
          expect(isPlace.notCalled).to.be.true;
          expect(getDocsByIdsInner.notCalled).to.be.true;
          expect(getReportedDateTimestamp.notCalled).to.be.true;
          expect(isContact.notCalled).to.be.true;
          expect(createDocInner.notCalled).to.be.true;
        });
      });

      it('creates a place with default place type', async () => {
        const input = {
          name: 'place-1',
          type: 'health_center',
          parent: parent._id,
        };
        getDocsByIdsInner.resolves([parent, null]);

        const place = await Place.v1.create(localContext)(input);

        expect(place).to.equal(placeDoc);
        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(createDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(settingsGetAll.calledThrice).to.be.true;
        expect(getTypeById.args).to.deep.equal([
          [settings, input.type],
          [settings, input.type],
          [settings, input.type]
        ]);
        expect(isPlace.calledOnceWithExactly(settings, parent)).to.be.true;
        expect(getDocsByIdsInner.calledOnceWithExactly([parent._id, undefined])).to.be.true;
        expect(getReportedDateTimestamp.calledOnceWithExactly(undefined)).to.be.true;
        expect(isContact.notCalled).to.be.true;
        const expectedDoc = {
          ...input,
          contact: undefined,
          parent: minifiedParent,
          reported_date: reportedDate
        };
        expect(createDocInner.calledOnceWithExactly(expectedDoc)).to.be.true;
      });

      it('creates a place with custom place type', async () => {
        const customPlaceType = { id: 'custom-place', person: false, parents: [parent.type] };
        const input = {
          name: 'place-1',
          type: customPlaceType.id,
          parent: parent._id,
          reported_date: 123445566
        };
        getTypeById.returns(customPlaceType);
        getDocsByIdsInner.resolves([parent, null]);
        getReportedDateTimestamp.returns(input.reported_date);

        const place = await Place.v1.create(localContext)(input);

        expect(place).to.equal(placeDoc);
        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(createDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(settingsGetAll.calledThrice).to.be.true;
        expect(getTypeById.args).to.deep.equal([
          [settings, input.type],
          [settings, input.type],
          [settings, input.type]
        ]);
        expect(isPlace.calledOnceWithExactly(settings, parent)).to.be.true;
        expect(getDocsByIdsInner.calledOnceWithExactly([parent._id, undefined])).to.be.true;
        expect(getReportedDateTimestamp.calledOnceWithExactly(input.reported_date)).to.be.true;
        expect(isContact.notCalled).to.be.true;
        const expectedDoc = {
          ...input,
          type: 'contact',
          contact_type: input.type,
          contact: undefined,
          parent: minifiedParent,
        };
        expect(createDocInner.calledOnceWithExactly(expectedDoc)).to.be.true;
      });

      it('creates a place with primary contact', async () => {
        const input = {
          name: 'place-1',
          type: 'health_center',
          parent: parent._id,
          contact: contact._id
        };
        getDocsByIdsInner.resolves([parent, contact]);
        isPlace.returns(true);

        const place = await Place.v1.create(localContext)(input);

        expect(place).to.equal(placeDoc);
        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(createDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(settingsGetAll.calledThrice).to.be.true;
        expect(getTypeById.args).to.deep.equal([
          [settings, input.type],
          [settings, input.type],
          [settings, input.type]
        ]);
        expect(isPlace.calledOnceWithExactly(settings, parent)).to.be.true;
        expect(getDocsByIdsInner.calledOnceWithExactly([parent._id, contact._id])).to.be.true;
        expect(getReportedDateTimestamp.calledOnceWithExactly(undefined)).to.be.true;
        expect(isContact.calledOnceWithExactly(localContext.settings, contact)).to.be.true;
        const expectedDoc = {
          ...input,
          contact: minifiedContact,
          parent: minifiedParent,
          reported_date: reportedDate
        };
        expect(createDocInner.calledOnceWithExactly(expectedDoc)).to.be.true;
      });

      it('creates a place without parent for top-level type', async () => {
        const input = {
          name: 'place-1',
          type: 'district_hospital',
        };
        getDocsByIdsInner.resolves([null, null]);

        const place = await Place.v1.create(localContext)(input);

        expect(place).to.equal(placeDoc);
        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(createDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(settingsGetAll.calledTwice).to.be.true;
        expect(getTypeById.args).to.deep.equal([
          [settings, input.type],
          [settings, input.type],
          [settings, input.type]
        ]);
        expect(isPlace.notCalled).to.be.true;
        expect(getDocsByIdsInner.calledOnceWithExactly([undefined, undefined])).to.be.true;
        expect(getReportedDateTimestamp.calledOnceWithExactly(undefined)).to.be.true;
        expect(isContact.notCalled).to.be.true;
        const expectedDoc = {
          ...input,
          contact: undefined,
          parent: undefined,
          reported_date: reportedDate
        };
        expect(createDocInner.calledOnceWithExactly(expectedDoc)).to.be.true;
      });

      it('throws error when parent doc is not found', async () => {
        const input = {
          name: 'place-1',
          type: 'health_center',
          parent: parent._id,
        };
        getDocsByIdsInner.resolves([null, null]);
        isPlace.returns(false);

        await expect(Place.v1.create(localContext)(input))
          .to.be.rejectedWith(`Parent contact [${input.parent}] not found.`);

        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(createDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(settingsGetAll.calledTwice).to.be.true;
        expect(getTypeById.args).to.deep.equal([
          [settings, input.type],
          [settings, input.type],
          [settings, input.type]
        ]);
        expect(isPlace.notCalled).to.be.true;
        expect(getDocsByIdsInner.calledOnceWithExactly([parent._id, undefined])).to.be.true;
        expect(getReportedDateTimestamp.notCalled).to.be.true;
        expect(isContact.notCalled).to.be.true;
        expect(createDocInner.notCalled).to.be.true;
      });

      it('throws error when parent type is invalid', async () => {
        const input = {
          name: 'place-1',
          type: 'health_center',
          parent: parent._id,
        };
        const invalidParent = { ...parent, type: 'clinic' };
        getDocsByIdsInner.resolves([invalidParent, null]);
        isPlace.returns(true);

        await expect(Place.v1.create(localContext)(input))
          .to.be.rejectedWith(`Parent contact of type [clinic] is not allowed for type [health_center].`);

        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(createDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(settingsGetAll.calledThrice).to.be.true;
        expect(getTypeById.args).to.deep.equal([
          [settings, input.type],
          [settings, input.type],
          [settings, input.type]
        ]);
        expect(isPlace.calledOnceWithExactly(settings, invalidParent)).to.be.true;
        expect(getDocsByIdsInner.calledOnceWithExactly([parent._id, undefined])).to.be.true;
        expect(getReportedDateTimestamp.notCalled).to.be.true;
        expect(isContact.notCalled).to.be.true;
        expect(createDocInner.notCalled).to.be.true;
      });

      it('throws error when parent provided for top level place type', async () => {
        const input = {
          name: 'place-1',
          type: 'district_hospital',
          parent: parent._id,
        };
        getDocsByIdsInner.resolves([parent, null]);
        isPlace.returns(true);

        await expect(Place.v1.create(localContext)(input))
          .to.be.rejectedWith(`Place type [district_hospital] does not support having a parent contact.`);

        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(createDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(settingsGetAll.calledTwice).to.be.true;
        expect(getTypeById.args).to.deep.equal([
          [settings, input.type],
          [settings, input.type],
          [settings, input.type]
        ]);
        expect(isPlace.notCalled).to.be.true;
        expect(getDocsByIdsInner.calledOnceWithExactly([parent._id, undefined])).to.be.true;
        expect(getReportedDateTimestamp.notCalled).to.be.true;
        expect(isContact.notCalled).to.be.true;
        expect(createDocInner.notCalled).to.be.true;
      });

      it('throws error when parent not provided for type that requires parent', async () => {
        const input = {
          name: 'place-1',
          type: 'health_center',
        };
        getDocsByIdsInner.resolves([null, null]);

        await expect(Place.v1.create(localContext)(input))
          .to.be.rejectedWith(`Place type [health_center] requires a parent contact.`);

        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(createDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(settingsGetAll.calledTwice).to.be.true;
        expect(getTypeById.args).to.deep.equal([
          [settings, input.type],
          [settings, input.type],
          [settings, input.type]
        ]);
        expect(isPlace.notCalled).to.be.true;
        expect(getDocsByIdsInner.calledOnceWithExactly([undefined, undefined])).to.be.true;
        expect(getReportedDateTimestamp.notCalled).to.be.true;
        expect(isContact.notCalled).to.be.true;
        expect(createDocInner.notCalled).to.be.true;
      });

      it('throws error when primary contact is not found', async () => {
        const input = {
          name: 'place-1',
          type: 'health_center',
          parent: parent._id,
          contact: 'non-existent-contact'
        };
        getDocsByIdsInner.resolves([parent, null]);
        isContact.returns(false);

        await expect(Place.v1.create(localContext)(input))
          .to.be.rejectedWith(`Primary contact [${input.contact}] not found.`);

        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(createDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(settingsGetAll.calledOnce).to.be.true;
        expect(getTypeById.args).to.deep.equal([
          [settings, input.type],
          [settings, input.type],
        ]);
        expect(isPlace.notCalled).to.be.true;
        expect(getDocsByIdsInner.calledOnceWithExactly([parent._id, input.contact])).to.be.true;
        expect(getReportedDateTimestamp.notCalled).to.be.true;
        expect(isContact.calledOnceWithExactly(localContext.settings, null)).to.be.true;
        expect(createDocInner.notCalled).to.be.true;
      });
    });

    describe('update', () => {
      const parentMinified = {
        _id: 'parent-1',
        parent: {
          _id: 'parent-2'
        }
      } as const;
      const parent = {
        ...parentMinified,
        name: 'Parent 1',
        type: 'district_hospital',
      } as const;

      const contactMinified = {
        _id: 'contact-1',
        parent: parentMinified
      } as const;
      const contact = {
        ...contactMinified,
        _rev: '1',
        type: 'person'
      } as const;
      const newContactMinified = {
        _id: 'contact-2',
        parent: {
          _id: 'parent-1'
        }
      };
      const newContact = {
        ...newContactMinified,
        _rev: '1',
        type: 'person'
      };

      const originalDoc = {
        _id: 'place-1',
        _rev: '1-rev',
        name: 'health center',
        type: 'health_center',
        reported_date: 12312312,
        parent: parentMinified,
        contact: contactMinified,
        hello: 'world'
      } as const;

      let getDocsByIdsOuter: SinonStub;
      let getDocsByIdsInner: SinonStub;
      let updateDocOuter: SinonStub;
      let updateDocInner: SinonStub;
      let getUpdatedContactOuter: SinonStub;
      let getUpdatedContactInner: SinonStub;

      beforeEach(() => {
        getDocsByIdsInner = sinon.stub();
        getDocsByIdsOuter = sinon.stub(LocalDoc, 'getDocsByIds').returns(getDocsByIdsInner);
        updateDocOuter = sinon.stub(LocalDoc, 'updateDoc');
        updateDocInner = sinon.stub();
        updateDocOuter.returns(updateDocInner);
        settingsGetAll.returns(settings);
        isPlace.returns(true);
        getUpdatedContactInner = sinon.stub();
        getUpdatedContactOuter = sinon.stub(Lineage, 'getUpdatedContact').returns(getUpdatedContactInner);
      });

      it('updates doc for valid update input', async () => {
        const updateDocInput = {
          ...originalDoc,
          name: 'health center 2',
          hello: undefined,
          world: 'hello'
        };
        getDocsByIdsInner.resolves([originalDoc, contact]);
        getUpdatedContactInner.returns(updateDocInput.contact);
        updateDocInner.resolves({ _rev: '2' });

        const result = await Place.v1.update(localContext)(updateDocInput);

        expect(result).to.deep.equal({ ...updateDocInput, _rev: '2' });
        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getUpdatedContactOuter.calledOnceWithExactly(localContext.settings, localContext.medicDb)).to.be.true;
        expect(settingsGetAll.calledTwice).to.be.true;
        expect(isPlace.args).to.deep.equal([
          [settings, updateDocInput],
          [settings, originalDoc],
        ]);
        expect(getDocsByIdsInner.calledOnceWithExactly([originalDoc._id, 'contact-1'])).to.be.true;
        expect(getUpdatedContactInner.calledOnceWithExactly(originalDoc, updateDocInput, contact)).to.be.true;
        expect(updateDocInner.calledOnceWithExactly(updateDocInput)).to.be.true;
      });

      [
        { ...originalDoc, _id: undefined },
        { ...originalDoc, _rev: undefined },
      ].forEach((updateDocInput) => {
        it('throws error if input type is not a doc', async () => {
          await expect(Place.v1.update(localContext)(updateDocInput as unknown as typeof originalDoc))
            .to.be.rejectedWith(InvalidArgumentError, 'Valid _id, _rev, and type fields must be provided.');

          expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(getUpdatedContactOuter.calledOnceWithExactly(localContext.settings, localContext.medicDb)).to.be.true;
          expect(settingsGetAll.notCalled).to.be.true;
          expect(isPlace.notCalled).to.be.true;
          expect(getDocsByIdsInner.notCalled).to.be.true;
          expect(getUpdatedContactInner.notCalled).to.be.true;
          expect(updateDocInner.notCalled).to.be.true;
        });
      });

      it('throws error if input does not have a place type', async () => {
        isPlace.returns(false);

        await expect(Place.v1.update(localContext)(originalDoc))
          .to.be.rejectedWith(InvalidArgumentError, 'Valid _id, _rev, and type fields must be provided.');

        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getUpdatedContactOuter.calledOnceWithExactly(localContext.settings, localContext.medicDb)).to.be.true;
        expect(settingsGetAll.calledOnce).to.be.true;
        expect(isPlace.calledOnceWithExactly(settings, originalDoc)).to.be.true;
        expect(getDocsByIdsInner.notCalled).to.be.true;
        expect(getUpdatedContactInner.notCalled).to.be.true;
        expect(updateDocInner.notCalled).to.be.true;
      });

      it('throws error when no place found', async () => {
        getDocsByIdsInner.resolves([null, contact]);

        await expect(Place.v1.update(localContext)(originalDoc))
          .to.be.rejectedWith(ResourceNotFoundError, `Place record [${originalDoc._id}] not found.`);

        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getUpdatedContactOuter.calledOnceWithExactly(localContext.settings, localContext.medicDb)).to.be.true;
        expect(settingsGetAll.calledOnce).to.be.true;
        expect(isPlace.calledOnceWithExactly(settings, originalDoc)).to.be.true;
        expect(getDocsByIdsInner.calledOnceWithExactly([originalDoc._id, 'contact-1'])).to.be.true;
        expect(getUpdatedContactInner.notCalled).to.be.true;
        expect(updateDocInner.notCalled).to.be.true;
      });

      ([
        ['_rev', { ...originalDoc, _rev: 'updated' }],
        ['reported_date', { ...originalDoc, reported_date: 'updated' }],
        ['type', { ...originalDoc, type: 'updated' }],
        ['contact_type', { ...originalDoc, contact_type: 'updated' }],
      ] as unknown as [string, typeof originalDoc][]).forEach(([field, updateDocInput]) => {
        it(`throws error when changing immutable field [${field}]`, async () => {
          getDocsByIdsInner.resolves([originalDoc, contact]);
          getUpdatedContactInner.returns(updateDocInput.contact);

          await expect(Place.v1.update(localContext)(updateDocInput))
            .to.be.rejectedWith(InvalidArgumentError, `The [${field}] field must not be changed.`);

          expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(getUpdatedContactOuter.calledOnceWithExactly(localContext.settings, localContext.medicDb)).to.be.true;
          expect(settingsGetAll.calledTwice).to.be.true;
          expect(isPlace.args).to.deep.equal([
            [settings, updateDocInput],
            [settings, originalDoc],
          ]);
          expect(getDocsByIdsInner.calledOnceWithExactly([originalDoc._id, 'contact-1'])).to.be.true;
          expect(getUpdatedContactInner.calledOnceWithExactly(originalDoc, updateDocInput, contact)).to.be.true;
          expect(updateDocInner.notCalled).to.be.true;
        });
      });

      it('throws error when trying to remove name value', async () => {
        getDocsByIdsInner.resolves([originalDoc, contact]);
        getUpdatedContactInner.returns(originalDoc.contact);
        const updateDocInput = { ...originalDoc, name: undefined };

        await expect(Place.v1.update(localContext)(updateDocInput))
          .to.be.rejectedWith(InvalidArgumentError, `The [name] field must have a [string] value.`);

        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getUpdatedContactOuter.calledOnceWithExactly(localContext.settings, localContext.medicDb)).to.be.true;
        expect(settingsGetAll.calledTwice).to.be.true;
        expect(isPlace.args).to.deep.equal([
          [settings, updateDocInput],
          [settings, originalDoc],
        ]);
        expect(getDocsByIdsInner.calledOnceWithExactly([originalDoc._id, 'contact-1'])).to.be.true;
        expect(getUpdatedContactInner.calledOnceWithExactly(originalDoc, updateDocInput, contact)).to.be.true;
        expect(updateDocInner.notCalled).to.be.true;
      });

      [
        { name: 'new name' }, // Set name
        { world: 'hello' } // Set custom value and leave name unset
      ].forEach(updated => {
        it('updates place that does not have an existing name value', async () => {
          const origDocWithoutName = {
            ...originalDoc,
            name: undefined
          };
          const updateDocInput = {
            ...origDocWithoutName,
            ...updated,
          };
          getDocsByIdsInner.resolves([origDocWithoutName, contact]);
          getUpdatedContactInner.returns(origDocWithoutName.contact);
          updateDocInner.resolves({ _rev: '2' });

          const result = await Place.v1.update(localContext)(updateDocInput);

          expect(result).to.deep.equal({ ...updateDocInput, _rev: '2' });
          expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(getUpdatedContactOuter.calledOnceWithExactly(localContext.settings, localContext.medicDb)).to.be.true;
          expect(settingsGetAll.calledTwice).to.be.true;
          expect(isPlace.args).to.deep.equal([
            [settings, updateDocInput],
            [settings, origDocWithoutName],
          ]);
          expect(getDocsByIdsInner.calledOnceWithExactly([origDocWithoutName._id, 'contact-1'])).to.be.true;
          expect(getUpdatedContactInner.calledOnceWithExactly(origDocWithoutName, updateDocInput, contact)).to.be.true;
          expect(updateDocInner.calledOnceWithExactly(updateDocInput)).to.be.true;
        });
      });

      it('updates place when lineage data included', async () => {
        const updateDocInput = {
          ...originalDoc,
          name: 'newName',
          parent,
          contact
        };
        getDocsByIdsInner.resolves([originalDoc, contact]);
        getUpdatedContactInner.returns(updateDocInput.contact);
        updateDocInner.resolves({ _rev: '2' });

        const result = await Place.v1.update(localContext)(updateDocInput);

        // Full lineage data returned
        expect(result).to.deep.equal({ ...updateDocInput, _rev: '2' });
        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getUpdatedContactOuter.calledOnceWithExactly(localContext.settings, localContext.medicDb)).to.be.true;
        expect(settingsGetAll.calledTwice).to.be.true;
        expect(isPlace.args).to.deep.equal([
          [settings, updateDocInput],
          [settings, originalDoc],
        ]);
        expect(getDocsByIdsInner.calledOnceWithExactly([originalDoc._id, 'contact-1'])).to.be.true;
        expect(getUpdatedContactInner.calledOnceWithExactly(originalDoc, updateDocInput, contact)).to.be.true;
        // Lineage minified
        const expectedPlace = {
          ...updateDocInput,
          parent: parentMinified,
          contact: contactMinified
        };
        expect(updateDocInner.calledOnceWithExactly(expectedPlace)).to.be.true;
      });

      [
        newContact, // Full contact
        newContactMinified, // Contact hierarchy
        newContact._id // Just Id
      ].forEach(contact => {
        it('updates place with new contact', async () => {
          const updateDocInput = {
            ...originalDoc,
            contact
          };
          getDocsByIdsInner.resolves([originalDoc, newContact]);
          getUpdatedContactInner.returns(newContact);
          updateDocInner.resolves({ _rev: '2' });

          const result = await Place.v1.update(localContext)(
            updateDocInput as unknown as typeof originalDoc
          );

          expect(result).to.deep.equal({ ...updateDocInput, contact: newContact, _rev: '2' });
          expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(getUpdatedContactOuter.calledOnceWithExactly(localContext.settings, localContext.medicDb)).to.be.true;
          expect(settingsGetAll.calledTwice).to.be.true;
          expect(isPlace.args).to.deep.equal([
            [settings, updateDocInput],
            [settings, originalDoc],
          ]);
          expect(getDocsByIdsInner.calledOnceWithExactly([originalDoc._id, 'contact-2'])).to.be.true;
          expect(getUpdatedContactInner.args).to.deep.equal([[originalDoc, updateDocInput, newContact]]);
          expect(updateDocInner.calledOnceWithExactly({
            ...updateDocInput,
            contact: newContactMinified
          })).to.be.true;
        });
      });

      it('updates place with new contact', async () => {
        const updateDocInput = {
          ...originalDoc,
          contact: newContactMinified
        };
        getDocsByIdsInner.resolves([originalDoc, newContact]);
        getUpdatedContactInner.returns(newContactMinified);
        updateDocInner.resolves({ _rev: '2' });

        const result = await Place.v1.update(localContext)(updateDocInput);

        expect(result).to.deep.equal({ ...updateDocInput, _rev: '2' });
        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getUpdatedContactOuter.calledOnceWithExactly(localContext.settings, localContext.medicDb)).to.be.true;
        expect(settingsGetAll.calledTwice).to.be.true;
        expect(isPlace.args).to.deep.equal([
          [settings, updateDocInput],
          [settings, originalDoc],
        ]);
        expect(getDocsByIdsInner.calledOnceWithExactly([originalDoc._id, 'contact-2'])).to.be.true;
        expect(getUpdatedContactInner.args).to.deep.equal([[originalDoc, updateDocInput, newContact]]);
        expect(updateDocInner.calledOnceWithExactly(updateDocInput)).to.be.true;
      });

      it('updates place without contact', async () => {
        const origDocWithoutContact = {
          ...originalDoc,
          contact: undefined
        };
        const updateDocInput = {
          ...origDocWithoutContact,
          name: 'updated name'
        };
        getDocsByIdsInner.resolves([origDocWithoutContact, undefined]);
        getUpdatedContactInner.returns(undefined);
        updateDocInner.resolves({ _rev: '2' });

        const result = await Place.v1.update(localContext)(updateDocInput);

        expect(result).to.deep.equal({ ...updateDocInput, _rev: '2' });
        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getUpdatedContactOuter.calledOnceWithExactly(localContext.settings, localContext.medicDb)).to.be.true;
        expect(settingsGetAll.calledTwice).to.be.true;
        expect(isPlace.args).to.deep.equal([
          [settings, updateDocInput],
          [settings, origDocWithoutContact],
        ]);
        expect(getDocsByIdsInner.calledOnceWithExactly([origDocWithoutContact._id, undefined])).to.be.true;
        expect(getUpdatedContactInner.calledOnceWithExactly(
          origDocWithoutContact,
          updateDocInput,
          undefined
        )).to.be.true;
        expect(updateDocInner.calledOnceWithExactly(updateDocInput)).to.be.true;
      });

      it('throws error when updating parent', async () => {
        const updateDocInput = {
          ...originalDoc,
          parent: { _id: 'parent-3', }
        };
        getDocsByIdsInner.resolves([originalDoc, contact]);
        getUpdatedContactInner.returns(updateDocInput.contact);

        await expect(Place.v1.update(localContext)(updateDocInput))
          .to.be.rejectedWith(InvalidArgumentError, `Parent lineage does not match.`);

        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getUpdatedContactOuter.calledOnceWithExactly(localContext.settings, localContext.medicDb)).to.be.true;
        expect(settingsGetAll.calledTwice).to.be.true;
        expect(isPlace.args).to.deep.equal([
          [settings, updateDocInput],
          [settings, originalDoc],
        ]);
        expect(getDocsByIdsInner.calledOnceWithExactly([originalDoc._id, 'contact-1'])).to.be.true;
        expect(getUpdatedContactInner.calledOnceWithExactly(originalDoc, updateDocInput, contact)).to.be.true;
        expect(updateDocInner.notCalled).to.be.true;
      });
    });
  });
});
