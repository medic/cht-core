const rpn = require('request-promise-native');
process.env.NODE_TLS_REJECT_UNAUTHORIZED=0;
const minimist = require('minimist');

const argv = minimist(process.argv.slice(2), {
  alias: {
    'h': 'help'
  }
});

if(argv.h || !argv.newPassword || !argv.url || !argv.user || !argv.password) {
  console.log(`Set all user passwords to the provided password.

Usage:
    ${process.argv[1]} -h | --help
    ${process.argv[1]} --newPassword Secret_1 --url https://localhost --user medic --password adminPass

Options:
    -h --help     Show this screen.
    --newPassword The password to set for all users
    --url         The url for the instance being changed
    --user        The admin user this operation is run as
    --password    The password for the admin user 

`);
  process.exit(0);
}

const url = argv.url;
const user = argv.user;
const password = argv.password;
const newPassword = argv.newPassword;

const options = {
  uri: `${url}/api/v1/users`,
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
    console.log('An error while getting the list of users');
    console.log(e);
  }
  
  users.forEach(async (user) => {
    const postOptions = Object.assign({}, options);
    postOptions.body = {
      'password': newPassword
    };
    postOptions.uri = `${options.uri}/${user.username}`;
    try {
      rpn.post(postOptions);
    } catch (e) {
      console.log('An error while updating the password');
      console.log(e);
    }
  });
};

execute();
