const fs = require('fs');
const expect = require('chai').expect;

describe('db sync filter', () => {
  let filterFn;
  before(() => {
    const fn = fs.readFileSync('./ddocs/medic-db/medic-client/filters/db_sync.js');
    filterFn = new Function(`return ${fn}`)();
  });

  it('does not replicate the ddoc', () => {
    const actual = filterFn({ _id: '_design/medic-client' });
    expect(actual).to.equal(false);
  });

  it('does not replicate any ddoc - #3268', () => {
    const actual = filterFn({ _id: '_design/sneaky-mcsneakface' });
    expect(actual).to.equal(false);
  });

  it('does not replicate the resources doc', () => {
    const actual = filterFn({ _id: 'resources' });
    expect(actual).to.equal(false);
  });

  it('does not replicate the service-worker-meta doc', () => {
    const actual = filterFn({ _id: 'service-worker-meta' });
    expect(actual).to.equal(false);
  });

  it('does not replicate forms', () => {
    const actual = filterFn({ _id: '1', type: 'form' });
    expect(actual).to.equal(false);
  });

  it('does not replicate translations', () => {
    const actual = filterFn({ _id: '1', type: 'translations' });
    expect(actual).to.equal(false);
  });

  it('does replicate reports', () => {
    const actual = filterFn({ _id: '1', type: 'data_record' });
    expect(actual).to.equal(true);
  });

  it('does not replicate the branding doc', () => {
    const actual = filterFn({ _id: 'branding' });
    expect(actual).to.equal(false);
  });

  it('does not replicate the partners doc', () => {
    const actual = filterFn({ _id: 'partners' });
    expect(actual).to.equal(false);
  });

  it('does not replicate ', () => {

  });

});
