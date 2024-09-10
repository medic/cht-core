const mockConfig = require('../mock-config');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');

describe('cht-form web component - Dynamic URL Widget', () => {
  it('supports displaying a dynamic markdown link in a note', async () => {
    const searchQuery = 'why is Java best';

    await mockConfig.loadForm('default', 'test', 'dynamic-url-widget');
    await commonEnketoPage.setInputValue('Enter your search query', searchQuery);
    await genericForm.nextPage();

    expect(await commonEnketoPage.isElementDisplayed('label', `Click the link to search: ${searchQuery}`)).to.be.true;
    const linkValue = await(await $('a.dynamic-url')).getAttribute('href');
    expect(linkValue).to.equal(`http://google.com?q=${searchQuery}`);
  });
});
