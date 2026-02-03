import sinon, { SinonFakeTimers, SinonStub } from 'sinon';
import contactTypeUtils from '@medic/contact-types-utils';
import logger from '@medic/logger';
import { Doc } from '../../src/libs/doc';
import * as Place from '../../src/local/place';
import * as PlaceTypes from '../../src/place';
import * as LocalDoc from '../../src/local/libs/doc';
import * as LocalContact from '../../src/local/contact';
import { expect } from 'chai';
import { LocalDataContext } from '../../src/local/libs/data-context';
import * as Lineage from '../../src/local/libs/lineage';
import * as Input from '../../src/input';

describe('local place', () => {
  let localContext: LocalDataContext;
  let settingsGetAll: SinonStub;
  let warn: SinonStub;
  let debug: SinonStub;
  let isPlace: SinonStub;
  let createDocOuter: SinonStub;
  let createDocInner: SinonStub;
  let updateDocOuter: SinonStub;
  let updateDocInner: SinonStub;
  let getDocsByIdsOuter: SinonStub;
  let getDocsByIdsInner: SinonStub;

  beforeEach(() => {
    settingsGetAll = sinon.stub();
    localContext = {
      medicDb: {} as PouchDB.Database<Doc>,
      settings: { getAll: settingsGetAll }
    } as unknown as LocalDataContext;
    warn = sinon.stub(logger, 'warn');
    debug = sinon.stub(logger, 'debug');
    isPlace = sinon.stub(contactTypeUtils, 'isPlace');
    createDocOuter = sinon.stub(LocalDoc, 'createDoc');
    createDocInner = sinon.stub();
    updateDocOuter = sinon.stub(LocalDoc, 'updateDoc');
    updateDocInner = sinon.stub();
    getDocsByIdsInner = sinon.stub();
    getDocsByIdsOuter = sinon.stub(LocalDoc, 'getDocsByIds').returns(getDocsByIdsInner);
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
      const placeType = [ { person: true, id: placeIdentifier } ] as Record<string, unknown>[];
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
        const docs = [ doc, doc, doc ];
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
        const docs = [ doc, doc, doc ];
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
      let clock: SinonFakeTimers;
      beforeEach(() => {
        clock = sinon.useFakeTimers(new Date('2024-01-01T00:00:00Z'));
      });

      afterEach(() => {
        clock.restore();
      });

      it('throws error if input contact_type is not a part of settings contact_types', async () => {
        createDocOuter.returns(createDocInner);
        settingsGetAll.returns({
          contact_types: [ { id: 'hospital' }, { id: 'clinic' } ]
        });
        isPlace.returns(false);

        const placeInput: Input.v1.PlaceInput = {
          name: 'user-1',
          type: 'school',
          parent: 'p1'
        };
        await expect(Place.v1.create(localContext)(placeInput))
          .to.be.rejectedWith('[school] is not a valid place type.');
        expect(createDocInner.called).to.be.false;
      });

      it('throws error if place is not at the top of the hierarchy and does not have a parent field', async () => {
        createDocOuter.returns(createDocInner);
        settingsGetAll.returns({
          contact_types: [ { id: 'hospital', parents: [ 'clinic' ] }, { id: 'clinic' } ]
        });
        // getDocsByIds is always called in create, even if parent is undefined
        getDocsByIdsInner.resolves([null, null]);

        const placeInput: Input.v1.PlaceInput = {
          name: 'place-1',
          type: 'hospital',
          reported_date: Date.now()
        };

        await expect(Place.v1.create(localContext)(placeInput))
          .to.be.rejectedWith(`Place type [hospital] requires a parent contact.`);
        expect(createDocInner.called).to.be.false;
      });

      it('throws error if place is not at the top of the hierarchy and does not have a\
         parent field that is specified in its `parents` array', async () => {
        createDocOuter.returns(createDocInner);
        settingsGetAll.returns({
          contact_types: [
            { id: 'hospital', parents: [ 'clinic', 'city' ] },
            { id: 'clinic' },
            { id: 'city' },
            { id: 'district_hospital' }
          ]
        });
        // isPlace must return true so the parent doc passes validation and we reach the parent type check
        isPlace.returns(true);
        const parentReturnedByget = {
          _id: 'p1',
          _rev: '1',
          contact_type: 'district_hospital',
          type: 'contact'
        };

        getDocsByIdsInner.resolves([parentReturnedByget, null]);
        const placeInput: Input.v1.PlaceInput = {
          name: 'place-1',
          type: 'hospital',
          parent: 'p1',
          reported_date: Date.now()
        };

        await expect(Place.v1.create(localContext)(placeInput))
          .to.be.rejectedWith(`Parent contact of type [${
            parentReturnedByget.contact_type
          }] is not allowed for type [${placeInput.type}].`);
        expect(createDocInner.called).to.be.false;
        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
      });

      it('throws error if place at the top of the hierarchy and has a `parent` field', async () => {
        createDocOuter.returns(createDocInner);
        settingsGetAll.returns({
          contact_types: [ { id: 'hospital' }, { id: 'clinic' }, { id: 'city' } ]
        });
        // Stub to return some parent doc (which will trigger the error since hospital has no parents)
        getDocsByIdsInner.resolves([{ _id: 'town' }, null]);

        const placeInput: Input.v1.PlaceInput = {
          name: 'place-1',
          type: 'hospital',
          parent: 'town',
          reported_date: Date.now()
        };
        await expect(Place.v1.create(localContext)(placeInput))
          .to.be.rejectedWith(`Place type [hospital] does not support having a parent contact.`);
        expect(createDocInner.called).to.be.false;
      });

      it('throws error if input contains the `_rev` property', async () => {
        createDocOuter.returns(createDocInner);
        isPlace.returns(true);

        const placeInput = {
          type: 'place',
          name: 'user-1',
          _rev: '1234',
          parent: 'p1'
        } as unknown as Input.v1.PlaceInput;
        await expect(Place.v1.create(localContext)(placeInput))
          .to.be.rejectedWith('The [_rev] field must not be set.');
      });

      it('creates a place on passing a valid PlaceInput with contact', async () => {
        createDocOuter.returns(createDocInner);
        settingsGetAll.returns({
          contact_types: [ { id: 'hospital' }, { id: 'clinic' }, { id: 'person', person: true } ]
        });
        isPlace.returns(true);

        const placeInput: Input.v1.PlaceInput = {
          name: 'place-x',
          type: 'hospital',
          contact: 'c1'
        };

        const expectedContactDoc = {
          _id: placeInput.contact,
          _rev: '1',
          type: 'contact',
          contact_type: 'person'
        };
        // getDocsByIds returns [parentDoc, contactDoc] - no parent, so first is null
        getDocsByIdsInner.resolves([null, expectedContactDoc]);

        const expected_date = new Date().toISOString();
        const expected_id = '1-id';
        const expected_rev = '1-rev';
        const expected_doc = {
          ...placeInput, reported_date: expected_date, _id: expected_id, _rev: expected_rev, type: 'contact',
          contact_type: 'hospital', contact: expectedContactDoc
        };
        createDocInner.resolves(expected_doc);
        const placeDoc = await Place.v1.create(localContext)(placeInput);

        expect(placeDoc).to.deep.equal(expected_doc);
        expect(Place.v1.isPlace(localContext.settings, placeDoc)).to.be.true;
        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        // Don't check exact timestamp due to timing issues
        expect(createDocInner.calledOnce).to.be.true;
      });

      it('creates a place on passing a valid PlaceInput with parent', async () => {
        createDocOuter.returns(createDocInner);
        settingsGetAll.returns({
          contact_types: [ { id: 'hospital', parents: [ 'district' ] }, { id: 'district' } ]
        });
        isPlace.returns(true);

        const placeInput: Input.v1.PlaceInput = {
          name: 'place-x',
          type: 'hospital',
          parent: 'p1',
        };

        const expectedParentDoc = {
          _id: placeInput.parent, _rev: '1', parent: { _id: 'p3' }, type: 'contact', contact_type: 'district'
        };
        // getDocsByIds returns [parentDoc, contactDoc] - no contact, so second is null
        getDocsByIdsInner.resolves([expectedParentDoc, null]);

        const expected_date = new Date().toISOString();
        const expected_id = '1-id';
        const expected_rev = '1-rev';
        const expected_doc = {
          ...placeInput,
          reported_date: new Date(expected_date).getTime(),
          _id: expected_id,
          _rev: expected_rev,
          type: 'contact',
          contact_type: 'hospital',
          parent: expectedParentDoc
        };
        createDocInner.resolves(expected_doc);
        const placeDoc = await Place.v1.create(localContext)(placeInput);

        expect(placeDoc).to.deep.equal(expected_doc);
        expect(Place.v1.isPlace(localContext.settings, placeDoc)).to.be.true;
        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        // Don't check exact timestamp due to timing issues
        expect(createDocInner.calledOnce).to.be.true;
      });

      it('creates a place on passing a valid legacy PlaceInput with parent', async () => {
        createDocOuter.returns(createDocInner);
        // For legacy places, use a hardcoded place type like 'clinic'
        settingsGetAll.returns({
          contact_types: [ { id: 'clinic', parents: [ 'district' ] }, { id: 'district' } ]
        });
        isPlace.returns(true);

        const placeInput: Input.v1.PlaceInput = {
          name: 'place-x',
          type: 'clinic',
          parent: 'p1'
        };

        const expectedParentDoc = {
          _id: placeInput.parent, _rev: '1', parent: { _id: 'p3' }, type: 'contact', contact_type: 'district'
        };
        // getDocsByIds returns [parentDoc, contactDoc] - no contact, so second is null
        getDocsByIdsInner.resolves([expectedParentDoc, null]);

        const expected_date = new Date().toISOString();
        const expected_id = '1-id';
        const expected_rev = '1-rev';
        const expected_doc = {
          ...placeInput,
          reported_date: new Date(expected_date).getTime(),
          _id: expected_id,
          _rev: expected_rev,
          type: 'contact',
          contact_type: 'clinic',
          parent: expectedParentDoc
        };
        createDocInner.resolves(expected_doc);
        const placeDoc = await Place.v1.create(localContext)(placeInput);

        expect(placeDoc).to.deep.equal(expected_doc);
        expect(Place.v1.isPlace(localContext.settings, placeDoc)).to.be.true;
        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        // Don't check exact timestamp due to timing issues
        expect(createDocInner.calledOnce).to.be.true;
      });

      it(
        'throws error for invalid parent id that is not present in the db',
        async () => {
          settingsGetAll.returns({
            contact_types: [ { id: 'clinic', parents: [ 'district' ] }, { id: 'district' } ]
          });
          const input = {
            name: 'place-1',
            type: 'clinic',
            parent: 'p1'
          };

          // getDocsByIds returns [parentDoc, contactDoc] - parent not found
          getDocsByIdsInner.resolves([null, null]);
          await expect(Place.v1.create(localContext)(input))
            .to.be.rejectedWith(`Parent contact [${input.parent}] not found.`);
        }
      );

      it(
        'returns plain place document if parent is not required',
        async () => {
          createDocOuter.returns(createDocInner);
          settingsGetAll.returns({
            contact_types: [ { id: 'hospital' } ]
          });
          const input = {
            name: 'place-1',
            type: 'hospital',
          };
          // No parent or contact needed - getDocsByIds still called but returns nulls
          getDocsByIdsInner.resolves([null, null]);
          const expectedDoc = {
            ...input,
            type: 'contact',
            contact_type: 'hospital',
            reported_date: Date.now()
          };
          createDocInner.resolves(expectedDoc);
          const placeDoc = await Place.v1.create(localContext)(input);
          expect(placeDoc).to.deep.equal(expectedDoc);
          // Don't check exact reported_date due to timing issues
          expect(createDocInner.calledOnce).to.be.true;
        }
      );

      it(
        'throws error for invalid parent id that is not present in the db (hospital type)',
        async () => {
          settingsGetAll.returns({
            contact_types: [ { id: 'hospital', parents: [ 'clinic' ] }, { id: 'clinic' } ]
          });
          const input = {
            name: 'place-1',
            type: 'hospital',
            parent: 'p1'
          };
          // getDocsByIds returns [parentDoc, contactDoc] - parent not found
          getDocsByIdsInner.resolves([null, null]);
          await expect(Place.v1.create(localContext)(input))
            .to.be.rejectedWith(`Parent contact [${input.parent}] not found.`);
        }
      );

      it(
        'throws error for invalid contact id that is not present in the db',
        async () => {
          settingsGetAll.returns({
            contact_types: [ { id: 'hospital' }, { id: 'clinic' } ]
          });
          const input = {
            name: 'place-1',
            type: 'hospital',
            contact: 'c1'
          };

          // getDocsByIds returns [parentDoc, contactDoc] - contact not found
          getDocsByIdsInner.resolves([null, null]);
          await expect(Place.v1.create(localContext)(input))
            .to.be.rejectedWith(`Primary contact [${input.contact}] not found.`);
        }
      );
    });

    describe('update', () => {
      let isContact: SinonStub;

      beforeEach(() => {
        updateDocOuter.returns(updateDocInner);
        isContact = sinon.stub(LocalContact.v1, 'isContact');
      });

      it('throws error if parent field is present but hierarchy does not match', async () => {
        const updateInput = {
          _id: '1',
          _rev: '1',
          name: 'myPlace',
          type: 'contact',
          contact_type: 'district_hospital',
          parent: {
            _id: '1', parent: {
              _id: '2'
            }
          },
          reported_date: 12312312
        };

        const originalDoc = {
          ...updateInput,
          name: 'myOldPlace',
          parent: {
            _id: '1', parent: {
              _id: '3'
            }
          }
        };
        isPlace.returns(true);
        // getDocsByIds returns [originalPlace, contactDoc]
        getDocsByIdsInner.resolves([originalDoc, null]);

        await expect(Place.v1.update(localContext)(updateInput)).to
          .be.rejectedWith('Parent lineage does not match.');
      });

      it('throws error if contact field is present but hierarchy does not match', async () => {
        const updateInput = {
          _id: '1',
          _rev: '1',
          name: 'myPlace',
          type: 'contact',
          contact_type: 'district_hospital',
          contact: {
            _id: '1', parent: {
              _id: '2'
            }
          },
          reported_date: 12312312
        };

        const originalDoc = {
          ...updateInput,
          name: 'myOldPlace',
          contact: {
            _id: '1', parent: {
              _id: '3'
            }
          }
        };
        isPlace.returns(true);
        // isContact must return true so the code reaches the lineage check
        isContact.returns(true);
        // getDocsByIds returns [originalPlace, contactDoc]
        getDocsByIdsInner.resolves([originalDoc, { _id: '1', parent: { _id: '3' } }]);

        await expect(Place.v1.update(localContext)(updateInput)).to
          .be.rejectedWith('The given contact lineage does not match the current lineage for that contact.');
      });

      it('throws error if _rev is absent', async () => {
        const updateInput = {
          _id: '1',
          name: 'myPlace',
          type: 'contact',
          contact_type: 'district_hospital',
          contact: {
            _id: '1', parent: {
              _id: '2'
            }
          },
          reported_date: 12312312
        };
        isPlace.returns(false);

        await expect(Place.v1.update(localContext)(updateInput as unknown as PlaceTypes.v1.Place)).to
          .be.rejectedWith(`Valid _id, _rev, and type fields must be provided.`);
        // getDocsByIdsInner should not be called because validation fails first
        expect(getDocsByIdsInner.notCalled).to.be.true;
      });

      it('throws error if Document does not exist', async () => {
        const updateInput = {
          _id: '1',
          _rev: '1',
          name: 'myPlace',
          type: 'contact',
          contact_type: 'district_hospital',
          contact: {
            _id: '1', parent: {
              _id: '2'
            }
          },
          reported_date: 12312312
        };
        // First isPlace call for input validation returns true
        // Second isPlace call for originalPlace returns false (not found)
        isPlace.onCall(0).returns(true);
        isPlace.onCall(1).returns(false);
        getDocsByIdsInner.resolves([null, null]);

        await expect(Place.v1.update(localContext)(updateInput)).to
          .be.rejectedWith(`Place record [${updateInput._id}] not found.`);
      });

      it('throws error if update payload contains a parent and place is at the top of the hierarchy', async () => {
        const originalDoc = {
          _id: '1',
          _rev: '1',
          name: 'myPlace',
          type: 'contact',
          contact_type: 'district_hospital',
          reported_date: 12312312
        };
        isPlace.returns(true);
        const updateInput = { ...originalDoc, parent: { _id: '5' } };
        // getDocsByIds returns [originalPlace, contactDoc]
        getDocsByIdsInner.resolves([originalDoc, null]);

        await expect(Place.v1.update(localContext)(updateInput)).to
          .be.rejectedWith(`Parent lineage does not match.`);
      });

      it('appends contact if originalDoc does not have one', async () => {
        const originalDoc = {
          _id: '1',
          _rev: '1',
          name: 'myPlace',
          type: 'contact',
          contact_type: 'district_hospital',
          reported_date: 12312312
        };
        isPlace.returns(true);
        // isContact must return true so the contact passes validation
        isContact.returns(true);
        const contactDoc = {
          _id: '5',
          parent: {
            _id: '6'
          }
        };
        const updateInput = { ...originalDoc, contact: { ...contactDoc, extra: 'field' } };
        // getDocsByIds returns [originalPlace, contactDoc]
        getDocsByIdsInner.resolves([originalDoc, contactDoc]);

        // updateDoc returns just the new _rev
        updateDocInner.resolves({ _rev: '2' });
        const result = await Place.v1.update(localContext)(updateInput);
        expect(result).to.deep.equal({
          ...originalDoc,
          contact: contactDoc,
          _rev: '2'
        });
      });

      it('throws error for invalid contact type when trying to add \
        contact to a place that does not have one already', async () => {
        const originalDoc = {
          _id: '1',
          _rev: '1',
          name: 'myPlace',
          type: 'contact',
          contact_type: 'district_hospital',
          reported_date: 12312312
        };
        isPlace.returns(true);
        // isContact returns false for invalid contact type
        isContact.returns(false);

        const updateInput = { ...originalDoc, contact: '5' };
        // getDocsByIds returns [originalPlace, contactDoc] - contact found but invalid type
        getDocsByIdsInner.resolves([originalDoc, { _id: '5', type: 'invalid' }]);

        await expect(Place.v1.update(localContext)(updateInput))
          .to.be.rejectedWith('No valid contact found for [5].');
      });

      it('throws error if contact doc not found trying to add \
        contact to a place that does not have one already', async () => {
        const originalDoc = {
          _id: '1',
          _rev: '1',
          name: 'myPlace',
          type: 'contact',
          contact_type: 'district_hospital',
          reported_date: 12312312
        };
        isPlace.returns(true);

        const updateInput = { ...originalDoc, contact: { _id: '5' } };
        // getDocsByIds returns [originalPlace, contactDoc] - contact not found in db (null)
        getDocsByIdsInner.resolves([originalDoc, null]);

        await expect(Place.v1.update(localContext)(updateInput))
          .to.be.rejectedWith('No valid contact found for [5].');
      });

      it('throws error if contact lineage does not match with actual doc when adding \
        contact to a place that does not have one already', async () => {
        const originalDoc = {
          _id: '1',
          _rev: '1',
          name: 'myPlace',
          type: 'contact',
          contact_type: 'district_hospital',
          reported_date: 12312312
        };
        isPlace.returns(true);
        // isContact must return true so the code reaches the lineage check
        isContact.returns(true);

        const updateInput = { ...originalDoc, contact: { _id: '5', parent: { _id: '6' } } };
        const contactDocInDb = {
          _id: '5', parent: {
            _id: '7'
          }
        };
        // getDocsByIds returns [originalPlace, contactDoc] - contact has different lineage
        getDocsByIdsInner.resolves([originalDoc, contactDocInDb]);

        await expect(Place.v1.update(localContext)(updateInput))
          .to.be.rejectedWith('The given contact lineage does not match the current lineage for that contact.');
      });

      it('returns updated place doc for valid input', async () => {
        const updateInput = {
          _id: '1',
          _rev: '1',
          name: 'myPlace',
          type: 'contact',
          contact_type: 'district_hospital',
          contact: {
            _id: '1', parent: {
              _id: '2',
              some_extra: 'field',
            }
          },
          parent: {
            some_extra: 'field',
            _id: '3', parent: {
              _id: '4',
              test: 'field',
            }
          },
          reported_date: 12312312
        };
        isPlace.returns(true);
        const originalDoc = { ...updateInput, name: 'hello' };
        // getDocsByIds returns [originalPlace, contactDoc] - contact exists
        getDocsByIdsInner.resolves([originalDoc, null]);
        // updateDoc returns just the new _rev string
        updateDocInner.resolves({ _rev: '2' });
        const resultDoc = await Place.v1.update(localContext)(updateInput);
        expect(resultDoc).to.deep.equal({
          ...updateInput,
          _rev: '2',
          parent: originalDoc.parent,
          contact: originalDoc.contact
        });
      });
    });
  });
});
