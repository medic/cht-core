
process.env.NODE_TLS_REJECT_UNAUTHORIZED=0;
const minimist = require('minimist');
const {promises: fsPromises} = require('fs');
const readline = require('readline');
const rpn = require('request-promise-native');
const {randomInt} = require('crypto');
const csvSync = require('csv-parse/sync');

const argv = minimist(process.argv.slice(2), {
  alias: {
    'h': 'help'
  }
});

if (argv.h|| !argv.url || !argv.user || !argv.password || !argv.use_passes) {
  console.log(`Change passwords of users in user-password-change.csv, show results on screen 

Usage:
      node bulk-password-update-export.js -h | --help
      node bulk-password-update-export.js --url https://localhost --user medic --password adminPass --use_passes false

Options:
    -h --help     Show this screen.
    --url         The url for the instance being changed
    --user        The admin user this operation is run as
    --password    The password for the admin user 
    --use_passes  The passwords are in user-password-change.csv in or not. 
                  "true" - yes they're there in USER, PASSWORD format
                  "false" - no, no password, just usernames, one per line. Generate a random password for me.

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

const admins = ['admin', 'medic'];
const user = argv.user;
const password = argv.password;

const options = {
  uri: url.href,
  json: true,
  headers: {
    'Authorization': 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64')
  }
};

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

const changeUserPass = async (user, options) => {
  const postOptions = {...options};
  postOptions.body = {
    'password': user.pass
  };
  postOptions.uri = `${options.uri}/${user.name}`;
  try {
    if (admins.includes(user.name)) {
      throw new Error(`403 - Password change for "${user.name}" not allowed .`);
    }
    if (user.name.toString().trim() === '') {
      throw new Error(`404 - Username is blank - check CSV and run again.`);
    }
    await rpn.post(postOptions);
    console.log('SUCCESS', user.name, user.pass);
  } catch (e) {
    console.log('ERROR', user.name, e.message);
  }
};

const generatePassword = () => {
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
const loadUsers = async (use_passes) => {
  try {
    const contents = await fsPromises.readFile('user-password-change.csv', 'utf-8');
    let columns = ['name'];
    if ( use_passes ){
      columns = ['name', 'pass'];
    }
    return csvSync.parse(contents, {
      columns: columns,
      trim: true,
      skip_empty_lines: true
    });
  } catch (err) {
    console.log(err.message);
    process.exit(1);
  }
};

const execute = async () => {
  let use_passes = false;
  let extraWarning = '\nThey will each get a random password which will be printed below.\n';
  if (argv.use_passes === 'true') {
    use_passes = true;
    extraWarning = '\nThey will have their password updated to the one in "user-password-change.csv".\n';
  }
  const users = await loadUsers(use_passes);
  const input = await areYouSure(users.length, extraWarning);
  if (input.toLowerCase() !== 'y') {
    process.exit(0);
  }

  const postOptions = {...options};
  for (const user of users) {
    if (!use_passes) {
      user.pass = generatePassword();
    }
    await changeUserPass(user, postOptions);
  }
};

execute();
