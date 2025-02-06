import { expect } from 'chai';
import * as Lineage from '../../../src/local/libs/lineage';
import sinon, { SinonStub } from 'sinon';
import * as LocalDoc from '../../../src/local/libs/doc';
import { Doc } from '../../../src/libs/doc';
import logger from '@medic/logger';
import * as Core from '../../../src/libs/core';
import { NonEmptyArray, Nullable } from '../../../src';

describe('local lineage lib', () => {
  let debug: SinonStub;

  beforeEach(() => {
    debug = sinon.stub(logger, 'debug');
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
      const contact = { _id: 'contact-0', _rev: 'rev-0', type: 'person', parent: {
        _id: 'place-0',
        parent: {
          _id: 'place-1',
          parent: {
            _id: 'place-2'
          }
        }
      } };
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
      hydratePrimaryContactInner.onFirstCall().returns(place0WithContact);
      hydratePrimaryContactInner.onSecondCall().returns(place1WithContact);
      hydratePrimaryContactInner.onThirdCall().returns(place2);
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
      hydratePrimaryContactInner.onFirstCall().returns(place0WithContact);
      hydratePrimaryContactInner.onSecondCall().returns(place1WithContact);
      hydratePrimaryContactInner.onThirdCall().returns(place2);
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
});
