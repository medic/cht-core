const mockConfig = require('./mock-config');
const {getFormTitle} = require('@page-objects/default/enketo/generic-form.wdio.page');

describe('cht-form web component - Pregnancy Visit Form', () => {

  it('should submit a pregnancy home visit', async () => {
    const url = await mockConfig.startMockApp('pregnancy_home_visit');
    await browser.url(url);

    const title  = await getFormTitle();
    expect(title).to.eq('Pregnancy home visit');

    //In progress

  });
});
