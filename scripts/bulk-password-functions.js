// thanks https://stackoverflow.com/a/50890409 !

const readline = require('readline');
const rpn = require('request-promise-native');
const {randomInt} = require('crypto');
const areYouSure = async (userCount, extraWarning = '') => {
  const NOTE = ` ****** WARNING ******\

Continuing will log ${userCount} users out of the CHT until you provide them with their updated password.
${extraWarning}
Do you want to continue? [y/N]
`;
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(NOTE, ans => {
    rl.close();
    resolve(ans);
  }));
};

const changeUserPass = async (user, password, options) => {
  const admins = ['admin', 'medic'];
  const adminError = new Error('403 - Cannot change password for "medic" or "admin" users.');
  const postOptions = {...options};
  postOptions.body = {
    'password': password
  };
  postOptions.uri = `${options.uri}/${user}`;
  try {
    if (admins.includes(user)) {
      throw adminError;
    }
    await rpn.post(postOptions);
    console.log('SUCCESS', user, password);
  } catch (e) {
    console.log('ERROR', user, e.message);
  }
};

const generatePassword = async () => {
  const CHAR_COUNT = 4;

  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const LOWER_CHARS = CHARS.toLowerCase();
  const NUMS = '0123456789';
  const rando = (chars) => {
    return Array(CHAR_COUNT)
      .fill('')
      .map(() => chars.charAt(randomInt(chars.length - 1)))
      .join('');
  };

  // thanks https://stackoverflow.com/a/3943985 & https://stackoverflow.com/a/6274381
  const randoShuffle = function (orderedString) {
    const unorderedArray = orderedString.split('');
    const stringLength = (orderedString.length - 1);
    for (let i = stringLength; i > 0; i--) {
      const j = Math.floor(randomInt(2) * (i + 1));
      [unorderedArray[i], unorderedArray[j]] = [unorderedArray[j], unorderedArray[i]];
    }
    return unorderedArray.join('');
  };
  // CHT requires 8 minimum so we'll do 4 upper, 4 lower, 4 int
  return randoShuffle(rando(CHARS) + rando(LOWER_CHARS) + '-' + rando(NUMS));
};

module.exports = { areYouSure, changeUserPass, generatePassword };
