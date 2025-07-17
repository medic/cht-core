import sinon, { SinonStub } from 'sinon';
import contactTypeUtils from '@medic/contact-types-utils';
import logger from '@medic/logger';
import {Doc} from '../../src/libs/doc';
import * as Person from '../../src/local/person';
import * as LocalDoc from '../../src/local/libs/doc';
import * as Lineage from '../../src/local/libs/lineage';
import { expect } from 'chai';
import { LocalDataContext } from '../../src/local/libs/data-context';
import { PersonInput } from '../../src/input';

describe('local person', () => {
  let localContext: LocalDataContext;
  let settingsGetAll: SinonStub;
  let warn: SinonStub;
  let debug: SinonStub;
  let isPerson: SinonStub;
  let createDocOuter: SinonStub;
  let createDocInner : SinonStub;
  let updateDocOuter: SinonStub;
  let updateDocInner: SinonStub;

  beforeEach(() => {
    settingsGetAll = sinon.stub();
    localContext = {
      medicDb: {  } as PouchDB.Database<Doc>,
      settings: { getAll: settingsGetAll }
    } as unknown as LocalDataContext;
    warn = sinon.stub(logger, 'warn');
    debug = sinon.stub(logger, 'debug');
    isPerson = sinon.stub(contactTypeUtils, 'isPerson');
    createDocInner = sinon.stub();
    createDocOuter = sinon.stub(LocalDoc, 'createDoc');
    updateDocOuter = sinon.stub(LocalDoc, 'updateDoc');
    updateDocInner = sinon.stub();
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

      it('returns a person by UUID', async () => {
        const doc = { type: 'person' };
        getDocByIdInner.resolves(doc);
        settingsGetAll.returns(settings);
        isPerson.returns(true);

        const result = await Person.v1.get(localContext)(identifier);

        expect(result).to.equal(doc);
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isPerson.calledOnceWithExactly(settings, doc)).to.be.true;
        expect(warn.notCalled).to.be.true;
      });

      it('returns null if the identified doc does not have a person type', async () => {
        const doc = { type: 'not-person', _id: '_id' };
        getDocByIdInner.resolves(doc);
        settingsGetAll.returns(settings);
        isPerson.returns(false);

        const result = await Person.v1.get(localContext)(identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isPerson.calledOnceWithExactly(settings, doc)).to.be.true;
        expect(warn.calledOnceWithExactly(`Document [${doc._id}] is not a valid person.`)).to.be.true;
      });

      it('returns null if the identified doc is not found', async () => {
        getDocByIdInner.resolves(null);

        const result = await Person.v1.get(localContext)(identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(settingsGetAll.notCalled).to.be.true;
        expect(isPerson.notCalled).to.be.true;
        expect(warn.calledOnceWithExactly(`No person found for identifier [${identifier.uuid}].`)).to.be.true;
      });
    });

    describe('getWithLineage', () => {
      const identifier = { uuid: 'uuid' } as const;
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

      it('returns a person with lineage', async () => {
        const person = { type: 'person', _id: 'uuid', _rev: 'rev' };
        const place0 = { _id: 'place0', _rev: 'rev' };
        const place1 = { _id: 'place1', _rev: 'rev' };
        const place2 = { _id: 'place2', _rev: 'rev' };
        const lineageDocs = [person, place0, place1, place2];
        const lineagePlaces = [place0, place1, place2];
        getLineageDocsByIdInner.resolves(lineageDocs);
        isPerson.returns(true);
        settingsGetAll.returns(settings);
        const personWithLineage = { ...person, lineage: true };
        const copiedPerson = { ...personWithLineage };
        getContactLineageInner.returns(copiedPerson);

        const result = await Person.v1.getWithLineage(localContext)(identifier);

        expect(result).to.equal(copiedPerson);
        expect(getLineageDocsByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isPerson.calledOnceWithExactly(settings, person)).to.be.true;
        expect(warn.notCalled).to.be.true;
        expect(debug.notCalled).to.be.true;
        expect(getContactLineageOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getContactLineageInner.calledOnceWithExactly(lineagePlaces, person)).to.be.true;
        expect(getLineageDocsByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
      });

      it('returns null when no person or lineage is found', async () => {
        getLineageDocsByIdInner.resolves([]);

        const result = await Person.v1.getWithLineage(localContext)(identifier);

        expect(result).to.be.null;
        expect(getLineageDocsByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isPerson.notCalled).to.be.true;
        expect(warn.calledOnceWithExactly(`No person found for identifier [${identifier.uuid}].`)).to.be.true;
        expect(debug.notCalled).to.be.true;
        expect(getContactLineageInner.notCalled).to.be.true;
        expect(getContactLineageOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getLineageDocsByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
      });

      it('returns null if the doc returned is not a person', async () => {
        const person = { type: 'person', _id: 'uuid', _rev: 'rev' };
        const place0 = { _id: 'place0', _rev: 'rev' };
        const place1 = { _id: 'place1', _rev: 'rev' };
        const place2 = { _id: 'place2', _rev: 'rev' };
        getLineageDocsByIdInner.resolves([person, place0, place1, place2]);
        isPerson.returns(false);
        settingsGetAll.returns(settings);

        const result = await Person.v1.getWithLineage(localContext)(identifier);

        expect(result).to.be.null;
        expect(getLineageDocsByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isPerson.calledOnceWithExactly(settings, person)).to.be.true;
        expect(warn.calledOnceWithExactly(`Document [${identifier.uuid}] is not a valid person.`)).to.be.true;
        expect(debug.notCalled).to.be.true;
        expect(getContactLineageInner.notCalled).to.be.true;
        expect(getContactLineageOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getLineageDocsByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
      });

      it('returns a person if no lineage is found', async () => {
        const person = { type: 'person', _id: 'uuid', _rev: 'rev' };
        getLineageDocsByIdInner.resolves([person]);
        isPerson.returns(true);
        settingsGetAll.returns(settings);

        const result = await Person.v1.getWithLineage(localContext)(identifier);

        expect(result).to.equal(person);
        expect(getLineageDocsByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isPerson.calledOnceWithExactly(settings, person)).to.be.true;
        expect(warn.notCalled).to.be.true;
        expect(debug.calledOnceWithExactly(`No lineage places found for person [${identifier.uuid}].`)).to.be.true;
        expect(getContactLineageInner.notCalled).to.be.true;
        expect(getContactLineageOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getLineageDocsByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
      });
    });

    describe('getPage', () => {
      const limit = 3;
      const cursor = null;
      const notNullCursor = '5';
      const personIdentifier = 'person';
      const personTypeQualifier = {contactType: personIdentifier} as const;
      const invalidPersonTypeQualifier = { contactType: 'invalid' } as const;
      const personType = [{person: true, id: personIdentifier}] as Record<string, unknown>[];
      let getPersonTypes: SinonStub;
      let queryDocsByKeyInner: SinonStub;
      let queryDocsByKeyOuter: SinonStub;
      let fetchAndFilterInner: SinonStub;
      let fetchAndFilterOuter: SinonStub;

      beforeEach(() => {
        queryDocsByKeyInner = sinon.stub();
        queryDocsByKeyOuter = sinon.stub(LocalDoc, 'queryDocsByKey').returns(queryDocsByKeyInner);
        getPersonTypes = sinon.stub(contactTypeUtils, 'getPersonTypes').returns(personType);
        settingsGetAll.returns(settings);
        fetchAndFilterInner = sinon.stub();
        fetchAndFilterOuter = sinon.stub(LocalDoc, 'fetchAndFilter').returns(fetchAndFilterInner);
      });

      it('returns a page of people', async () => {
        const doc = { type: 'person'};
        const docs = [doc, doc, doc];
        const expectedResult = {
          cursor: '3',
          data: docs
        };
        fetchAndFilterInner.resolves(expectedResult);

        const res = await Person.v1.getPage(localContext)(personTypeQualifier, cursor, limit);

        expect(res).to.deep.equal(expectedResult);
        expect(settingsGetAll.callCount).to.equal(1);
        expect(getPersonTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(
          queryDocsByKeyOuter.calledOnceWithExactly(localContext.medicDb, 'medic-client/contacts_by_type')
        ).to.be.true;
        expect(queryDocsByKeyInner.notCalled).to.be.true;
        expect(fetchAndFilterOuter.calledOnce).to.be.true;
        expect(fetchAndFilterOuter.firstCall.args[0]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[1]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[2]).to.be.equal(limit);
        expect(fetchAndFilterInner.calledOnceWithExactly(limit, Number(cursor))).to.be.true;
        expect(isPerson.notCalled).to.be.true;
      });

      it('returns a page of people when cursor is not null', async () => {
        const doc = { type: 'person'};
        const docs = [doc, doc, doc];
        const expectedResult = {
          cursor: '8',
          data: docs
        };
        fetchAndFilterInner.resolves(expectedResult);

        const res = await Person.v1.getPage(localContext)(personTypeQualifier, notNullCursor, limit);

        expect(res).to.deep.equal(expectedResult);
        expect(settingsGetAll.callCount).to.equal(1);
        expect(getPersonTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(
          queryDocsByKeyOuter.calledOnceWithExactly(localContext.medicDb, 'medic-client/contacts_by_type')
        ).to.be.true;
        expect(queryDocsByKeyInner.notCalled).to.be.true;
        expect(fetchAndFilterOuter.firstCall.args[0]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[1]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[2]).to.be.equal(limit);
        expect(fetchAndFilterInner.calledOnceWithExactly(limit, Number(notNullCursor))).to.be.true;
        expect(isPerson.notCalled).to.be.true;
      });

      it('throws an error if person identifier is invalid/does not exist', async () => {
        await expect(Person.v1.getPage(localContext)(invalidPersonTypeQualifier, cursor, limit)).to.be.rejectedWith(
          `Invalid contact type [${invalidPersonTypeQualifier.contactType}].`
        );

        expect(settingsGetAll.calledOnce).to.be.true;
        expect(getPersonTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(queryDocsByKeyOuter.calledOnceWithExactly(localContext.medicDb, 'medic-client/contacts_by_type'))
          .to.be.true;
        expect(queryDocsByKeyInner.notCalled).to.be.true;
        expect(fetchAndFilterInner.notCalled).to.be.true;
        expect(fetchAndFilterOuter.notCalled).to.be.true;
      });

      [
        {},
        '-1',
        undefined,
      ].forEach((invalidSkip ) => {
        it(`throws an error if cursor is invalid: ${JSON.stringify(invalidSkip)}`, async () => {
          await expect(Person.v1.getPage(localContext)(personTypeQualifier, invalidSkip as string, limit))
            .to.be.rejectedWith(`The cursor must be a string or null for first page: [${JSON.stringify(invalidSkip)}]`);

          expect(settingsGetAll.calledOnce).to.be.true;
          expect(getPersonTypes.calledOnceWithExactly(settings)).to.be.true;
          expect(queryDocsByKeyOuter.calledOnceWithExactly(localContext.medicDb, 'medic-client/contacts_by_type'))
            .to.be.true;
          expect(queryDocsByKeyInner.notCalled).to.be.true;
          expect(fetchAndFilterInner.notCalled).to.be.true;
          expect(fetchAndFilterOuter.notCalled).to.be.true;
          expect(isPerson.notCalled).to.be.true;
        });
      });

      it('returns empty array if people does not exist', async () => {
        const expectedResult = {
          data: [],
          cursor
        };
        fetchAndFilterInner.resolves(expectedResult);

        const res = await Person.v1.getPage(localContext)(personTypeQualifier, cursor, limit);

        expect(res).to.deep.equal(expectedResult);
        expect(settingsGetAll.calledOnce).to.be.true;
        expect(getPersonTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(
          queryDocsByKeyOuter.calledOnceWithExactly(localContext.medicDb, 'medic-client/contacts_by_type')
        ).to.be.true;
        expect(queryDocsByKeyInner.notCalled).to.be.true;
        expect(fetchAndFilterOuter.firstCall.args[0]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[1]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[2]).to.be.equal(limit);
        expect(fetchAndFilterInner.calledOnceWithExactly(limit, Number(cursor))).to.be.true;
        expect(isPerson.notCalled).to.be.true;
      });
    });

    describe('createPerson', () => {
      let getDocByIdOuter: SinonStub;
      let getDocByIdInner: SinonStub;
      
      beforeEach(() => {
        getDocByIdInner = sinon.stub();
        getDocByIdOuter = sinon.stub(LocalDoc, 'getDocById').returns(getDocByIdInner);
        createDocOuter.returns(createDocInner);
      });

      it('throws error if input type is not a part of settings contact_types and also not `person`', async() => {
        settingsGetAll.returns({
          contact_types: [{id: 'animal'}, {id: 'human'}]
        });
        isPerson.returns(false);

        const personInput: PersonInput = {
          type: 'robot',
          name: 'user-1',
          parent: 'p1'
        };
        await expect(Person.v1.create(localContext)(personInput))
          .to.be.rejectedWith('Invalid person type.');
        expect(createDocInner.called).to.be.false;
      });

      it('creates Person doc for valid input containing parent', async() => {
        settingsGetAll.returns({
          contact_types: [{id: 'animal', parents: ['hospital']}, {id: 'hospital'}]
        });
        isPerson.returns(true);
        const input = {
          _id: '2-inserted-id',
          name: 'user-1',
          type: 'animal',
          parent: 'p1',
          reported_date: new Date().toISOString()
        };
        const parentDocReturned = {
          _id: 'p1',
          type: 'contact',
          contact_type: 'hospital',
          parent: {
            _id: 'p2'
          }
        };
        getDocByIdInner.resolves(parentDocReturned);
        const expected_input = {...input, 
          type: 'contact', contact_type: 'animal', parent: parentDocReturned };
        createDocInner.resolves(expected_input);
        
        // the parent won't contain extra fields like `type` and `contact_type`
        const expected_output = {
          ...expected_input, parent: {
            _id: 'p1',
            parent: {
              _id: 'p2'
            }
          }
        };
        const person = await Person.v1.create(localContext)(input);
        expect(Person.v1.isPerson(localContext.settings)(person)).to.be.true;
        expect(createDocInner.args[0][0]).to.deep.equal(expected_output);
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
      });

      it('creates a Person doc for valid input having a legacy type without _id, reported_date', 
        async () => {
          isPerson.returns(true);
          const input = {
            name: 'user-1',
            type: 'person',
            parent: 'p1'
          };
          const parentDocReturned = {
            _id: 'p1', parent: {_id: 'p2'}
          };
          getDocByIdInner.resolves(parentDocReturned);
          const input_reported_date = new Date().toISOString();
          createDocInner.resolves({ reported_date: input_reported_date, ...input });
          const person = await Person.v1.create(localContext)(input);
          expect(getDocByIdInner.calledOnce).to.be.true;
          expect(Person.v1.isPerson(localContext.settings)(person)).to.be.true;
          expect(createDocInner.calledOnceWithExactly({...input, parent: parentDocReturned })).to.be.true;
        });

      it('throws error invalid parent id that is not present in the db', 
        async () => {
          isPerson.returns(true);
          const input = {
            name: 'user-1',
            type: 'person',
            parent: 'p1'
          };
          
          const parentDocReturned = null;
          getDocByIdInner.resolves(parentDocReturned);
          await expect( Person.v1.create(localContext)(input))
            .to.be.rejectedWith(`Parent with _id ${input.parent} does not exist.`);
        });

      it('throws error invalid parent id that is not present in the db', 
        async () => {
          settingsGetAll.returns({
            contact_types: [{id: 'person', parents: ['hospital'] }, {id: 'hospital', parents: ['district_hospital']}]
          });

          isPerson.returns(true);
          const input = {
            name: 'user-1',
            type: 'person',
            parent: 'p1'
          };

          getDocByIdInner.resolves(null);
          await expect(Person.v1.create(localContext)(input))
            .to.be.rejectedWith(`Parent with _id ${input.parent} does not exist.`);
        });

      it('throws error if type of person cannot have a parent', 
        async () => {
          settingsGetAll.returns({
            contact_types: [{id: 'person' }, {id: 'hospital', parents: ['district_hospital']}]
          });

          isPerson.returns(true);
          const input = {
            name: 'user-1',
            type: 'person',
            parent: 'p1'
          };
          const updatedInput = {...input, type: 'contact', contact_type: 'person'};
          await expect( Person.v1.create(localContext)(input))
            .to.be.rejectedWith(`Invalid type of person, cannot have parent for [${JSON.stringify(updatedInput)}].`);
          expect(getDocByIdInner.called).to.be.false;
        });

      it('throws error if type of returned parent doc is not present in allowed parent types', 
        async () => {
          settingsGetAll.returns({
            contact_types: [{id: 'person', parents: ['hospital'] }, {id: 'hospital', parents: ['district_hospital']}]
          });

          isPerson.returns(true);
          const input = {
            name: 'user-1',
            type: 'person',
            parent: 'p1'
          };
          const returnedParentDoc = {
            _id: 'p1',
            contact_type: 'health_center',
            type: 'contact'
          };
          getDocByIdInner.resolves(returnedParentDoc);
          const updatedInput = {...input, type: 'contact', contact_type: 'person'};
          await expect( Person.v1.create(localContext)(input))
            .to.be.rejectedWith(`Invalid parent type for [${JSON.stringify(updatedInput)}].`);
        });

      it('throws error if `_rev` is passed in', async () => {
        const input = {
          name: 'user-1',
          type: 'person',
          _rev: '1-rev',
          parent: 'p1'
        };
      
        await expect(
          Person.v1.create(localContext)(input as unknown as PersonInput)
        ).to.be.rejectedWith('Cannot pass `_rev` when creating a person.');
        expect(createDocInner.called).to.be.false;
      });
    });

    describe('updatePerson', () => {
      let getDocByIdOuter: SinonStub;
      let getDocByIdInner: SinonStub;
      
      beforeEach(() => {
        getDocByIdInner = sinon.stub();
        getDocByIdOuter = sinon.stub(Person.v1, 'get').returns(getDocByIdInner);
        updateDocOuter.returns(updateDocInner);
      });

      it('throws error for missing _id or _rev', async() => {
        const updateDoc = {
          type: 'person',
          parent: 'p1',
          name: 'apoorva2'
        };
        await expect(Person.v1.update(localContext)(updateDoc))
          .to.be.rejectedWith(`Document for update is not a valid Doc ${JSON.stringify(updateDoc)}`);
        expect(getDocByIdOuter.calledOnce).to.be.true;
        expect(getDocByIdInner.calledOnce).to.be.false;
      });

      it('updates doc for valid update input', async() => {
        const updateDocInput = {
          type: 'contact',
          contact_type: 'person',
          reported_date: 12312312,
          parent: {
            _id: '1', parent: {
              _id: '2'
            }
          },
          name: 'apoorva2',
          _id: '1',
          _rev: '1'
        };

        const originalDoc = {
          ...updateDocInput, name: 'apoorva', parent: {_id: '1', parent: {_id: '2'}}
        };
        getDocByIdInner.resolves(originalDoc);
        const modifiedDoc = {...originalDoc, name: 'apoorva2'};
        updateDocInner.resolves(modifiedDoc);

        const result = await Person.v1.update(localContext)(updateDocInput);

        expect(updateDocInner.calledOnceWithExactly(modifiedDoc)).to.be.true;
        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(result).to.deep.equal(modifiedDoc);
      });

      it('throws error for non-existent person', async() => {
        const updateDocInput = {
          type: 'contact',
          contact_type: 'person',
          parent: 'p1',
          name: 'apoorva2',
          _id: '1',
          _rev: '1'
        };

        getDocByIdInner.resolves(null);

        await expect(Person.v1.update(localContext)(updateDocInput))
          .to.be.rejectedWith(`Person not found`);

        expect(updateDocOuter.called).to.be.true;
        expect(updateDocInner.called).to.be.false;
      });

      it('deletes keys from original doc if they are not required', async() => {
        const updateDocInput = {
          type: 'contact',
          contact_type: 'person',
          parent: {
            _id: 'p1'
          },
          name: 'apoorva2',
          _id: '1',
          _rev: '1',
          reported_date: 12312312
        };

        const originalDoc = {...updateDocInput, hobby: 'skating', sex: 'male', reported_date: 12312312};
        getDocByIdInner.resolves(originalDoc);
        updateDocInner.resolves({...updateDocInput, reported_date: originalDoc.reported_date});

        const result= await Person.v1.update(localContext)(updateDocInput);
        expect(result).to.deep.equal({...updateDocInput, reported_date: originalDoc.reported_date});
        expect(updateDocInner.calledOnceWithExactly({
          ...updateDocInput, reported_date: originalDoc.reported_date
        })).to.be.true;
      });

      it('throw error is _rev does not match with the _rev in the original doc', async() => {
        const updateDocInput = {
          type: 'contact',
          contact_type: 'person',
          reported_date: 12312312,
          parent: 'p1',
          name: 'apoorva2',
          _id: '1',
          _rev: '1',
        };

        const originalDoc = {...updateDocInput, _rev: '2'};
        getDocByIdInner.resolves(originalDoc);
        await expect(Person.v1.update(localContext)(updateDocInput))
          .to.be.rejectedWith('`_rev` does not match');
        expect(updateDocInner.called).to.be.false;
      });

      it('throw error if parent lineage of input does not match with originalDoc', async() => {
        const updateDocInput = {
          type: 'contact',
          contact_type: 'person',
          parent: {
            _id: 'p1',
            parent: {
              _id: 'p2'
            }
          },
          name: 'apoorva2',
          _id: '1',
          _rev: '1',
          reported_date: 12312312
        };
        const originalDoc = {...updateDocInput, parent: {
          _id: 'p1',
          parent: {
            _id: 'p3'
          }
        }};
        getDocByIdInner.resolves(originalDoc);
        await expect(Person.v1.update(localContext)(updateDocInput))
          .to.be
          .rejectedWith('Lineage does not match with the lineage of the doc in the db');
        expect(updateDocInner.called).to.be.false;
      });

      it('throw error if parent lineage depth of input does not match with originalDoc', async() => {
        const updateDocInput = {
          type: 'contact',
          contact_type: 'person',
          reported_date: 12312312,
          parent: {
            _id: 'p1',
            parent: {
              _id: 'p2'
            }
          },
          name: 'apoorva2',
          _id: '1',
          _rev: '1',
        };
        const originalDoc = {...updateDocInput, parent: {
          _id: 'p1',
          parent: {
            _id: 'p2',
            parent: {
              _id: 'p3'
            }
          }
        }};
        getDocByIdInner.resolves(originalDoc);
        await expect(Person.v1.update(localContext)(updateDocInput))
          .to.be
          .rejectedWith('Lineage does not match with the lineage of the doc in the db');
        expect(updateDocInner.called).to.be.false;
      });
      
      it('throw error for missing required mutable fields', async() => {
        const updateDocInput = {
          type: 'contact',
          contact_type: 'person',
          reported_date: 12312312,
          parent: {
            _id: 'p1',
            parent: {
              _id: 'p2'
            }
          },
          _id: '1',
          _rev: '1',
        };
        const originalDoc = {
          ...updateDocInput,
          name: 'apoorva'
        };
        getDocByIdInner.resolves(originalDoc);
        await expect(Person.v1.update(localContext)(updateDocInput))
          .to.be
          .rejectedWith(`Missing or empty required fields (name) for [${JSON
            .stringify(updateDocInput)}].`);
        expect(updateDocInner.called).to.be.false;
      });

      it('throw error for missing required immutable fields other than parent', async() => {
        const updateDocInput = {
          type: 'contact',
          contact_type: 'person',
          name: 'apoorva',
          parent: {
            _id: 'p1',
            parent: {
              _id: 'p2'
            }
          },
          _id: '1',
          _rev: '1'
        };
        const originalDoc = {
          ...updateDocInput,
          reported_date: 12312312,
        };
        getDocByIdInner.resolves(originalDoc);
        await expect(Person.v1.update(localContext)(updateDocInput))
          .to.be
          .rejectedWith(`Missing or empty required fields (reported_date) for [${JSON
            .stringify(updateDocInput)}].`);
        expect(updateDocInner.called).to.be.false;
      });

      it('throw error for missing required immutable field: parent', async() => {
        const updateDocInput = {
          type: 'contact',
          contact_type: 'person',
          _id: '1',
          _rev: '1',
          reported_date: 555
        };
        const originalDoc = {
          ...updateDocInput,
          parent: {
            _id: '-1'
          },
        };
        getDocByIdInner.resolves(originalDoc);
        await expect(Person.v1.update(localContext)(updateDocInput))
          .to.be
          .rejectedWith(`Missing or empty required fields (parent, name) for [${JSON
            .stringify(updateDocInput)}].`);
        expect(updateDocInner.called).to.be.false;
      });

      it('throw error for updated required immutable fields other than parent', async() => {
        const updateDocInput = {
          type: 'contact',
          contact_type: 'person',
          name: 'apoorva',
          parent: {
            _id: 'p1',
            parent: {
              _id: 'p2'
            }
          },
          _id: '1',
          _rev: '1',
          reported_date: 333444555,
        };
        const originalDoc = {
          ...updateDocInput,
          reported_date: 12312312,
        };
        getDocByIdInner.resolves(originalDoc);
        await expect(Person.v1.update(localContext)(updateDocInput))
          .to.be
          .rejectedWith(`Value ${
            updateDocInput.reported_date
          } of immutable field 'reported_date' does not match with the original doc`);
        expect(updateDocInner.called).to.be.false;
      });
    });
  });
});
