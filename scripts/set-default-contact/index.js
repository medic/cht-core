/* eslint-disable no-console */
const request = require('request-promise-native');
const express = require('express');

const app = express();
app.use(express.json());

const compileUrl = path => {
  try {
    return new URL(path, process.env.COUCH_URL);
  } catch(e) {
    throw new Error(`Error in compileUrl() while creating URL from ${process.env.COUCH_URL}${path},` +
          ` error is: ${e.message}`);
  }
};

const getChtUsers = async () => {
  console.log('   Using URL taken from COUCH_URL env var: ', process.env.COUCH_URL);
  console.log('');
  const url = compileUrl('/api/v1/users');
  const options = {
    uri: url.href,
    json: true
  };

  return request.get(options)
    .then(users => {
      if (typeof users === 'object' ){
        console.log('   Found', users.length, 'users\n');
        return users;
      }
    });
};

const getObjectFromMedicDb = async id => {
  const url = compileUrl('/medic/' + id);
  const options = {
    uri: url.href,
    json: true
  };

  return request.get(options)
    .then(object => {
      return object;
    });

};

const hasDefaultContact = async user => {
  if(typeof user.place === 'object' && typeof user.contact === 'object' &&  user.place._id  ){
    const place = await getObjectFromMedicDb(user.place._id);
    return !(typeof place.contact === 'object' && !place.contact._id);
  }
  // return true for invalid users like admin or medic so we don't process them
  return true;
};

const filterUsersForDefaultPlace = async users => {
  const filteredUsers = [];
  for (const user of users) {
    const defaultSet = await hasDefaultContact(user);
    if(!defaultSet){
      filteredUsers.push(user);
    }
  }
  return filteredUsers;
};

const savePlace = async (placeId, contactId) => {
  const url = compileUrl('/medic/' + placeId);
  // fetch the place fresh because we need to ensure revision ID is current
  const placeObj = await getObjectFromMedicDb(placeId);
  placeObj.contact._id = contactId;
  placeObj.contact.parent = {_id: placeId};
  const options = {
    uri: url.href,
    json: true,
    body: placeObj
  };
  return request.put(options);
};


const setContactsAsPlacesDefaults = async filteredUsers => {
  let count = 0;
  for (const user of filteredUsers) {
    console.log('   Setting default place for user', user.id);
    await savePlace(user.place._id, user.contact._id);
    count++;
  }
  return count;
};

const go = async () => {
  console.log('\nStart\n');
  try {
    const allUsers = await getChtUsers();
    const filteredUsers = await filterUsersForDefaultPlace(allUsers);
    const updatedCount = await setContactsAsPlacesDefaults(filteredUsers);
    console.log('\n   Updated', updatedCount, 'users');
  } catch (e) {
    if (e.statusCode === 401) {
      console.log('   Bad authentication for CouchDB. Check that COUCH_URL has correct username and password.');
      return;
    }

    console.log('   ' + e.message);
    if (process.env.DEBUG === 'True'){
      console.log('\n   ' + e.stack);
    } else {
      console.log('\n   Pass DEBUG=True to see stack trace');
    }
  }
};

go().then(() => console.log('\nEnd\n'));
