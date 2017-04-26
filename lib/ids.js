const _ = require('underscore'),
      logger = require('./logger');

const DEFAULT_ID_LENGTH = 5,
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
    throw new Error('generate requires that you pass it a length 0 < x < 14');
  }

  if (length > MAX_ID_LENGTH) {
    // After this length a call to Math.random() doesn't give enough precision
    // It is doubtful we will need any more than this though
    throw new Error('WARNING: id length of ' + length + ' is too long');
  }

  const randomlyGeneratedPart = randomDigits(length - 1);
  const completedId = addCheckDigit(randomlyGeneratedPart);

  return completedId;
};

/*
 * Given a collection of ids return an array of those not used already
 */
const findUnusedIds = (db, freshIds) => {
  return new Promise((resolve, reject) => {
    db.medic.view('medic', 'patient_by_patient_shortcode_id', {
      keys: [...freshIds]
    }, (err, results) => {
      if (err) {
        return reject(err);
      }

      const uniqueIds = new Set(freshIds);

      _.pluck(results.rows, 'key').forEach(patientId => {
        uniqueIds.delete(patientId);
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
  let cachedIds = new Set().values(),
      currentIdLength = DEFAULT_ID_LENGTH;

  // Developers NB: if you set the cache size too high it will take forever
  // or potentially be impossible to actually generate enough unique randomly
  // generated ids.
  if (MAX_IDS_TO_CACHE * 10 > Math.pow(10, DEFAULT_ID_LENGTH)) {
    throw new Error('MAX_IDS_TO_CACHE too high compared to DEFAULT_ID_LENGTH');
  }

  const getNextValue = () => {
    const {value, done} = cachedIds.next();
    if (done) {
      return findUnusedIds(db, generateNewIds(currentIdLength))
        .then(unusedIds => {
          if (unusedIds.size === 0) {
            // Couldn't do it at this length, increase the length and attempt
            // getNextValue again, thus attempting another cache replenish
            logger.warn('Could not create a unique id of length ' + currentIdLength + ', increasing length');
            currentIdLength += 1;
          } else {
            cachedIds = unusedIds.values();
          }

          return getNextValue();
        });
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
