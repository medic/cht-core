const rpn = require('request-promise-native');
process.env.NODE_TLS_REJECT_UNAUTHORIZED=0;
const minimist = require('minimist');
const readline = require('readline');

const argv = minimist(process.argv.slice(2), {
  alias: {
    'h': 'help'
  }
});

if (argv.h|| !argv.url || !argv.user || !argv.password) {
  console.log(`Set all user passwords to Secret_1.

Usage:
      node bulk-password-change.js -h | --help
      node bulk-password-change.js --url https://localhost --user medic --password adminPass

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

// thanks https://stackoverflow.com/a/50890409 !
const areYouSure = async () => {
  const NOTE = ` ****** WARNING ******\

Continuing will log ALL users out of the CHT until you provide them with the password. 

They will ALL have the same password "Secret_1"

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
  const admins = ['admin', 'medic'];
  const adminError = new Error('403 - Cannot change password for "medic" or "admin" users.');
  const postOptions = {...options};
  postOptions.body = {
    'password': 'Secret_1'
  };
  postOptions.uri = `${options.uri}/${user}`;
  try {
    if (admins.includes(user)) {
      throw adminError;
    }
    await rpn.post(postOptions);
    console.log('SUCCESS', user);
  } catch (e) {
    console.log('ERROR', user, e.message);
  }
};

const execute = async () => {
  const input = await areYouSure();
  if (input.toLowerCase() !== 'y') {
    process.exit(0);
  }
  let users = [];
  try {
    users = await rpn.get(options);
  } catch (e) {
    console.log('An error while getting the list of users - ', e.message);
  }

  users.forEach(async (user) => {
    await changeUserPass(user.username, options);
  });
};

execute();
