describe('ContactMuted service', function() {

  'use strict';

  let service;

  beforeEach(function() {
    module('adminApp');
    inject(function(_ContactMuted_) {
      service = _ContactMuted_;
    });
  });

  it('should return false when no doc', () => {
    chai.expect(service()).to.equal(false);
  });

  it('should return true when doc is muted', () => {
    chai.expect(service({ muted: true })).to.equal(true);
  });

  it('should return false when lineage is provided and empty', () => {
    chai.expect(service({}, [])).to.equal(false);
  });

  it('should return false when lineage is provided and there is no muted parent', () => {
    chai.expect(service({}, [{ a: 1 }, { b: 2 }, { c: 3 }, {}, { d: 4 }])).to.equal(false);
  });

  it('should return true when lineage is provided and there is at least one muted parent', () => {
    chai.expect(service({}, [{ muted: true }, {}, {}, { a: 1 }])).to.equal(true);
    chai.expect(service({}, [{ muted: false }, {}, { muted: true }, { a: 1 }])).to.equal(true);
    chai.expect(service({}, [{ muted: false }, {}, { muted: false }, { a: 1, muted: true }])).to.equal(true);
  });

  it('should return false when lineage is not provided and there is no muted parent', () => {
    chai.expect(service({ parent: { parent: { parent: { _id: 1, parent: {} } } } })).to.equal(false);
    chai.expect(service({ parent: { muted: false, parent: { parent: { _id: 1, parent: { muted: false } } } } }))
      .to.equal(false);
  });

  it('should return true when lineage is not provided and there is at lease one muted parent', () => {
    chai.expect(service({ parent: { muted: true, parent: { muted: false, parent: {} } } })).to.equal(true);
    chai.expect(service({ parent: { parent: { muted: true, parent: { } } } })).to.equal(true);
    chai.expect(service({ parent: { parent: { parent: { parent: { muted: true } } } } })).to.equal(true);
  });

  it('should return muted timestamp when contact is muted', () => {
    chai.expect(service({ muted: 1234 })).to.equal(1234);
    chai.expect(service({ muted: 'alpha' })).to.equal('alpha');
  });

  it('should return first muted parent timestamp', () => {
    chai.expect(service({ parent: { muted: 1, parent: { muted: 2, parent: { muted: 3 } } } })).to.equal(1);
    chai.expect(service({}, [{ muted: 1 }, { muted: 2 }, { muted: 3 }, {}])).to.equal(1);
  });
});
