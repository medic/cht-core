import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';

import { ExtractLineageService } from '@mm-services/extract-lineage.service';

describe('ExtractLineageService', () => {
  let service: ExtractLineageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExtractLineageService);
  });

  it('should be created', () => {
    expect(service).to.exist;
  });

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
