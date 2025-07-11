import sinon, { SinonStub } from 'sinon';
import contactTypeUtils from '@medic/contact-types-utils';
import logger from '@medic/logger';
import {Doc} from '../../src/libs/doc';
import * as Place from '../../src/local/place';
import * as LocalDoc from '../../src/local/libs/doc';
import { expect } from 'chai';
import { LocalDataContext } from '../../src/local/libs/data-context';
import * as Lineage from '../../src/local/libs/lineage';
import { PlaceInput } from '../../src/input';

describe('local place', () => {
  let localContext: LocalDataContext;
  let settingsGetAll: SinonStub;
  let warn: SinonStub;
  let debug: SinonStub;
  let isPlace: SinonStub;
  let createDocOuter: SinonStub;
  let createDocInner: SinonStub;

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
      let getLineageDocsByIdInner: SinonStub;
      let getLineageDocsByIdOuter: SinonStub;
      let getContactLineageInner: SinonStub;
      let getContactLineageOuter: SinonStub;

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

      it('returns a place with lineage', async () => {
        const place0 = { _id: 'place0', _rev: 'rev' };
        const place1 = { _id: 'place1', _rev: 'rev' };
        const place2 = { _id: 'place2', _rev: 'rev' };
        const contact0 = { _id: 'contact0', _rev: 'rev' };
        const lineageDocs = [place0, place1, place2];
        getLineageDocsByIdInner.resolves(lineageDocs);
        isPlace.returns(true);
        settingsGetAll.returns(settings);
        const place0WithContact = { ...place0, contact: contact0 };
        const place0WithLineage = { ...place0WithContact, lineage: true };
        const copiedPlace = { ...place0WithLineage };
        getContactLineageInner.returns(copiedPlace);

        const result = await Place.v1.getWithLineage(localContext)(identifier);

        expect(result).to.equal(copiedPlace);
        expect(getLineageDocsByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isPlace.calledOnceWithExactly(settings, place0)).to.be.true;
        expect(warn.notCalled).to.be.true;
        expect(debug.notCalled).to.be.true;
        expect(getContactLineageOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getContactLineageInner.calledOnceWithExactly(lineageDocs)).to.be.true;
        expect(getLineageDocsByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
      });

      it('returns null when no place or lineage is found', async () => {
        getLineageDocsByIdInner.resolves([]);

        const result = await Place.v1.getWithLineage(localContext)(identifier);

        expect(result).to.be.null;
        expect(getLineageDocsByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isPlace.notCalled).to.be.true;
        expect(warn.calledOnceWithExactly(`No place found for identifier [${identifier.uuid}].`)).to.be.true;
        expect(debug.notCalled).to.be.true;
        expect(getContactLineageInner.notCalled).to.be.true;
        expect(getContactLineageOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getLineageDocsByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
      });

      it('returns null if the doc returned is not a place', async () => {
        const place0 = { _id: 'place0', _rev: 'rev' };
        const place1 = { _id: 'place1', _rev: 'rev' };
        const place2 = { _id: 'place2', _rev: 'rev' };
        getLineageDocsByIdInner.resolves([place0, place1, place2]);
        isPlace.returns(false);
        settingsGetAll.returns(settings);

        const result = await Place.v1.getWithLineage(localContext)(identifier);

        expect(result).to.be.null;
        expect(getLineageDocsByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isPlace.calledOnceWithExactly(settings, place0)).to.be.true;
        expect(warn.calledOnceWithExactly(`Document [${identifier.uuid}] is not a valid place.`)).to.be.true;
        expect(debug.notCalled).to.be.true;
        expect(getContactLineageInner.notCalled).to.be.true;
        expect(getContactLineageOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getLineageDocsByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
      });

      it('returns a place if no lineage is found', async () => {
        const place = { _id: 'place0', _rev: 'rev' };
        getLineageDocsByIdInner.resolves([place]);
        isPlace.returns(true);
        settingsGetAll.returns(settings);

        const result = await Place.v1.getWithLineage(localContext)(identifier);

        expect(result).to.equal(place);
        expect(getLineageDocsByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isPlace.calledOnceWithExactly(settings, place)).to.be.true;
        expect(warn.notCalled).to.be.true;
        expect(debug.calledOnceWithExactly(`No lineage places found for place [${identifier.uuid}].`)).to.be.true;
        expect(getContactLineageInner.notCalled).to.be.true;
        expect(getContactLineageOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getLineageDocsByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
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
          expect(queryDocsByKeyOuter.calledOnceWithExactly(localContext.medicDb, 'medic-client/contacts_by_type'))
            .to.be.true;
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

    describe('createPlace', () => {
      let getDocByIdOuter: SinonStub;
      let getDocByIdInner: SinonStub;

      beforeEach(() => {
        getDocByIdInner = sinon.stub();
        getDocByIdOuter = sinon.stub(LocalDoc, 'getDocById').returns(getDocByIdInner);
      });

      it('throws error if input contact_type is not a part of settings contact_types', async() => {
        createDocOuter.returns(createDocInner);
        settingsGetAll.returns({
          contact_types: [{id: 'hospital'}, {id: 'clinic'}]
        });
        isPlace.returns(false);

        const placeInput: PlaceInput = {
          name: 'user-1',
          type: 'school',
          parent: 'p1'
        };
        await expect(Place.v1.createPlace(localContext)(placeInput))
          .to.be.rejectedWith('Invalid place type.');
        expect(createDocInner.called).to.be.false;
      });

      it('throws error if place is not at the top of the hierarchy and does not have a parent field', async() => {
        createDocOuter.returns(createDocInner);
        settingsGetAll.returns({
          contact_types: [{id: 'hospital', parents: ['clinic']}, {id: 'clinic'}]
        });

        const placeInput: PlaceInput = {
          name: 'place-1',
          type: 'hospital',
        };
        const updatedPlaceInput = {
          ...placeInput, type: 'contact', contact_type: 'hospital'
        };
        await expect(Place.v1.createPlace(localContext)(placeInput))
          .to.be.rejectedWith(`Missing or empty required field (parent) for [${JSON.stringify(updatedPlaceInput)}].`);
        expect(createDocInner.called).to.be.false;
      });

      it('throws error if place is not at the top of the hierarchy and does not have a\
         parent field that is specified in its `parents` array', async() => {
        createDocOuter.returns(createDocInner);
        settingsGetAll.returns({
          contact_types: [{id: 'hospital', parents: ['clinic', 'city']}, {id: 'clinic'}, {id: 'city'}]
        });
        const parentReturnedByget = {
          _id: 'p1',
          contact_type: 'district_hospital',
          type: 'contact'
        };

        getDocByIdInner.resolves(parentReturnedByget);
        const placeInput: PlaceInput = {
          name: 'place-1',
          type: 'hospital',
          parent: 'p1'
        };
        const updatedPlaceInput = {
          ...placeInput, type: 'contact', contact_type: placeInput.type
        };
        await expect(Place.v1.createPlace(localContext)(placeInput))
          .to.be.rejectedWith(`Invalid parent type for [${JSON.stringify(updatedPlaceInput)}].`);
        expect(createDocInner.called).to.be.false;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
      });

      it('throws error if place at the top of the hierarchy and has a `parent` field', async() => {
        createDocOuter.returns(createDocInner);
        settingsGetAll.returns({
          contact_types: [{id: 'hospital'}, {id: 'clinic'}, {id: 'city'}]
        });

        const placeInput: PlaceInput = {
          name: 'place-1',
          type: 'hospital',
          parent: 'town'
        };
        const updatedPlaceInput = {
          ...placeInput, type: 'contact', contact_type: 'hospital'
        };
        await expect(Place.v1.createPlace(localContext)(placeInput))
          .to.be.rejectedWith(`Unexpected parent for [${JSON.stringify(updatedPlaceInput)}].`);
        expect(createDocInner.called).to.be.false;
      });

      it('throws error if input contains the `_rev` property', async() => {
        createDocOuter.returns(createDocInner);
        isPlace.returns(true);

        const placeInput: PlaceInput = {
          type: 'place',
          name: 'user-1',
          _rev: '1234',
          parent: 'p1'
        };
        await expect(Place.v1.createPlace(localContext)(placeInput))
          .to.be.rejectedWith('Cannot pass `_rev` when creating a place.');
      });

      it('creates a place on passing a valid PlaceInput with contact', async() => {
        createDocOuter.returns(createDocInner);
        settingsGetAll.returns({
          contact_types: [{id: 'hospital'}, {id: 'clinic'}]
        });
        isPlace.returns(true);
        
        const placeInput:PlaceInput = {
          name: 'place-x',
          type: 'hospital',
          contact: 'c1'
        };
        
        const expectedContactDoc = {
          _id: placeInput.contact
        };
        getDocByIdInner.resolves(expectedContactDoc);

        const expected_date = new Date().toISOString();
        const expected_id = '1-id';
        const expected_rev = '1-rev';
        const expected_doc = {
          ...placeInput, reported_date: expected_date, _id: expected_id, _rev: expected_rev, type: 'contact',
          contact_type: 'hospital', contact: expectedContactDoc
        };
        createDocInner.resolves(expected_doc);
        const placeDoc = await Place.v1.createPlace(localContext)(placeInput);

        expect(placeDoc).to.deep.equal(expected_doc);
        expect(Place.v1.isPlace(localContext.settings)(placeDoc)).to.be.true;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(createDocInner.calledOnceWithExactly({...placeInput, type: 'contact',
          contact_type: 'hospital', contact: expectedContactDoc })).to.be.true;
      });

      it('creates a place on passing a valid PlaceInput with parent', async() => {
        createDocOuter.returns(createDocInner);
        settingsGetAll.returns({
          contact_types: [{id: 'hospital', parents: ['district']}, {id: 'clinic'}]
        });
        isPlace.returns(true);
        
        const placeInput:PlaceInput = {
          name: 'place-x',
          type: 'hospital',
          parent: 'p1'
        };
        
        const expectedParentDoc = {
          _id: placeInput.parent, parent: {_id: 'p3'}, type: 'contact', contact_type: 'district'
        };
        getDocByIdInner.resolves(expectedParentDoc);

        const expected_date = new Date().toISOString();
        const expected_id = '1-id';
        const expected_rev = '1-rev';
        const expected_doc = {
          ...placeInput, reported_date: expected_date, _id: expected_id, _rev: expected_rev, type: 'contact',
          contact_type: 'hospital', parent: expectedParentDoc
        };
        createDocInner.resolves(expected_doc);
        const placeDoc = await Place.v1.createPlace(localContext)(placeInput);

        expect(placeDoc).to.deep.equal(expected_doc);
        expect(Place.v1.isPlace(localContext.settings)(placeDoc)).to.be.true;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(createDocInner.calledOnceWithExactly({...placeInput, type: 'contact',
          contact_type: 'hospital', parent: {
            _id: placeInput.parent, parent: expectedParentDoc.parent
          } })).to.be.true;
      });

      it('creates a place on passing a valid legacy PlaceInput with parent', async() => {
        createDocOuter.returns(createDocInner);
        isPlace.returns(true);
        
        const placeInput:PlaceInput = {
          name: 'place-x',
          type: 'place',
          parent: 'p1'
        };
        
        const expectedParentDoc = {
          _id: placeInput.parent, parent: {_id: 'p3'}, type: 'contact', contact_type: 'district'
        };
        getDocByIdInner.resolves(expectedParentDoc);

        const expected_date = new Date().toISOString();
        const expected_id = '1-id';
        const expected_rev = '1-rev';
        const expected_doc = {
          ...placeInput, reported_date: expected_date, _id: expected_id, _rev: expected_rev, type: 'contact',
          contact_type: 'hospital', parent: expectedParentDoc
        };
        createDocInner.resolves(expected_doc);
        const placeDoc = await Place.v1.createPlace(localContext)(placeInput);

        expect(placeDoc).to.deep.equal(expected_doc);
        expect(Place.v1.isPlace(localContext.settings)(placeDoc)).to.be.true;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(createDocInner.calledOnceWithExactly({...placeInput, type: 'place', parent: {
          _id: placeInput.parent, parent: expectedParentDoc.parent
        } })).to.be.true;
      });

      it('throws error for invalid parent id that is not present in the db', 
        async () => {
          const input = {
            name: 'place-1',
            type: 'place',
            parent: 'p1'
          };
              
          const parentDocReturned = null;
          getDocByIdInner.resolves(parentDocReturned);
          await expect(Place.v1.createPlace(localContext)(input))
            .to.be.rejectedWith(`Parent with _id ${input.parent} does not exist.`);
        });

      it('returns plain place document if parent is not required', 
        async () => {
          createDocOuter.returns(createDocInner);
          settingsGetAll.returns({
            contact_types: [{id: 'hospital'}]
          });
          const input = {
            name: 'place-1',
            type: 'place',
          };
          createDocInner.returns(input);
          const placeDoc = await Place.v1.createPlace(localContext)(input);
          expect(placeDoc).to.deep.equal(input);
          expect(createDocInner.calledOnceWithExactly(input)).to.be.true;
        });

      it('throws error for invalid parent id that is not present in the db', 
        async () => {
          settingsGetAll.returns({
            contact_types: [{id: 'hospital', parents: ['clinic']}, {id: 'clinic'}]
          });
          const input = {
            name: 'place-1',
            type: 'hospital',
            parent: 'p1'
          };
          const parentDocReturned = null;
          getDocByIdInner.resolves(parentDocReturned);
          await expect(Place.v1.createPlace(localContext)(input))
            .to.be.rejectedWith(`Parent with _id ${input.parent} does not exist.`);
        });

      it('throws error for invalid contact id that is not present in the db', 
        async () => {
          settingsGetAll.returns({
            contact_types: [{id: 'hospital'}, {id: 'clinic'}]
          });
          const input = {
            name: 'place-1',
            type: 'hospital',
            contact: 'c1'
          };
         
          const parentDocReturned = null;
          getDocByIdInner.resolves(parentDocReturned);
          await expect(Place.v1.createPlace(localContext)(input))
            .to.be.rejectedWith(`Contact with _id ${input.contact} does not exist.`);
        });
    });

    
  });
});
