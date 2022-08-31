const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-adapter-leveldb'));

const [,, instanceUrl, dbname ] = process.argv;
const db = new PouchDB(`${instanceUrl}/${dbname || 'medic'}`);

const getUsers = async () => {
  const results = await db.allDocs({
    start_key: 'org.couchdb.user',
    end_key: 'org.couchdb.user\ufff0',
    limit: 4,
    conflicts: true,
    include_docs: true,
  });
  return results.rows.map(row => row.doc).filter(doc => !!doc);
};

const updateUser = async (user) => {
  const conflictedRev = user._conflicts && user._conflicts[0];
  if (!conflictedRev) {
    console.log('No conflicted rev found for', user.name);
    return;
  }
  if (user.contact_id && user.facility_id) {
    console.log('User already has required fields', user.name);
    return;
  }

  const conflict = await db.get(user._id, { rev: conflictedRev });
  user.contact_id = user.contact_id || conflict.contact_id;
  user.facility_id = user.facility_id || conflict.facility_id;

  console.log('updating user', user);
  await db.put(user);
};

const updateUsers = async (users) => {
  for (const user of users) {
    await updateUser(user);
  }
};

(async () => {
  const users = await getUsers();
  console.log(users);
  await updateUsers(users);
})();

