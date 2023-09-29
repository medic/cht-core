const { getFormTitle } = require('@page-objects/default/enketo/generic-form.wdio.page');
const mockConfig = require('./mock-config');

describe('cht-form web component', () => {

  it('should render form', async () => {
    const url = await mockConfig.startMockApp('enketo_widgets');
    await browser.url(url);

    const title  = await getFormTitle();
    expect(title).to.eq('Enketo Widgets');
  });
});
