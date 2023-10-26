describe('ExtractLineage service', () => {

  'use strict';

  let service;

  beforeEach(() => {
    module('adminApp');
    inject(_ExtractLineage_ => service = _ExtractLineage_);
  });

  it('returns nothing when given nothing', () => {
    chai.expect(service(null)).to.equal(null);
  });

  it('extracts orphan', () => {
    const contact = { _id: 'a', name: 'jim' };
    const expected = { _id: 'a' };
    chai.expect(service(contact)).to.deep.equal(expected);
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
    chai.expect(service(contact)).to.deep.equal(expected);
    // ensure the original contact is unchanged
    chai.expect(contact.parent.age).to.equal(55);
  });
});
