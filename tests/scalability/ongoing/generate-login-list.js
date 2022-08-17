const uploadData = require('./upload-data');

(async () => {
  try {
    const usernames = await uploadData.getUsers();
    const loginMap = usernames.map(username => ({ username, password: 'Secret_1' }));
    await uploadData.generateLoginList(loginMap);
  } catch (err) {
    console.error('Error while generating data', err);
    process.exit(1);
  }
})();

