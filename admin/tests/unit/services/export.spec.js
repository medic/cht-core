describe('Export service', () => {
  'use strict';

  const { expect } = chai;

  let service;
  let log;
  let fetch;
  let fetchResponse;
  let link;
  let createElement;
  let appendChild;
  const blob = new Blob(['hello']);

  beforeEach(() => {
    log = { error: sinon.stub() };
    fetchResponse = {
      blob: sinon.stub().resolves(blob),
      headers: {
        get: sinon.stub(),
      },
    };
    fetch = sinon.stub(window, 'fetch').resolves(fetchResponse);

    module('adminApp');
    module($provide => {
      $provide.value('$log', log);
    });
    inject(_Export_ => service = _Export_);

    link = {
      style: {},
      setAttribute: sinon.stub(),
      click: sinon.stub(),
    };
    createElement = sinon.stub(document, 'createElement').returns(link);
    appendChild = sinon.stub(document.body, 'appendChild');
  });

  afterEach(() => sinon.restore());

  it('does not support unknown export type', async () => {
    const type = 'unknown';

    await service(type);

    expect(log.error.calledOnce).to.be.true;
    expect(log.error.args[0]).to.deep.equal([new Error(`Unknown download type: ${type}`)]);
    expect(fetch.callCount).to.equal(0);
  });

  [
    'contacts',
    'dhis',
    'feedback',
    'messages',
    'reports',
    'user-devices',
  ].forEach(type => {
    it(`fetches supported type: ${type}`, async () => {
      await service(type);

      expect(log.error.called).to.be.false;
      expect(fetch.calledOnce).to.be.true;
      expect(fetch.args[0]).to.deep.equal([`/api/v2/export/${type}?filters=&options=`]);
    });
  });

  [
    [null, null, 'filters=&options='],
    ['filter', null, 'filters=filter&options='],
    [null, 'parameter', 'filters=&options=parameter'],
    [
      { my: 'filter', also: 2 },
      { my: 'parameter', and: 1 },
      'filters%5Bmy%5D=filter&filters%5Balso%5D=2&options%5Bmy%5D=parameter&options%5Band%5D=1'
    ],
  ].forEach(([filters, parameters, expected]) => {
    it(`includes filters and parameters in URL`, async () => {
      const type = 'user-devices';

      await service(type, filters, parameters);

      expect(log.error.called).to.be.false;
      expect(fetch.calledOnce).to.be.true;
      expect(fetch.args[0]).to.deep.equal([`/api/v2/export/${type}?${expected}`]);
    });
  });

  it('unpacks fetched response', async () => {
    const type = 'user-devices';
    const blobURL = 'helloWorld';
    const createObjectURL = sinon.stub(URL, 'createObjectURL').returns(blobURL);
    const revokeObjectURL = sinon.stub(URL, 'revokeObjectURL');

    await service(type);

    expect(log.error.called).to.be.false;
    expect(fetch.calledOnce).to.be.true;
    expect(fetch.args[0]).to.deep.equal([`/api/v2/export/${type}?filters=&options=`]);
    expect(fetchResponse.blob.calledOnce).to.be.true;
    expect(createObjectURL.calledOnce).to.be.true;
    expect(createObjectURL.args[0]).to.deep.equal([blob]);
    expect(createElement.calledOnce).to.be.true;
    expect(createElement.args[0]).to.deep.equal(['a']);
    expect(link.style.display).to.equal('none');
    expect(link.href).to.equal(blobURL);
    expect(link.setAttribute.calledOnce).to.be.true;
    expect(link.setAttribute.args[0]).to.deep.equal(['download', 'download']);
    expect(appendChild.calledOnce).to.be.true;
    expect(appendChild.args[0]).to.deep.equal([createElement.returnValues[0]]);
    expect(link.click.calledOnce).to.be.true;
    expect(revokeObjectURL.calledOnce).to.be.true;
    expect(revokeObjectURL.args[0]).to.deep.equal([blobURL]);
  });

  it('uses default filename if no filename in content-disposition', async () => {
    const type = 'user-devices';
    fetchResponse.headers.get.returns('form-data; name="fieldName"');

    await service(type);

    expect(log.error.called).to.be.false;
    expect(fetch.calledOnce).to.be.true;
    expect(link.setAttribute.calledOnce).to.be.true;
    expect(link.setAttribute.args[0]).to.deep.equal(['download', 'download']);
  });

  [
    ['attachment; filename=user-devices-202402201907.csv', 'user-devices-202402201907.csv'],
    ['attachment; name="fieldName"; filename="myFile.csv"', 'myFile.csv'],
    ['attachment;filename="  myFile.csv  ";name="fieldName"', 'myFile.csv'],
    ['attachment; filename=myFile.csv; name=fieldName', 'myFile.csv'],
  ].forEach(([contentDisposition, expectedFilename]) => {
    it('uses the filename from the content-disposition header', async () => {
      const type = 'user-devices';
      fetchResponse.headers.get.returns(contentDisposition);

      await service(type);

      expect(log.error.called).to.be.false;
      expect(fetch.calledOnce).to.be.true;
      expect(link.setAttribute.calledOnce).to.be.true;
      expect(link.setAttribute.args[0]).to.deep.equal(['download', expectedFilename]);
    });
  });
});
