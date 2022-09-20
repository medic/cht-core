const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const modalPage = require('../../../page-objects/default/common/modal.wdio.page');
const constants = require('../../../constants');

const auth = {
  username: constants.USERNAME,
  password: constants.PASSWORD
};

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

  const frTranslations = {
    user: `Nom d'utilisateur`,
    pass: 'Mot de passe',
    error: `Nom d'utilisateur ou mot de passe incorrect. Veuillez réessayer`
  };

  const esTranslations = {
    user: 'Nombre de usuario',
    pass: 'Contraseña',
    error: 'Nombre de usuario o contraseña incorrecto. Favor intentar de nuevo.'
  };

  afterEach(async () => {
    await browser.reloadSession();
    await browser.url('/');
  });

  it('should show locale selector on login page', async () => {
    const locales = await loginPage.getAllLocales();
    expect(locales).to.deep.equal(defaultLocales);
  });

  it('should change locale to French', async () => {
    //French translations
    expect(await loginPage.changeLanguage('fr', frTranslations.user)).to.deep.equal(frTranslations);
    expect(await loginPage.getCurrentLanguage()).to.deep.equal({ code: 'fr', name: 'Français (French)' });
  });

  it('should change locale to Spanish', async () => {
    //Spanish translations
    expect(await loginPage.changeLanguage('es', esTranslations.user)).to.deep.equal(esTranslations);
    expect(await loginPage.getCurrentLanguage()).to.deep.equal({ code: 'es', name: 'Español (Spanish)' });
  });

  it('should show a warning before log out', async () => {
    await loginPage.cookieLogin(auth);
    const warning = await commonPage.getLogoutMessage();
    expect(warning).to.equal('Are you sure you want to log out?');
  });

  it('should log in using username and password fields', async () => {
    await loginPage.login(auth);
    await (await commonPage.analyticsTab()).waitForDisplayed();
    await (await commonPage.messagesTab()).waitForDisplayed();
  });

  it('should set correct cookies', async () => {
    await loginPage.login(auth);
    await (await commonPage.analyticsTab()).waitForDisplayed();

    const cookies = await browser.getCookies();
    expect(cookies.length).to.equal(3);

    const authSessionCookie = cookies.find(cookie => cookie.name === 'AuthSession');
    expect(authSessionCookie).to.include({
      httpOnly: true,
      session: false,
      sameSite: 'Lax',
      domain: 'localhost',
      secure: false,
      path: '/'
    });
    expect(authSessionCookie.expires).to.be.greaterThan(0);

    const userCtxCookie = cookies.find(cookie => cookie.name === 'userCtx');
    expect(userCtxCookie).to.include({
      session: false,
      sameSite: 'Lax',
      domain: 'localhost',
      path: '/',
      secure: false,
    });
    const userCtxCookieValue = JSON.parse(decodeURIComponent(userCtxCookie.value));
    expect(userCtxCookieValue).to.include({ name: 'admin' });
    expect(userCtxCookieValue.roles).to.include('_admin');

    const localeCookie = cookies.find(cookie => cookie.name === 'locale');
    expect(localeCookie).to.include({
      session: false,
      sameSite: 'Lax',
      domain: 'localhost',
      path: '/',
      secure: false,
      value: 'en',
    });
  });

  it('should display the "session expired" modal and redirect to login page', async () => {
    // Login and ensure it's redirected to webapp
    await loginPage.login(auth);
    await commonPage.closeTour();
    await (await commonPage.messagesTab()).waitForDisplayed();
    // Delete cookies and trigger a request to the server
    await browser.deleteCookies('AuthSession');
    await commonPage.goToReports();

    expect(await (await modalPage.body()).getText()).to.equal('Your session has expired, please login to continue.');
    await (await modalPage.submit()).click();
    expect((await browser.getUrl()).includes('/medic/login')).to.be.true;
  });
});
