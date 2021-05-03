const commonElements = require('../../page-objects/common/common.po.js');
const loginPage = require('../../page-objects/login/login.po.js');
const utils = require('../../utils');


describe('Login and logout tests', () => {

  const defaultLocales = [
    { code: 'bm', name: 'Bamanankan (Bambara)' },
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español (Spanish)' },
    { code: 'fr', name: 'Français (French)' },
    { code: 'hi', name: 'हिन्दी (Hindi)' },
    { code: 'id', name: 'Bahasa Indonesia (Indonesian)' },
    { code: 'ne', name: 'नेपाली (Nepali)' },
    { code: 'sw', name: 'Kiswahili (Swahili)' }
  ];

  beforeEach(async () => await utils.beforeEach());

  afterEach(async () => await utils.afterEach());

  it('should show a warning before log out', async () => {
    const warning = await commonElements.logout();
    expect(warning).toBe('Are you sure you want to log out?');        
  });

  it('should show locale selector on login page', async () => {
    await commonElements.goToLoginPageNative();
    const locales = await loginPage.getAllLocales(); 
    expect(locales).toEqual(defaultLocales);  
  });
});
