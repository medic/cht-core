const _ = require('underscore'),
      logger = require('./logger');

const ID_LENGTH_DOC_ID = 'shortcode-id-length',
      ID_LENGTH_PARAM = 'current_length',
      MIN_ID_LENGTH = 5,
      INITIAL_ID_LENGTH = MIN_ID_LENGTH,
      MAX_ID_LENGTH = 13,
      MAX_IDS_TO_CACHE = 100;

/*
Is not used to actually directly check ID validity: instead, it introduces an inherent
check that the ID is the correct one, because making a mistake like transposing
two numbers results in a different checksum digit, and thus an invalid id.
 - 1234 -> 12348
 - 1324 -> 13249, a transpose also changes the checksum id
*/
const addCheckDigit = (digits) => {
  const digitArray = digits.split('');

  const offset = digitArray.length + 1;
  const total = _.reduce(
    digitArray,
    (sum, digit, index) => sum + (Number(digit) * (offset - index)),
    0
  );

  const result = total % 11;
  digitArray.push(result === 10 ? 0 : result);

  return digitArray.join('');
};

const randomDigits = (length) =>
  Math.random().toString().replace('0.', '').substring(0, length);

const generateId = (length) => {
  if (length && typeof length !== 'number') {
    throw new Error(`generateId requires that you pass it a length ${MIN_ID_LENGTH} <= x <= ${MAX_ID_LENGTH}`);
  }

  if (length < MIN_ID_LENGTH) {
    // This minimum is mostly arbitrary. However, MAX_IDS_TO_CACHE is somewhat
    // based on what is good for lengths of 5-7 digits (ie realistic default
    // lengths). If we want shorter IDs in the future we'd need to re-calcuate
    // this value, or potentially make it a function of current id length.
    throw new Error(`id length of ${length} is too short`);
  }

  if (length > MAX_ID_LENGTH) {
    // After this length a call to Math.random() doesn't give enough precision
    // It is doubtful we will need any more than this though
    throw new Error(`id length of ${length} is too long`);
  }

  const randomlyGeneratedPart = randomDigits(length - 1);
  const completedId = addCheckDigit(randomlyGeneratedPart);

  return completedId;
};

const getIdLengthDoc = db =>
  new Promise((resolve, reject) =>
    db.medic.get(ID_LENGTH_DOC_ID, (err, result) => {
      if (err) {
        if (err.statusCode !== 404) {
          return reject(err);
        } else {
          result = {
            _id: ID_LENGTH_DOC_ID
          };

          result[ID_LENGTH_PARAM] = INITIAL_ID_LENGTH;
        }
      }

      resolve(result);
    }));

const putIdLengthDoc = (db, idLengthDoc) =>
  new Promise((resolve, reject) =>
    db.medic.insert(idLengthDoc, err => {
      if (err) {
        // We're OK with a 409, because we're going to presume this is happening
        // because a human edited it to suite their needs, and their write is more
        // important than ours.
        if (err.statusCode === 409) {
          logger.warn(`409 while trying to store ${idLengthDoc}. If someone edited this document it is expected.`);
        } else {
          return reject(err);
        }
      }

      resolve();
    }));

/*
 * Given a collection of ids return an array of those not used already
 */
const findUnusedIds = (db, freshIds) => {
  const keys = [...freshIds].reduce((keys, id) => {
    keys.push(['shortcode', id], ['tombstone-shortcode', id]);
    return keys;
  }, []);
  return new Promise((resolve, reject) => {
    db.medic.view('medic-client', 'contacts_by_reference', { keys: keys }, (err, results) => {
      if (err) {
        return reject(err);
      }

      const uniqueIds = new Set(freshIds);

      results.rows.forEach(row => {
        uniqueIds.delete(row.key[1]);
      });
      resolve(uniqueIds);
    });
  });
};

const generateNewIds = (currentIdLength) => {
  const freshIds = new Set();
  do {
    freshIds.add(generateId(currentIdLength));
  } while (freshIds.size < MAX_IDS_TO_CACHE);

  return freshIds;
};

const generator = function*(db) {
  let cachedIds = new Set().values();

  // Developers NB: if you set the cache size too high it will take forever
  // or potentially be impossible to actually generate enough unique randomly
  // generated ids.
  if (MAX_IDS_TO_CACHE * 10 > Math.pow(10, INITIAL_ID_LENGTH)) {
    throw new Error('MAX_IDS_TO_CACHE too high compared to DEFAULT_ID_LENGTH');
  }

  const getNextValue = () => {
    const {value, done} = cachedIds.next();
    if (done) {
      return getIdLengthDoc(db)
        .then(idLengthDoc =>
          findUnusedIds(db, generateNewIds(idLengthDoc[ID_LENGTH_PARAM]))
            .then(unusedIds => {
              if (unusedIds.size === 0) {
                // Couldn't do it at this length, increase the length and attempt
                // getNextValue again, thus attempting another cache replenish
                logger.warn('Could not create a unique id of length ' + idLengthDoc[ID_LENGTH_PARAM] + ', increasing length');
                idLengthDoc[ID_LENGTH_PARAM] += 1;
                return putIdLengthDoc(db, idLengthDoc).then(getNextValue);
              } else {
                cachedIds = unusedIds.values();
                return getNextValue();
              }}));
    } else {
      return Promise.resolve(value);
    }
  };

  while (true) {
    yield getNextValue();
  }
};

module.exports = {
    _generate: generateId,

    /*
      Returns a generator that creates random N digit IDs. The last ID is a
      checksum digit. ID length starts at 5 and is increased if it is determined
      that there the ID space has been depleted.
    */
    generator: generator
};
