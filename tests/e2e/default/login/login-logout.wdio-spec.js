const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const modalPage = require('@page-objects/default/common/modal.wdio.page');
const constants = require('@constants');
const utils = require('@utils');

describe('Login page funcionality tests', () => {
  const auth = {
    username: constants.USERNAME,
    password: constants.PASSWORD
  };

  afterEach(async () => {
    await browser.reloadSession();
    await browser.url('/');
  });

  describe('Locale', () => {
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
  });

  describe('Log out', () => {
    it('should show a warning before log out', async () => {
      await loginPage.cookieLogin(auth);
      const warning = await commonPage.getLogoutMessage();
      expect(warning).to.equal('You will need an internet connection to log back in.');
    });
  });

  describe('Log in', () => {
    const wrongUsername = 'fakeuser';
    const wrongPassword = 'fakepass';
    const incorrectCredentialsText = 'Incorrect user name or password. Please try again.';
    let expirationDateFieldName;

    before(() => {
      // eslint-disable-next-line no-undef
      expirationDateFieldName = driver.capabilities.browserVersion === '90.0.4430.93' ? 'expiry' : 'expires';
    });

    it('should log in using username and password fields', async () => {
      await loginPage.login(auth);
      await (await commonPage.analyticsTab()).waitForDisplayed();
      await (await commonPage.messagesTab()).waitForDisplayed();
    });

    it('should set correct cookies', async () => {
      await loginPage.login(auth);
      await (await commonPage.analyticsTab()).waitForDisplayed();

      const cookies = await browser.getAllCookies();
      expect(cookies.length).to.equal(3);

      const authSessionCookie = cookies.find(cookie => cookie.name === 'AuthSession');
      expect(authSessionCookie).to.include({
        httpOnly: true,
        sameSite: 'Lax',
        domain: 'localhost',
        secure: false,
        path: '/'
      });
      expect(authSessionCookie[expirationDateFieldName]).to.be.greaterThan(0);

      const userCtxCookie = cookies.find(cookie => cookie.name === 'userCtx');
      expect(userCtxCookie).to.include({
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
      await (await commonPage.messagesTab()).waitForDisplayed();
      // Delete cookies and trigger a request to the server
      await browser.deleteCookies('AuthSession');
      await commonPage.goToReports();

      const description = await (await modalPage.body()).getText();
      expect(description).to.equal('Your session has expired and you have been logged out. Please login to continue.');
      await modalPage.submit();
      expect((await browser.getUrl()).includes('/medic/login')).to.be.true;
    });

    it('should have a title', async () => {
      const branding = await utils.getDoc('branding');
      expect(await browser.getTitle()).to.equal(branding.title);
    });

    it('should try to sign in with blank password and verify that credentials were incorrect', async () => {
      await loginPage.login({ username: wrongUsername, password: '', loadPage: false });
      expect(await loginPage.getErrorMessage()).to.equal(incorrectCredentialsText);
    });

    it('should try to sign in with blank auth and verify that credentials were incorrect', async () => {
      await loginPage.login({ username: '', password: '', loadPage: false });
      expect(await loginPage.getErrorMessage()).to.equal(incorrectCredentialsText);
    });

    it('should try to sign in and verify that credentials were incorrect', async () => {
      await loginPage.login({ username: wrongUsername, password: wrongPassword, loadPage: false });
      expect(await loginPage.getErrorMessage()).to.equal(incorrectCredentialsText);
    });

    it('should hide and reveal password value, and login with a revealed password', async () => {
      await loginPage.setPasswordValue('pass-123');
      let revealedPassword = await loginPage.togglePassword();
      expect(revealedPassword.type).to.equal('text');
      expect(revealedPassword.value).to.equal('pass-123');

      await loginPage.setPasswordValue('pass-456');
      const hiddenPassword = await loginPage.togglePassword();
      expect(hiddenPassword.type).to.equal('password');
      expect(hiddenPassword.value).to.equal('pass-456');

      revealedPassword = await loginPage.togglePassword();
      expect(revealedPassword.type).to.equal('text');
      expect(revealedPassword.value).to.equal('pass-456');

      await loginPage.login(auth);
      await (await commonPage.messagesTab()).waitForDisplayed();
    });
  });
});
