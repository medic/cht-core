const mockConfig = require('../mock-config');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

const extensionFn = `
const getValue = function(obj) {
  let val;
  if (obj.t === 'arr') {
    val = obj.v && obj.v.length && obj.v[0];
  } else {
    val = obj.v;
  }
  if (!val) {
    return 0;
  }
  const parsed = parseInt(val.textContent);
  return isNaN(parsed) ? 0 : parsed;
};

module.exports = function(first, second) {
  const average = (getValue(first) + getValue(second)) / 2;
  return {
    t: 'num',
    v: average
  };
};`;

describe('cht-form web component - form with extension-libs', () => {

  it('submits form successfully', async () => {
    await browser.execute((extensionFn) => {
      const myForm = document.getElementById('myform');
      myForm.extensionLibs = { 'average.js': extensionFn };
    }, extensionFn);
    await mockConfig.loadForm('default', 'test', 'with-extension-libs');

    await commonEnketoPage.setInputValue('First Number', 1);
    await commonEnketoPage.setInputValue('Second Number', 3);

    const [{ fields }] = await mockConfig.submitForm();

    expect(fields.page.first).to.equal('1');
    expect(fields.page.second).to.equal('3');
    expect(fields.page.average).to.equal('2');
  });
});
