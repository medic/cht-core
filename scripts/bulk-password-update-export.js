
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

if (argv.h|| !argv.url || !argv.user || !argv.password || !argv.use_passes) {
  console.log(`Change passwords of users in user-password-change.txt, show results on screen 

Usage:
      node bulk-password-update-export.js -h | --help
      node bulk-password-update-export.js --url https://localhost --user medic --password adminPass

Options:
    -h --help     Show this screen.
    --url         The url for the instance being changed
    --user        The admin user this operation is run as
    --password    The password for the admin user 
    --use_passes  The passwords are in user-password-change.txt in or not. 
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
  for (let user of users) {
    let newPass;
    if ( argv.use_passes === 'true') {
      const user_array = user.toString().split(',');
      if ( user_array[0] && user_array[1] ){
        user = user_array[0].toString().trim();
        newPass = user_array[1].toString().trim();
      }
    } else {
      newPass = await generatePassword();
    }
    await changeUserPass(user, newPass, postOptions);
  }
};

execute();
