const rpn = require('request-promise-native');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
const minimist = require('minimist');
const fs = require('fs');
const defaultPassword = 'Secret_1';

const argv = minimist(process.argv.slice(2), {
  alias: {
    'h': 'help'
  }
});

if (argv.h || !argv.url || !argv.user || !argv.password) {
  console.log(`Set all user passwords to Secret_1.

Usage:
      node bulk-password-change.js -h | --help
      node bulk-password-change.js --url https://localhost --user medic --password adminPass

Options:
    -h --help     Show this screen.
    --url         The url for the instance being changed
    --user        The admin user this operation is run as
    --password    The password for the admin user
    --generateJSON Generates a json file with user and password. 

`);
  process.exit(0);
}

const baseURL = argv.url;
const generate = argv.generateJSON;

let url;
try {
  url = new URL('_users/_all_docs', baseURL);
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

const storeJson = (users) => {
  const userPass = users.rows.map((user) => { return { name: user.doc.name, pass: defaultPassword } });
  const jsonString = JSON.stringify({
    url: `${baseURL}/medic`,
    users: userPass
  });
  fs.writeFile('./config.json', jsonString, err => {
    if (err) {
      console.log('Error writing file', err);
    } else {
      console.log('Successfully wrote file');
    }
  });
};

const execute = async () => {
  let users = [];
  try {
    const getOptions = Object.assign({ qs: { include_docs: true, startkey: '"org.couchdb.user"' } }, options);
    users = await rpn.get(getOptions);
  } catch (e) {
    console.log('An error while getting the list of users - ', e.message);
  }

  users.rows.forEach(async (user) => {
    const postOptions = Object.assign({}, options);
    postOptions.body = {
      _rev: user.doc._rev,
      name: user.doc.name,
      roles: user.doc.roles,
      type: user.doc.type,
      password: defaultPassword
    };
    postOptions.uri = new URL(`_users/${user.id}`, baseURL).href;
    try {
      await rpn.put(postOptions);
    } catch (e) {
      console.log('An error while updating the password - ', e.message);
    }
  });
  if (generate) {
    console.log('users');
    storeJson(users);
  }
};

execute();
