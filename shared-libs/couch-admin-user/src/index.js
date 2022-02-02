const rpn = require('request-promise-native');
const uuid = require('uuid').v4;
const path = require('path');

const getNodes = async (serverUrl) => {
  const response = await rpn.get(`${serverUrl}/_membership`, { json: true });
  return response && response.cluster_nodes;
};

const createUser = async (username, serverUrl) => {
  const nodes = await getNodes(serverUrl);
  const password = uuid();
  for (const node of nodes) {
    const url = `${serverUrl}/_node/${node}/_config/admins/${username}`;
    await rpn.put({ url, json: true, method: 'PUT', body: password });
  }

  return { username, password };
};

module.exports = {
  create: createUser,
};
