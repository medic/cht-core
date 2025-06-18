 
console.log(`   Using COUCH_URL env var: ${process.env.COUCH_URL}\n`);

const compileUrl = path => {
  try {
    return new URL(path, process.env.COUCH_URL);
  } catch (e) {
    throw new Error(`Error in compileUrl() while creating URL from ${process.env.COUCH_URL}${path},` +
          ` error is: ${e.message}`);
  }
};

const fetchUrl = async (url, options) => {
  options = {
    ...options,
    headers: {
      'Authorization': 'Basic ' + btoa(`${url.username}:${url.password}`),
      'Content-Type': 'application/json'
    }
  };
  url.username = '';
  url.password = '';

  const response = await fetch(url.toString(), options);
  if (response.ok) {
    return await response.json();
  }

  response.message = await response.text();
  throw response;
};

const getChtUsers = async () => {
  //  pin  to v1 of API so it is backwards compatible with CHT 3.x
  const url = compileUrl('/api/v1/users');
  const users = await fetchUrl(url);
  if (typeof users === 'object') {
    console.log(`   Found ${users.length} users\n`);
    return users;
  }
};

const getObjectFromMedicDb = async id => {
  const url = compileUrl('/medic/' + id);
  return await fetchUrl(url);
};

const hasDefaultContact = async user => {
  if (typeof user.place === 'object' && typeof user.contact === 'object' &&  user.place._id  ){
    const place = await getObjectFromMedicDb(user.place._id);
    return place.contact && place.contact._id;
  }
  // return true for invalid users like admin or medic so we don't process them
  return true;
};

const filterUsersForDefaultPlace = async users => {
  const filteredUsers = [];
  for (const user of users) {
    const defaultSet = await hasDefaultContact(user);
    if (!defaultSet){
      filteredUsers.push(user);
    }
  }
  return filteredUsers;
};

const savePlace = async (placeId, contactId) => {
  const url = compileUrl('/medic/' + placeId);
  // fetch the place fresh because we need to ensure revision ID is current
  const placeObj = await getObjectFromMedicDb(placeId);
  if (!placeObj.contact){
    placeObj.contact = {};
  }
  placeObj.contact._id = contactId;
  placeObj.contact.parent = {_id: placeId};
  return await fetchUrl(url, { body: JSON.stringify(placeObj), method: 'PUT' });
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
    if (e.status === 401) {
      console.log('   Bad authentication for CouchDB. Check that COUCH_URL has correct username and password.');
      return;
    }

    console.log('   ' + e.message);
  }
};

go().then(() => console.log('\nEnd\n'));
