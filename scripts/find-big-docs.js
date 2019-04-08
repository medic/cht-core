/**
 * Returns all the docs ids in the db sorted by doc size
 * (not including attachments).
 *
 * WARNING: this makes one request per doc in the db so it will
 * take some time.
 */
const http = require('http');

const pageSize = 100;

const HOST = 'localhost';
const PORT = 5984;
const AUTH = 'admin:pass';
const DB_NAME = 'medic';

const results = [];

const getIdPage = skip => {
  return new Promise(resolve => {
    http.get(`http://${AUTH}@${HOST}:${PORT}/${DB_NAME}/_all_docs?limit=${pageSize}&skip=${skip}`, res => {
      let data = '';
     
      // A chunk of data has been recieved.
      res.on('data', (chunk) => {
        data += chunk;
      });
     
      // The whole response has been received. Print out the result.
      res.on('end', () => {
        const result = JSON.parse(data);
        const ids = result.rows.map(row => row.id);
        resolve(ids);
      });
    });
  });
};

const getIds = (ids=[], skip=0) => {
  return getIdPage(skip).then(pageOfIds => {
    if (!pageOfIds.length) {
      // finished
      return ids;
    }
    ids = ids.concat(pageOfIds);
    return getIds(ids, skip + pageSize);
  });
};

const getSize = id => {
  return new Promise((resolve) => {
    const options = {
      host: HOST,
      port: PORT,
      auth: AUTH,
      path: `/${DB_NAME}/${id}`,
      method: 'HEAD'
    };
    const req = http.request(options, res => {
      results.push({
        id: id,
        size: res.headers['content-length']
      });
      resolve();
    });
    req.end();
  });
};

const output = () => {
  results.sort((lhs, rhs) => lhs.size - rhs.size);
  results.forEach(result => console.log(`${result.id} = ${result.size}`));
};

getIds()
  .then(ids => {
    let chain = Promise.resolve();
    ids.forEach(id => {
      chain = chain.then(() => getSize(id));
    });
    return chain;
  })
  .then(output)
  .catch(err => {
    console.error(err);
  });
