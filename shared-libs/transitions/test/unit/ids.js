const sinon = require('sinon');
const assert = require('chai').assert;
const { expect } = require('chai');
const jsc = require('jsverify');
const rewire = require('rewire');
const ids = require('../../src/lib/ids.js');
const db = require('../../src/db');
const logger = require('@medic/logger');

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
    [5, 6, 7, 8, 9, 10, 11, 12, 13].forEach(l => assert.equal(ids._generate(l).length, l));
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

  it('generateId throws when length is greater than MAX_ID_LENGTH (13)', () => {
    expect(() => ids._generate(14)).to.throw('id length of 14 is too long');
    expect(() => ids._generate(20)).to.throw('id length of 20 is too long');
  });

  it('getIdLengthDoc throws when db.get rejects with a non-404 error', () => {
    const db = mockDb(() => []);
    db.medic.get.rejects({ status: 500, message: 'server error' });

    return ids.generator(db).next().value.then(
      () => assert.fail('should have thrown'),
      err => {
        assert.equal(err.status, 500);
        assert.equal(err.message, 'server error');
      }
    );
  });

  it('getIdLengthDoc returns default doc when db.get rejects with a 404 error', () => {
    const db = mockDb(() => []);
    db.medic.get.rejects({ status: 404 });

    return ids.generator(db).next().value.then(patientId => {
      assert(patientId);
      // Default doc has current_length = 5 (INITIAL_ID_LENGTH), so generated ID should be length 5
      assert.equal(patientId.length, 5);
    });
  });

  it('putIdLengthDoc throws when db.put rejects with a non-409 error', () => {
    // Force a length increase so putIdLengthDoc is called:
    // Return all ids as "used" for length 5, then return none for length 6
    const db = mockDb(idsList => {
      if (idsList[0].length === 5) {
        return idsList; // all used
      }
      return []; // none used at length 6
    });
    db.medic.put.rejects({ status: 500, message: 'put server error' });

    return ids.generator(db).next().value.then(
      () => assert.fail('should have thrown'),
      err => {
        assert.equal(err.status, 500);
        assert.equal(err.message, 'put server error');
      }
    );
  });

  it('putIdLengthDoc warns and resolves when db.put rejects with a 409 error', () => {
    sinon.stub(logger, 'warn');
    // Force a length increase so putIdLengthDoc is called
    const db = mockDb(idsList => {
      if (idsList[0].length === 5) {
        return idsList; // all used
      }
      return []; // none used at length 6
    });

    db.medic.put.rejects({ status: 409 });

    return ids.generator(db).next().value.then(patientId => {
      assert(patientId);
      assert.equal(patientId.length, 6);
      assert.isAtLeast(logger.warn.callCount, 1);
      const warnCalls = logger.warn.args.map(args => args[0]);
      const has409Warning = warnCalls.some(msg => typeof msg === 'string' && msg.includes('409'));
      assert(has409Warning, 'should have logged a 409 warning');
    });
  });

  it('generator throws when MAX_IDS_TO_GENERATE is too high compared to INITIAL_ID_LENGTH', () => {
    const idsRewired = rewire('../../src/lib/ids.js');
    // Set MAX_IDS_TO_GENERATE high enough that MAX_IDS_TO_GENERATE * 10 > 10^INITIAL_ID_LENGTH
    // INITIAL_ID_LENGTH = 5, so 10^5 = 100000. We need MAX * 10 > 100000, so MAX > 10000
    idsRewired.__set__('MAX_IDS_TO_GENERATE', 100000);

    expect(() => {
      idsRewired.generator(db).next();
    }).to.throw('MAX_IDS_TO_GENERATE too high compared to DEFAULT_ID_LENGTH');
  });

});
