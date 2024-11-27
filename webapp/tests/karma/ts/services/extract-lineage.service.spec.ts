import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';

import { ExtractLineageService } from '@mm-services/extract-lineage.service';

describe('ExtractLineageService', () => {
  let service: ExtractLineageService;

  beforeEach(() => {
    service = TestBed.inject(ExtractLineageService);
  });

  afterEach(() => sinon.restore());

  it('should be created', () => {
    expect(service).to.exist;
  });

  describe('extract()', () => {
    it('returns nothing when given nothing', () => {
      expect(service.extract(null)).to.equal(null);
    });

    it('extracts orphan', () => {
      const contact = { _id: 'a', name: 'jim' };
      const expected = { _id: 'a' };

      expect(service.extract(contact)).to.deep.equal(expected);
    });

    it('extracts lineage', () => {
      const contact = {
        _id: 'a',
        name: 'jim',
        parent: {
          _id: 'b',
          age: 55,
          parent: {
            _id: 'c',
            sex: true,
            parent: {
              _id: 'd'
            }
          }
        }
      };
      const expected = {
        _id: 'a',
        parent: {
          _id: 'b',
          parent: {
            _id: 'c',
            parent: {
              _id: 'd'
            }
          }
        }
      };

      expect(service.extract(contact)).to.deep.equal(expected);
      // ensure the original contact is unchanged
      expect(contact.parent.age).to.equal(55);
    });
  });

  describe('removeUserFacility()', () => {
    it('should return undefined when lineage is empty or undefined', () => {
      const resultWithUndefined = service.removeUserFacility(undefined as any, 'Kakamega Area');

      expect(resultWithUndefined).to.be.undefined;

      const resultWithEmpty = service.removeUserFacility([], 'Kakamega Area');

      expect(resultWithEmpty).to.be.undefined;
    });

    it('should filter empty strings when no need to remove facility associated to user', () => {
      const resultWithEmpty = service.removeUserFacility([ '', 'place-1', '', 'place-2', '' ], 'Kakamega Area');

      expect(resultWithEmpty).to.have.members([ 'place-1', 'place-2' ]);
    });

    it('should filter empty strings and remove facility associated to user', () => {
      const resultWithEmpty = service.removeUserFacility(
        [ '', 'place-1', '', 'place-2', '', 'Kakamega Area' ],
        'Kakamega Area'
      );

      expect(resultWithEmpty).to.have.members([ 'place-1', 'place-2' ]);
    });
  });
});
