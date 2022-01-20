const rpn = require('request-promise-native');
const uuid = require('uuid');
const fs = require('fs');
const path = require('path');

const getNodes = async (serverUrl) => {
  const response = await rpn.get(`${serverUrl}/_membership`, { json: true });
  return response && response.cluster_nodes;
};

const createUser = async (username, serverUrl, storagePath) => {
  const nodes = await getNodes(serverUrl);
  const password = uuid();
  for (const node of nodes) {
    const url = `${serverUrl}/_node/${node}/_config/admins/${username}`;

    await rpn.put({ url, json: true, method: 'PUT', body: JSON.stringify(password) });
    await fs.promises.writeFile(path.join(storagePath, username), password);
  }

  return { username, password };
};

module.exports = {
  createUser,
};
