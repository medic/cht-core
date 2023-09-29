const express = require('express');
const path = require('path');

let server;
const mockApp = express();
mockApp.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
mockApp.use(express.static(path.join(__dirname, '../../../webapp/dist/cht-form')));

const startMockApp = (formName) => {
  mockApp.get('/form.js', (req, res) => res.sendFile(path.join(__dirname, 'forms', `${formName}.js`)));

  return new Promise(resolve => {
    server = mockApp.listen(resolve);
  }).then(() => `http://localhost:${server.address().port}`);
};

const stopMockApp = () => {
  server && server.close();
};

module.exports = {
  startMockApp,
  stopMockApp,
};
