const http = require('node:http');
const { COUCH_AUTH } = process.env;

(() => {
  const options = {
    hostname: 'couchdb-1.local',
    port: 5986,
    path: '/_dbs/medic-test',
    method: 'GET',
    auth: COUCH_AUTH,
    headers: {
      'Content-Type': 'application/json',
    }
  };

  const req = http.request(options, (res) => {
    res.setEncoding('utf8');
    res.on('data', console.log);
    res.on('error', console.error);
  });

  req.end();
})();
