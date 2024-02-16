
process.env.NODE_TLS_REJECT_UNAUTHORIZED=0;
const rpn = require('request-promise-native');
const minimist = require('minimist');
const {promises: fsPromises} = require('fs');
const { areYouSure, changeUserPass, generatePassword } = require('./bulk-password-functions.js');

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

const execute = async () => {
  const users = await loadUsers();
  const extraWarning = '\nThey will each get a random password which will be printed below.\n';
  const input = await areYouSure(users.length, extraWarning);
  if (input.toLowerCase() !== 'y') {
    process.exit(0);
  }

  const postOptions = {...options};
  for (const user of users) {
    const newPass = await generatePassword();
    await changeUserPass(user, newPass, postOptions);
  }
};

execute();
