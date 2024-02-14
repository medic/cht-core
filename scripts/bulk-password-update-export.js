
process.env.NODE_TLS_REJECT_UNAUTHORIZED=0;
const rpn = require('request-promise-native');
const minimist = require('minimist');
const {promises: fsPromises} = require('fs');
const { randomInt } = require('crypto');
const readline = require('readline');

const argv = minimist(process.argv.slice(2), {
  alias: {
    'h': 'help'
  }
});

if (argv.h|| !argv.url || !argv.user || !argv.password) {
  console.log(`Change passwords of users in user-password-change.txt to random value, show results on screen 

Usage:
      node bulk-password-update-export.js -h | --help
      node bulk-password-update-export.js --url https://localhost --user medic --password adminPass

Options:
    -h --help     Show this screen.
    --url         The url for the instance being changed
    --user        The admin user this operation is run as
    --password    The password for the admin user 

`);
  process.exit(0);
}

let url;
try {
  url = new URL('/api/v1/users', argv.url);
} catch (e) {
  console.log('Error while creating url', e.message);
  process.exit(0);
}

const user = argv.user;
const password = argv.password;

const options = {
  uri: url.href,
  json: true,
  headers: {
    'Authorization': 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64')
  }
};

// thanks https://stackoverflow.com/a/50890409 !
const areYouSure = async (userCount) => {
  const NOTE = ` ****** WARNING ******\

Continuing will log ${userCount} users out of the CHT until you provide them with their updated password.

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

// thanks https://bobbyhadz.com/blog/javascript-read-file-into-array !
const loadUsers = async () => {
  try {
    const contents = await fsPromises.readFile('user-password-change.txt', 'utf-8');
    const lines = contents.split(/\r?\n/);
    return lines.map(line => line.trim()).filter(line => line.length > 0);
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

const changeUserPass = async (user, postOptions) => {
  const admins = ['admin', 'medic'];
  const adminError = new Error("403 - Cannot change password for 'medic' or 'admin' users.'");
  const newPass = await generatePassword();
  postOptions.body = {
    password: newPass
  };
  postOptions.uri = `${options.uri}/${user}`;
  try {
    if (admins.includes(user)) {
      throw adminError;
    }
    await rpn.post(postOptions);
    console.log('SUCCESS', user, newPass);
  } catch (e) {
    console.log('ERROR', user, e.message);
  }
};

const execute = async () => {
  const users = await loadUsers();
  const input = await areYouSure(users.length);
  if (input.toLowerCase() !== 'y') {
    process.exit(0);
  }

  const postOptions = {...options};
  for (const user of users) {
    await changeUserPass(user, postOptions);
  }
};

execute();
