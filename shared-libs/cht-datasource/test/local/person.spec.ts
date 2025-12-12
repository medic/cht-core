import sinon, { SinonFakeTimers, SinonStub } from 'sinon';
import contactTypeUtils from '@medic/contact-types-utils';
import logger from '@medic/logger';
import { Doc } from '../../src/libs/doc';
import * as Person from '../../src/local/person';
import * as PersonTypes from '../../src/person';
import * as LocalDoc from '../../src/local/libs/doc';
import * as Lineage from '../../src/local/libs/lineage';
import { expect } from 'chai';
import { LocalDataContext } from '../../src/local/libs/data-context';
import * as Input from '../../src/input';

describe('local person', () => {
  let localContext: LocalDataContext;
  let settingsGetAll: SinonStub;
  let warn: SinonStub;
  let debug: SinonStub;
  let isPerson: SinonStub;
  let isPersonType: SinonStub;
  let createDocOuter: SinonStub;
  let createDocInner: SinonStub;
  let updateDocOuter: SinonStub;
  let updateDocInner: SinonStub;

  beforeEach(() => {
    settingsGetAll = sinon.stub();
    localContext = {
      medicDb: {} as PouchDB.Database<Doc>,
      settings: { getAll: settingsGetAll }
    } as unknown as LocalDataContext;
    warn = sinon.stub(logger, 'warn');
    debug = sinon.stub(logger, 'debug');
    isPerson = sinon.stub(contactTypeUtils, 'isPerson');
    isPersonType = sinon.stub(contactTypeUtils, 'isPersonType');
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
        const doc = { type: 'person', _id: 'uuid', _rev: '1' };
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
        const doc = { type: 'not-person', _id: '_id', _rev: '1' };
        getDocByIdInner.resolves(doc);
        settingsGetAll.returns(settings);
        isPerson.returns(false);

        const result = await Person.v1.get(localContext)(identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isPerson.calledOnceWithExactly(settings, doc)).to.be.true;
        expect(warn.calledOnceWithExactly(`Document [${identifier.uuid}] is not a valid person.`)).to.be.true;
      });

      it('returns null if the identified doc is not found', async () => {
        getDocByIdInner.resolves(null);

        const result = await Person.v1.get(localContext)(identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(settingsGetAll.notCalled).to.be.true;
        expect(isPerson.notCalled).to.be.true;
        expect(warn.calledOnceWithExactly(`Document [${identifier.uuid}] is not a valid person.`)).to.be.true;
      });
    });

    describe('getWithLineage', () => {
      const identifier = { uuid: 'uuid' } as const;
      let mockFetchHydratedDoc: SinonStub;

      beforeEach(() => {
        mockFetchHydratedDoc = sinon.stub(Lineage, 'fetchHydratedDoc');
      });

      it('returns a person with lineage', async () => {
        const personWithLineage = { type: 'person', _id: 'uuid', _rev: 'rev' };
        const mockFunction = sinon.stub().resolves(personWithLineage);
        mockFetchHydratedDoc.returns(mockFunction);
        isPerson.returns(true);
        settingsGetAll.returns(settings);

        const result = await Person.v1.getWithLineage(localContext)(identifier);

        expect(result).to.equal(personWithLineage);
        expect(mockFetchHydratedDoc.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(mockFunction.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isPerson.calledOnceWithExactly(settings, personWithLineage)).to.be.true;
        expect(warn.notCalled).to.be.true;
        expect(debug.notCalled).to.be.true;
      });

      it('returns null when no person or lineage is found', async () => {
        const mockFunction = sinon.stub().resolves(null);
        mockFetchHydratedDoc.returns(mockFunction);

        const result = await Person.v1.getWithLineage(localContext)(identifier);

        expect(result).to.be.null;
        expect(mockFetchHydratedDoc.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(mockFunction.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isPerson.notCalled).to.be.true;
        expect(warn.calledOnceWithExactly(`Document [${identifier.uuid}] is not a valid person.`)).to.be.true;
        expect(debug.notCalled).to.be.true;
      });

      it('returns null if the doc returned is not a person', async () => {
        const notPerson = { type: 'not-person', _id: 'uuid', _rev: 'rev' };
        const mockFunction = sinon.stub().resolves(notPerson);
        mockFetchHydratedDoc.returns(mockFunction);
        isPerson.returns(false);
        settingsGetAll.returns(settings);

        const result = await Person.v1.getWithLineage(localContext)(identifier);

        expect(result).to.be.null;
        expect(mockFetchHydratedDoc.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(mockFunction.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isPerson.calledOnceWithExactly(settings, notPerson)).to.be.true;
        expect(warn.calledOnceWithExactly(`Document [${identifier.uuid}] is not a valid person.`)).to.be.true;
        expect(debug.notCalled).to.be.true;
      });
    });

    describe('getPage', () => {
      const limit = 3;
      const cursor = null;
      const notNullCursor = '5';
      const personIdentifier = 'person';
      const personTypeQualifier = { contactType: personIdentifier } as const;
      const invalidPersonTypeQualifier = { contactType: 'invalid' } as const;
      const personType = [ { person: true, id: personIdentifier } ] as Record<string, unknown>[];
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
        const doc = { type: 'person' };
        const docs = [ doc, doc, doc ];
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
        const doc = { type: 'person' };
        const docs = [ doc, doc, doc ];
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
      ].forEach((invalidSkip) => {
        it(`throws an error if cursor is invalid: ${JSON.stringify(invalidSkip)}`, async () => {
          await expect(Person.v1.getPage(localContext)(personTypeQualifier, invalidSkip as string, limit))
            .to.be.rejectedWith(`The cursor must be a string or null for first page: [${JSON.stringify(invalidSkip)}]`);

          expect(settingsGetAll.calledOnce).to.be.true;
          expect(getPersonTypes.calledOnceWithExactly(settings)).to.be.true;
          expect(queryDocsByKeyOuter.calledOnceWithExactly(
            localContext.medicDb, 'medic-client/contacts_by_type'
          )).to.be.true;
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
      let clock: SinonFakeTimers;

      beforeEach(() => {
        // Freeze time at a fixed point for deterministic behavior
        clock = sinon.useFakeTimers(new Date('2024-01-01T00:00:00Z'));
      
        getDocByIdInner = sinon.stub();
        getDocByIdOuter = sinon.stub(LocalDoc, 'getDocById').returns(getDocByIdInner);
        createDocOuter.returns(createDocInner);
      });

      afterEach(() => {
        clock.restore();
      });

      it('throws error if input type is not a part of settings contact_types and also not `person`', async () => {
        settingsGetAll.returns({
          contact_types: [ { id: 'animal' }, { id: 'human' } ]
        });
        isPerson.returns(false);

        const personInput: Input.v1.PersonInput = {
          type: 'robot',
          name: 'user-1',
          parent: 'p1'
        };
        await expect(Person.v1.create(localContext)(personInput))
          .to.be.rejectedWith('[robot] is not a valid person type.');
        expect(createDocInner.called).to.be.false;
      });

      it('creates Person doc for valid input containing parent', async () => {
        settingsGetAll.returns({
          contact_types: [ { id: 'animal', parents: [ 'hospital' ], person: true }, { id: 'hospital' } ]
        });
        isPerson.returns(true);
        isPersonType.returns(true);
        const input = {
          name: 'user-1',
          type: 'animal',
          parent: 'p1',
          reported_date: new Date().toISOString()
        };
        const parentDocReturned = {
          _id: 'p1',
          _rev: '1',
          type: 'contact',
          contact_type: 'hospital',
          parent: {
            _id: 'p2'
          }
        };
        getDocByIdInner.resolves(parentDocReturned);
        // the parent won't contain extra fields like `type` and `contact_type`
        const expected_output = {
          name: 'user-1',
          reported_date: new Date(input.reported_date).getTime(),
          type: 'contact',
          contact_type: 'animal',
          parent: {
            _id: 'p1',
            parent: {
              _id: 'p2'
            }
          }
        };
        // createDoc returns the doc with _id and _rev after saving
        createDocInner.resolves({ ...expected_output, _id: 'new-person-id', _rev: '1-abc' });

        const person = await Person.v1.create(localContext)(input);
        expect(Person.v1.isPerson(localContext.settings, person)).to.be.true;
        expect(createDocInner.args[0][0]).to.deep.equal(expected_output);
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
      });

      it(
        'creates a Person doc for valid input having a legacy type without _id, reported_date',
        async () => {
          settingsGetAll.returns({
            contact_types: [ { id: 'person', parents: [ 'clinic' ], person: true }, { id: 'clinic' } ]
          });
          isPerson.returns(true);
          isPersonType.returns(true);
          const input = {
            name: 'user-1',
            type: 'person',
            parent: 'p1',
          };
          const parentDocReturned = {
            _id: 'p1', _rev: '1', type: 'clinic', parent: { _id: 'p2' }
          };
          getDocByIdInner.resolves(parentDocReturned);
          const input_reported_date = new Date().toISOString();
          // minifyDoc strips out _rev and type, keeping only _id and parent
          const minifiedParent = {
            _id: 'p1',
            parent: { _id: 'p2' }
          };
          // When settings has a matching contact_type, the doc gets transformed:
          // type -> 'contact', contact_type -> input.type
          const expectedDoc = {
            name: 'user-1',
            type: 'contact',
            contact_type: 'person',
            reported_date: new Date(input_reported_date).getTime(),
            parent: minifiedParent
          };
          // createDoc returns the doc with _id and _rev after saving
          createDocInner.resolves({ ...expectedDoc, _id: 'new-person-id', _rev: '1-abc' });
          const person = await Person.v1.create(localContext)(input);
          expect(getDocByIdInner.calledOnce).to.be.true;
          expect(Person.v1.isPerson(localContext.settings, person)).to.be.true;
          expect(createDocInner.calledOnce).to.be.true;
          expect(createDocInner.args[0][0]).to.deep.equal(expectedDoc);
        }
      );

      it(
        'throws error invalid parent id that is not present in the db',
        async () => {
          isPerson.returns(true);
          isPersonType.returns(true);
          const input = {
            name: 'user-1',
            type: 'person',
            parent: 'p1'
          };

          const parentDocReturned = null;
          getDocByIdInner.resolves(parentDocReturned);
          await expect(Person.v1.create(localContext)(input))
            .to.be.rejectedWith(`Parent contact [${input.parent}] not found.`);
        }
      );

      it(
        'throws error invalid parent id that is not present in the db with custom settings',
        async () => {
          settingsGetAll.returns({
            contact_types: [ { id: 'person', parents: [ 'hospital' ], person: true }, {
              id: 'hospital',
              parents: [ 'district_hospital' ]
            } ]
          });

          isPerson.returns(true);
          isPersonType.returns(true);
          const input = {
            name: 'user-1',
            type: 'person',
            parent: 'p1'
          };

          getDocByIdInner.resolves(null);
          await expect(Person.v1.create(localContext)(input))
            .to.be.rejectedWith(`Parent contact [${input.parent}] not found.`);
        }
      );

      it(
        'throws error if type of person cannot have a parent',
        async () => {
          settingsGetAll.returns({
            contact_types: [ { id: 'person', person: true }, { id: 'hospital', parents: [ 'district_hospital' ] } ]
          });

          isPerson.returns(true);
          isPersonType.returns(true);
          const input = {
            name: 'user-1',
            type: 'person',
            parent: 'p1',
            reported_date: Date.now()
          };
          const parentDoc = {
            _id: 'p1',
            _rev: '1',
            type: 'hospital'
          };
          getDocByIdInner.resolves(parentDoc);
          await expect(Person.v1.create(localContext)(input))
            .to.be.rejectedWith(`Parent contact of type [hospital] is not allowed for type [person].`);
        }
      );

      it(
        'throws error if type of returned parent doc is not present in allowed parent types',
        async () => {
          settingsGetAll.returns({
            contact_types: [ { id: 'person', parents: [ 'hospital' ], person: true }, {
              id: 'hospital',
              parents: [ 'district_hospital' ]
            } ]
          });

          isPerson.returns(true);
          isPersonType.returns(true);
          const input = {
            name: 'user-1',
            type: 'person',
            parent: 'p1',
            reported_date: Date.now()
          };
          const returnedParentDoc = {
            _id: 'p1',
            _rev: '1',
            contact_type: 'health_center',
            type: 'contact'
          };
          getDocByIdInner.resolves(returnedParentDoc);
          await expect(Person.v1.create(localContext)(input)).to.be.rejectedWith(
            `Parent contact of type [${returnedParentDoc.contact_type}] is not allowed for type [${input.type}].`
          );
        }
      );

      it('throws error if `_rev` is passed in', async () => {
        const input = {
          name: 'user-1',
          type: 'person',
          _rev: '1-rev',
          parent: 'p1'
        };

        await expect(
          Person.v1.create(localContext)(input as unknown as Input.v1.PersonInput)
        ).to.be.rejectedWith('The [_rev] field must not be set.');
        expect(createDocInner.called).to.be.false;
      });
    });

    describe('updatePerson', () => {
      let getDocByIdInner: SinonStub;

      beforeEach(() => {
        getDocByIdInner = sinon.stub();
        sinon.stub(Person.v1, 'get').returns(getDocByIdInner);
        updateDocOuter.returns(updateDocInner);
      });

      it('throws error for missing _id or _rev', async () => {
        settingsGetAll.returns({});
        const updateDoc = {
          type: 'person',
          parent: { _id: 'p1' },
          name: 'apoorva2'
        };
        await expect(Person.v1.update(localContext)(updateDoc as unknown as PersonTypes.v1.Person))
          .to.be.rejectedWith('Valid _id, _rev, and type fields must be provided.');
      });

      it('updates doc for valid update input', async () => {
        settingsGetAll.returns({});
        isPerson.returns(true);
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
          ...updateDocInput, name: 'apoorva', parent: { _id: '1', parent: { _id: '2' } }
        };
        getDocByIdInner.resolves(originalDoc);
        updateDocInner.resolves('2');

        const result = await Person.v1.update(localContext)(updateDocInput);

        expect(updateDocInner.calledOnce).to.be.true;
        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(result).to.deep.equal({ ...updateDocInput, name: 'apoorva2', _rev: '2' });
      });

      it('throws error for non-existent person', async () => {
        settingsGetAll.returns({});
        isPerson.returns(true);
        const updateDocInput = {
          type: 'contact',
          contact_type: 'person',
          parent: { _id: 'p1' },
          name: 'apoorva2',
          _id: '1',
          _rev: '1',
          reported_date: new Date(12312312)
        };

        getDocByIdInner.resolves(null);

        await expect(Person.v1.update(localContext)(updateDocInput as unknown as PersonTypes.v1.Person))
          .to.be.rejectedWith(`Person record [1] not found.`);

        expect(updateDocOuter.called).to.be.true;
        expect(updateDocInner.called).to.be.false;
      });

      it('deletes keys from original doc if they are not required', async () => {
        settingsGetAll.returns({});
        isPerson.returns(true);
        const reportedDate = 12312312;
        const updateDocInput = {
          type: 'contact',
          contact_type: 'person',
          parent: {
            _id: 'p1'
          },
          name: 'apoorva2',
          _id: '1',
          _rev: '1',
          reported_date: reportedDate
        };

        const originalDoc = { ...updateDocInput, hobby: 'skating', sex: 'male' };
        getDocByIdInner.resolves(originalDoc);
        updateDocInner.resolves('2');

        const result = await Person.v1.update(localContext)(updateDocInput);
        expect(result).to.deep.equal({ ...updateDocInput, _rev: '2' });
        expect(updateDocInner.calledOnce).to.be.true;
      });

      it('throw error is _rev does not match with the _rev in the original doc', async () => {
        settingsGetAll.returns({});
        isPerson.returns(true);
        const updateDocInput = {
          type: 'contact',
          contact_type: 'person',
          reported_date: 12312312,
          parent: { _id: 'p1' },
          name: 'apoorva2',
          _id: '1',
          _rev: '1',
        };

        const originalDoc = { ...updateDocInput, _rev: '2' };
        getDocByIdInner.resolves(originalDoc);
        await expect(Person.v1.update(localContext)(updateDocInput))
          .to.be.rejectedWith('The [_rev] field must not be changed.');
        expect(updateDocInner.called).to.be.false;
      });

      it('throw error if parent lineage of input does not match with originalDoc', async () => {
        settingsGetAll.returns({});
        isPerson.returns(true);
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
        const originalDoc = {
          ...updateDocInput, parent: {
            _id: 'p1',
            parent: {
              _id: 'p3'
            }
          }
        };
        getDocByIdInner.resolves(originalDoc);
        await expect(Person.v1.update(localContext)(updateDocInput))
          .to.be
          .rejectedWith('Parent lineage does not match.');
        expect(updateDocInner.called).to.be.false;
      });

      it('throw error if parent lineage depth of input does not match with originalDoc', async () => {
        settingsGetAll.returns({});
        isPerson.returns(true);
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
        const originalDoc = {
          ...updateDocInput, parent: {
            _id: 'p1',
            parent: {
              _id: 'p2',
              parent: {
                _id: 'p3'
              }
            }
          }
        };
        getDocByIdInner.resolves(originalDoc);
        await expect(Person.v1.update(localContext)(updateDocInput))
          .to.be
          .rejectedWith('Parent lineage does not match.');
        expect(updateDocInner.called).to.be.false;
      });

      it('throw error for missing required mutable fields', async () => {
        // isPerson must return true to get past initial validation
        isPerson.returns(true);
        const updateDocInput = {
          type: 'contact',
          contact_type: 'person',
          reported_date: new Date(12312312),
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
        // Error message changed to assertHasRequiredField format
        await expect(Person.v1.update(localContext)(updateDocInput as unknown as PersonTypes.v1.Person))
          .to.be
          .rejectedWith(`The [name] field must be valued.`);
        expect(updateDocInner.called).to.be.false;
      });

      it('throw error for missing required immutable fields other than parent', async () => {
        // isPerson must return true to get past initial validation
        isPerson.returns(true);
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
          reported_date: new Date(12312312),
        };
        getDocByIdInner.resolves(originalDoc);
        // Missing reported_date is treated as "changed" field
        await expect(Person.v1.update(localContext)(updateDocInput as unknown as PersonTypes.v1.Person))
          .to.be
          .rejectedWith(`The [reported_date] field must not be changed.`);
        expect(updateDocInner.called).to.be.false;
      });

      it('throw error for missing required immutable field: parent', async () => {
        // isPerson must return true to get past initial validation
        isPerson.returns(true);
        const updateDocInput = {
          type: 'contact',
          contact_type: 'person',
          _id: '1',
          _rev: '1',
          reported_date: new Date(555)
        };
        const originalDoc = {
          ...updateDocInput,
          parent: {
            _id: '-1'
          },
        };
        getDocByIdInner.resolves(originalDoc);
        // When parent is missing from update but exists in original, lineage check fails
        await expect(Person.v1.update(localContext)(updateDocInput as unknown as PersonTypes.v1.Person))
          .to.be
          .rejectedWith(`Parent lineage does not match.`);
        expect(updateDocInner.called).to.be.false;
      });

      it('throw error for updated required immutable fields other than parent', async () => {
        // isPerson must return true to get past initial validation
        isPerson.returns(true);
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
          reported_date: new Date(12312312),
        };
        getDocByIdInner.resolves(originalDoc);
        // Error message changed to use assertFieldsUnchanged format
        await expect(Person.v1.update(localContext)(updateDocInput))
          .to.be
          .rejectedWith(`The [reported_date] field must not be changed.`);
        expect(updateDocInner.called).to.be.false;
      });
    });
  });
});
