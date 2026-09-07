const mockConfig = require('../mock-config');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('cht-form web component - Guidance Hints', () => {

  beforeEach(async () => {
    await mockConfig.loadForm('default', 'test', 'guidance_hints');
  });

  it('should expand and show guidance hint text when clicked', async () => {
    const guidanceToggle = await $('details.or-form-guidance');
    expect(await guidanceToggle.getAttribute('open')).to.be.null;
    // Use browser.execute to reliably click the summary element
    await (await guidanceToggle.$('summary')).click();
    expect(await guidanceToggle.getAttribute('open')).to.not.be.null;
  });

  it('should render markdown in guidance hint', async () => {
    const guidanceToggles = await $$('details.or-form-guidance');
    expect(guidanceToggles.length).to.be.at.least(1);
    const secondGuidance = guidanceToggles[1];
    await (await secondGuidance.$('summary')).click();
    const heading = await secondGuidance.$('h3');
    expect(await heading.isExisting()).to.be.true;
  });

  it('should submit the form successfully', async () => {
    await commonEnketoPage.setInputValue('Question Label', 'test answer');
    const [doc] = await mockConfig.submitForm();
    expect(doc.fields.page.text).to.equal('test answer');
  });

});
