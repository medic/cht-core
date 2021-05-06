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
    expect(service.getMutedParent(null)).to.equal(false);
  });

  it('should return true when doc is muted', () => {
    expect(service.getMuted({ muted: true })).to.equal(true);
    expect(service.getMutedParent({ muted: true })).to.deep.equal({ muted: true });
  });

  it('should return false when lineage is provided and empty', () => {
    expect(service.getMuted({}, [])).to.equal(false);
    expect(service.getMutedParent({}, [])).to.equal(false);
  });

  it('should return false when lineage is provided and there is no muted parent', () => {
    expect(service.getMuted({}, [{ a: 1 }, { b: 2 }, { c: 3 }, {}, { d: 4 }])).to.equal(false);
    expect(service.getMutedParent({}, [{ a: 1 }, { b: 2 }, { c: 3 }, {}, { d: 4 }])).to.equal(false);
  });

  it('should return true when lineage is provided and there is at least one muted parent', () => {
    let lineage:any = [{ muted: true, id: 1 }, {}, {}, { a: 1, id: 2 }];
    expect(service.getMuted({}, lineage)).to.equal(true);
    expect(service.getMutedParent({}, lineage)).to.deep.equal({ muted: true, id: 1 });

    lineage = [{ muted: false, id: 1 }, {}, { muted: true, id: 2 }, { a: 1 }];
    expect(service.getMuted({}, lineage)).to.equal(true);
    expect(service.getMutedParent({}, lineage)).to.deep.equal({ muted: true, id: 2 });

    lineage = [{ muted: false, id: 1 }, {}, { muted: false, di: 2 }, { a: 1, muted: true, id: 3 }];
    expect(service.getMuted({}, lineage)).to.equal(true);
    expect(service.getMutedParent({}, lineage)).to.deep.equal({ a: 1, muted: true, id: 3 });
  });

  it('should return false when lineage is not provided and there is no muted parent', () => {
    let doc:any = { parent: { parent: { parent: { _id: 1, parent: {} } } } };
    expect(service.getMuted(doc)).to.equal(false);
    expect(service.getMutedParent(doc)).to.equal(false);

    doc = { parent: { muted: false, parent: { parent: { _id: 1, parent: { muted: false } } } } };
    expect(service.getMuted(doc)).to.equal(false);
    expect(service.getMutedParent(doc)).to.equal(false);
  });

  it('should return true when lineage is not provided and there is at lease one muted parent', () => {
    let doc:any = { id: 1, parent: { id: 2, muted: true, parent: { id: 3, muted: false, parent: {} } } };
    expect(service.getMuted(doc)).to.equal(true);
    expect(service.getMutedParent(doc)).to.deep.equal(
      { id: 2, muted: true, parent: { id: 3, muted: false, parent: {} } }
    );

    doc = { id: 1, parent: { id: 2, parent: { id: 3, muted: true, parent: { } } } };
    expect(service.getMuted(doc)).to.equal(true);
    expect(service.getMutedParent(doc)).to.deep.equal({ id: 3, muted: true, parent: { } });

    doc = { id: 1, parent: { id: 2, parent: { id: 3, parent: { id: 4, parent: { id: 5, muted: true } } } } };
    expect(service.getMuted(doc)).to.equal(true);
    expect(service.getMutedParent(doc)).to.deep.equal({ id: 5, muted: true });
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
