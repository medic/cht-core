import { expect } from 'chai';
import {
  getLineageDocsById,
  getPrimaryContactIds,
  hydrateLineage,
  hydratePrimaryContact
} from '../../../src/local/libs/lineage';
import sinon, { SinonStub } from 'sinon';
import * as LocalDoc from '../../../src/local/libs/doc';
import { Doc } from '../../../src/libs/doc';
import logger from '@medic/logger';

describe('local lineage lib', () => {
  let debug: SinonStub;

  beforeEach(() => {
    debug = sinon.stub(logger, 'debug');
  });

  afterEach(() => sinon.restore());

  it('getLineageDocsById', () => {
    const queryFn = sinon.stub();
    const queryDocsByKey = sinon
      .stub(LocalDoc, 'queryDocsByKey')
      .returns(queryFn);
    const medicDb = { hello: 'world' } as unknown as PouchDB.Database<Doc>;

    const result = getLineageDocsById(medicDb);

    expect(result).to.equal(queryFn);
    expect(queryDocsByKey.calledOnceWithExactly(medicDb, 'medic-client/docs_by_id_lineage')).to.be.true;
  });

  describe('getPrimaryContactIds', () => {
    it('returns the primary contact ids', () => {
      const place0 = { _id: 'place-0', _rev: 'rev-1', contact: { _id: 'contact-0' } };
      const place1 = { _id: 'place-1', _rev: 'rev-2', contact: { _id: 'contact-1' } };
      const place2 = { _id: 'place-2', _rev: 'rev-3', contact: { _id: 'contact-2' } };

      const result = getPrimaryContactIds([place0, place1, place2]);

      expect(result).to.deep.equal([place0.contact._id, place1.contact._id, place2.contact._id]);
    });

    [
      null,
      { _id: 'place-0', _rev: 'rev-1' },
      { _id: 'place-0', _rev: 'rev-1', contact: { hello: 'contact-0' } },
      { _id: 'place-0', _rev: 'rev-1', contact: { _id: '' } }
    ].forEach((place) => {
      it(`returns nothing for ${JSON.stringify(place)}`, () => {
        const result = getPrimaryContactIds([place]);
        expect(result).to.be.empty;
      });
    });
  });

  describe('hydratePrimaryContact', () => {
    it('returns a place with its contact hydrated', () => {
      const contact = { _id: 'contact-0', _rev: 'rev-0', type: 'person' };
      const contacts = [{ _id: 'contact-1', _rev: 'rev-1', type: 'person' }, contact];
      const place0 = { _id: 'place-0', _rev: 'rev-1', contact: { _id: 'contact-0' } };

      const result = hydratePrimaryContact(contacts)(place0);

      expect(result).to.deep.equal({ ...place0, contact });
      expect(debug.notCalled).to.be.true;
    });

    it('returns a place unchanged if no contacts are provided', () => {
      const place0 = { _id: 'place-0', _rev: 'rev-1', contact: { _id: 'contact-0' } };

      const result = hydratePrimaryContact([])(place0);

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

      const result = hydratePrimaryContact(contacts)(place0);

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

      const result = hydratePrimaryContact(contacts)(place0);

      expect(result).to.equal(place0);
      expect(debug.notCalled).to.be.true;
    });

    it('returns null if no place is provided', () => {
      const contacts = [
        { _id: 'contact-1', _rev: 'rev-1', type: 'person' },
        { _id: 'contact-2', _rev: 'rev-0', type: 'person' }
      ];

      const result = hydratePrimaryContact(contacts)(null);

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

      const result = hydrateLineage(contact, places);

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

      const result = hydrateLineage(contact, places);

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
});
