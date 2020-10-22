import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { ContactMutedService } from '@mm-services/contact-muted.service';

describe('ContactMutedService', () => {
  let service: ContactMutedService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ContactMutedService);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return false when no doc', () => {
    expect(service.getMuted(null)).to.equal(false);
  });

  it('should return true when doc is muted', () => {
    expect(service.getMuted({ muted: true })).to.equal(true);
  });

  it('should return false when lineage is provided and empty', () => {
    expect(service.getMuted({}, [])).to.equal(false);
  });

  it('should return false when lineage is provided and there is no muted parent', () => {
    expect(service.getMuted({}, [{ a: 1 }, { b: 2 }, { c: 3 }, {}, { d: 4 }])).to.equal(false);
  });

  it('should return true when lineage is provided and there is at least one muted parent', () => {
    expect(service.getMuted({}, [{ muted: true }, {}, {}, { a: 1 }])).to.equal(true);
    expect(service.getMuted({}, [{ muted: false }, {}, { muted: true }, { a: 1 }])).to.equal(true);
    expect(service.getMuted({}, [{ muted: false }, {}, { muted: false }, { a: 1, muted: true }])).to.equal(true);
  });

  it('should return false when lineage is not provided and there is no muted parent', () => {
    expect(service.getMuted({ parent: { parent: { parent: { _id: 1, parent: {} } } } })).to.equal(false);
    expect(service.getMuted({ parent: { muted: false, parent: { parent: { _id: 1, parent: { muted: false } } } } }))
      .to.equal(false);
  });

  it('should return true when lineage is not provided and there is at lease one muted parent', () => {
    expect(service.getMuted({ parent: { muted: true, parent: { muted: false, parent: {} } } })).to.equal(true);
    expect(service.getMuted({ parent: { parent: { muted: true, parent: { } } } })).to.equal(true);
    expect(service.getMuted({ parent: { parent: { parent: { parent: { muted: true } } } } })).to.equal(true);
  });

  it('should return muted timestamp when contact is muted', () => {
    expect(service.getMuted({ muted: 1234 })).to.equal(1234);
    expect(service.getMuted({ muted: 'alpha' })).to.equal('alpha');
  });

  it('should return first muted parent timestamp', () => {
    expect(service.getMuted({ parent: { muted: 1, parent: { muted: 2, parent: { muted: 3 } } } })).to.equal(1);
    expect(service.getMuted({}, [{ muted: 1 }, { muted: 2 }, { muted: 3 }, {}])).to.equal(1);
  });
});
