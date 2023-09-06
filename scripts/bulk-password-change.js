const rpn = require('request-promise-native');
process.env.NODE_TLS_REJECT_UNAUTHORIZED=0;
const minimist = require('minimist');

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

const execute = async () => {
  let users = [];
  try {
    users = await rpn.get(options);
  } catch (e) {
    console.log('An error while getting the list of users - ', e.message);
  }
  
  users.forEach(async (user) => {
    const postOptions = Object.assign({}, options);
    postOptions.body = {
      'password': 'Secret_1'
    };
    postOptions.uri = `${options.uri}/${user.username}`;
    try {
      await rpn.post(postOptions);
    } catch (e) {
      console.log('An error while updating the password - ', e.message);
    }
  });
};

execute();
