
process.env.NODE_TLS_REJECT_UNAUTHORIZED=0;
const rpn = require('request-promise-native');
const minimist = require('minimist');
const {promises: fsPromises} = require('fs');

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

const generatePassword = async () => {
  const CHARS =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const randoChar = () => CHARS.charAt(
    Math.floor(Math.random() * CHARS.length)
  );
  // CHT requires 8 minimum sp we'll do 3 upper, 3 lower, 3-4 int
  const characters = Array(4).fill('').map(randoChar).join('') +
    Array(4).fill('').map(randoChar).join('').toLowerCase() +
    Math.floor(Math.random() * (1000 - 9999)) +
    '';
  return characters;
};

// thanks https://bobbyhadz.com/blog/javascript-read-file-into-array !
const loadUsers = async () => {
  try {
    const contents = await fsPromises.readFile('user-password-change.txt', 'utf-8');
    return contents.split(/\r?\n/);
  } catch (err) {
    console.log(err);
  }
};

const execute = async () => {
  let users = [];
  try {
    users = await loadUsers();
  } catch (e) {
    console.log('An error while getting the list of users - ', e.message);
  }
  
  for (const user of users) {
    const trimmedUser = user.trim();
    if (trimmedUser !== '') {
      const postOptions = {...options};
      const newPass = await generatePassword();
      postOptions.body = {
        'password': newPass
      };
      postOptions.uri = `${options.uri}/${user}`;
      try {
        await rpn.post(postOptions);
      } catch (e) {
        console.log('ERROR', trimmedUser, e.message);
      } finally {
        console.log('SUCCESS', trimmedUser, newPass);
      }
    }
  }
};

execute();
