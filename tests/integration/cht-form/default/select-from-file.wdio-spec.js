const mockConfig = require('../mock-config');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

const colorsXmlContent = `<root>
  <item>
    <name>red</name>
    <label>Red</label>
  </item>
  <item>
    <name>green</name>
    <label>Green</label>
  </item>
  <item>
    <name>blue</name>
    <label>Blue</label>
  </item>
</root>
`;

const setExternalInstances = (xmlContent) => browser.execute((xmlContent) => {
  const myForm = document.getElementById('myform');
  myForm.externalInstances = [{
    id: 'colors',
    xml: new DOMParser().parseFromString(xmlContent, 'text/xml'),
  }];
}, xmlContent);

describe('cht-form web component - Select from external dataset (select_one_from_file)', () => {

  it('loads choices from the provided external instance and submits selected value', async () => {
    await setExternalInstances(colorsXmlContent);
    await mockConfig.loadForm('default', 'test', 'select-from-file');

    expect(await commonEnketoPage.isElementDisplayed('label', 'Red')).to.be.true;
    expect(await commonEnketoPage.isElementDisplayed('label', 'Green')).to.be.true;
    expect(await commonEnketoPage.isElementDisplayed('label', 'Blue')).to.be.true;

    await commonEnketoPage.selectRadioButton('Select a color', 'Red');

    const [{ fields }] = await mockConfig.submitForm();

    expect(fields.color).to.equal('red');
  });
});
