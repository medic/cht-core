const { expect } = require('chai');
const express = require('express');
const path = require('path');
const { getFormTitle } = require('@page-objects/default/enketo/generic-form.wdio.page');

describe('cht-form web component', () => {
  const mockApp = express();
  mockApp.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
  mockApp.use(express.static(path.join(__dirname, '../../../webapp/dist/cht-form')));


  let server;

  const startMockApp = (formName) => {
    mockApp.get('/form.js', (req, res) => res.sendFile(path.join(__dirname, 'forms', `${formName}.js`)));

    return new Promise(resolve => {
      server = mockApp.listen(resolve);
    }).then(() => `http://localhost:${server.address().port}`);
  };

  const stopMockApp = () => {
    server && server.close();
  };

  after(() => {
    stopMockApp();
  });

  it('should render form', async () => {
    const url = await startMockApp('enketo_widgets')
    await browser.url(url);

    const title  = await getFormTitle();
    expect(title).to.eq('Enketo Widgets');
  });
});
