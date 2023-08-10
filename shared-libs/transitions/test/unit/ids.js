const sinon = require('sinon');
const assert = require('chai').assert;
const jsc = require('jsverify');
const ids = require('../../src/lib/ids.js');
const db = require('../../src/db');

const mockDb = (idFilterLogicFn) => {
  sinon.stub(db.medic, 'query').callsFake((view, options) => {
    const ids = options.keys.slice(0);
    const toReturn = {
      rows: idFilterLogicFn(ids).map(key => ({ key }))
    };

    return Promise.resolve(toReturn);
  });

  sinon.stub(db.medic, 'get').resolves({_id: 'shortcode-id-length', current_length: 5});
  sinon.stub(db.medic, 'put').resolves();
  return db;
};

describe('ids', () => {
  afterEach(() => sinon.restore());

  it('generates an id of the given length', () => {
    [5, 6, 7, 8, 9, 10, 11, 12, 13].forEach(l =>
      assert.equal(ids._generate(l).length, l));
  });

  it('ids can start with 0, will be correct length', () => {
    sinon.stub(Math, 'random').returns(0.00001);

    assert.equal(ids._generate(5), '00000');
  });

  it('ids are "always" the length they should be', () => {
    assert(
      jsc.checkForall(jsc.integer(5, 13), i => ids._generate(i).length === i)
    );
  });

  it('id generator returns ids not already used in the DB', () => {
    let potentialIds;
    const db = mockDb((ids) => {
      potentialIds = ids;
      return [];
    });

    return ids.generator(db).next().value.then(patientId => {
      assert(patientId, 'should return id');
      assert(potentialIds.includes(patientId), 'id should come from the cached ids');
    });
  });

  it('id generator doesnt use ids that are already used by the DB', () => {
    let idToUse;
    const db = mockDb(ids => {
      idToUse = ids.shift();
      ids.shift(); // skip the tombstone-shortcode key with the same ID
      return ids;
    });

    return ids.generator(db).next().value.then(patientId => {
      assert.equal(patientId, idToUse);
    });
  });

  it('addUniqueId retries with a longer id if it only generates duplicates', () => {
    let potentialIds;
    const db = mockDb(ids => {
      if (ids[0].length === 5) {
        return ids;
      }
      potentialIds = ids;
      return [];
    });

    return ids.generator(db).next().value.then(patientId => {
      assert(patientId, 'id should be generated');
      assert.equal(patientId.length, 6);
      assert(potentialIds.includes(patientId), 'id should come from the cached ids');
    });
  });

  it('id generator uses id length from the database', () => {
    const db = mockDb(() => []);
    const LENGTH = 10;
    db.medic.get = sinon.stub().resolves({_id: 'shortcode-id-length', current_length: LENGTH});

    return ids.generator(db).next().value.then(patientId => {
      assert(patientId);
      assert.equal(patientId.length, LENGTH);
    });
  });

});
