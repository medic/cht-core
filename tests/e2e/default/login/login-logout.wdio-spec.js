const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const modalPage = require('@page-objects/default/common/modal.wdio.page');
const constants = require('@constants');
const utils = require('@utils');

describe('Login page functionality tests', () => {
  const auth = {
    username: constants.USERNAME,
    password: constants.PASSWORD
  };

  afterEach(async () => {
    await commonPage.reloadSession();
  });

  describe('Locale', () => {
    const defaultLocales = [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Español (Spanish)' },
      { code: 'fr', name: 'Français (French)' },
      { code: 'ne', name: 'नेपाली (Nepali)' },
      { code: 'sw', name: 'Kiswahili (Swahili)' }
    ];

    const frTranslations = {
      user: `Nom d'utilisateur`,
      pass: 'Mot de passe',
      error: `Nom d'utilisateur ou mot de passe incorrect. Veuillez réessayer.`
    };

    const esTranslations = {
      user: 'Nombre de usuario',
      pass: 'Contraseña',
      error: 'Nombre de usuario o contraseña incorrecto. Inténtelo de nuevo.'
    };

    it('should show locale selector on login page', async () => {
      const locales = await loginPage.getAllLocales();
      expect(locales).to.deep.equal(defaultLocales);
    });

    it('should change locale to French', async () => {
      expect(await loginPage.changeLanguage('fr', frTranslations.user)).to.deep.equal(frTranslations);
      expect(await loginPage.getCurrentLanguage()).to.deep.equal({ code: 'fr', name: 'Français (French)' });
    });

    it('should change locale to Spanish', async () => {
      expect(await loginPage.changeLanguage('es', esTranslations.user)).to.deep.equal(esTranslations);
      expect(await loginPage.getCurrentLanguage()).to.deep.equal({ code: 'es', name: 'Español (Spanish)' });
    });
  });

  describe('Log out', () => {
    it('should show a warning before log out', async () => {
      await loginPage.cookieLogin(auth);
      expect(await commonPage.getLogoutMessage()).to.equal('You will need an internet connection to log back in.');
    });
  });

  describe('Log in', () => {
    const WRONG_USERNAME = 'fakeuser';
    const WRONG_PASSWORD = 'fakepass';
    const INCORRECT_CREDENTIALS_TEXT = 'Incorrect user name or password. Please try again.';
    let brandingDoc;

    before(async () => {
      brandingDoc = await utils.getDoc('branding');
    });

    it('should log in using username and password fields', async () => {
      await loginPage.login(auth);
      await (await commonPage.tabsSelector.analyticsTab()).waitForDisplayed();
      await (await commonPage.tabsSelector.messagesTab()).waitForDisplayed();
    });

    it('should set correct cookies', async () => {
      await loginPage.login(auth);
      await (await commonPage.tabsSelector.analyticsTab()).waitForDisplayed();

      const cookies = await browser.getCookies();
      expect(cookies.length).to.equal(3);

      const authSessionCookie = cookies.find(cookie => cookie.name === 'AuthSession');
      expect(authSessionCookie).to.include({
        httpOnly: true,
        sameSite: 'Lax',
        domain: 'localhost',
        secure: false,
        path: '/'
      });
      expect(authSessionCookie.expiry).to.be.greaterThan(0);

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
      await (await commonPage.tabsSelector.messagesTab()).waitForDisplayed();
      // Delete cookies and trigger a request to the server
      await browser.deleteCookies('AuthSession');
      await commonPage.goToReports();

      const description = await (await modalPage.body()).getText();
      expect(description).to.equal('Your session has expired and you have been logged out. Please login to continue.');
      await modalPage.submit();
      expect((await browser.getUrl()).includes('/medic/login')).to.be.true;
    });

    it('should have a title', async () => {
      await browser.url('/');
      expect(await browser.getTitle()).to.equal(brandingDoc.title);
    });

    it('should try to sign in with blank password and verify that credentials were incorrect', async () => {
      await loginPage.login({ username: WRONG_USERNAME, password: '', loadPage: false });
      expect(await loginPage.getErrorMessage()).to.equal(INCORRECT_CREDENTIALS_TEXT);
    });

    it('should try to sign in with blank auth and verify that credentials were incorrect', async () => {
      await loginPage.login({ username: '', password: '', loadPage: false });
      expect(await loginPage.getErrorMessage()).to.equal(INCORRECT_CREDENTIALS_TEXT);
    });

    it('should try to sign in and verify that credentials were incorrect', async () => {
      await loginPage.login({ username: WRONG_USERNAME, password: WRONG_PASSWORD, loadPage: false });
      expect(await loginPage.getErrorMessage()).to.equal(INCORRECT_CREDENTIALS_TEXT);
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
      await (await commonPage.tabsSelector.messagesTab()).waitForDisplayed();
    });
  });

  describe('Password Reset', () => {
    const CURRENT_PASSWORD_INCORRECT = 'Current password is not correct';
    const MISSING_ALL_FIELDS = 'Missing required fields: "Current password, New password, Confirm password"';
    const MISSING_PASSWORD_CONFIRM = 'Missing required fields: "Confirm password"';
    const PASSWORD_WEAK = 'The password is too easy to guess. Include a range of characters to make it more complex.';
    const PASSWORD_MISMATCH = 'Password and confirm password must match';
    const PASSWORD_SAME = 'New password must be different from current password';
    const NEW_PASSWORD = 'Pa33word1';
    const places = placeFactory.generateHierarchy();
    const districtHospital = places.get('district_hospital');
    const user = userFactory.build({ place: districtHospital._id, roles: ['chw'] });

    before(async () => {
      await utils.saveDocs([...places.values()]);
      await utils.createUsers([user], false, true);
    });

    after(async () => {
      await utils.deleteUsers([user]);
    });

    it('should verify all fields are missing', async () => {
      await browser.url('/');
      await loginPage.setPasswordValue(user.password);
      await loginPage.setUsernameValue(user.username);
      await (await loginPage.loginButton()).click();
      await loginPage.passwordReset('', '', '');
      await (await loginPage.updatePasswordButton()).click();
      expect(await loginPage.getPasswordResetErrorMessage('fields-required')).to.equal(MISSING_ALL_FIELDS);
    });

    it('should verify confirm password is missing', async () => {
      await browser.url('/');
      await loginPage.setPasswordValue(user.password);
      await loginPage.setUsernameValue(user.username);
      await (await loginPage.loginButton()).click();
      await loginPage.passwordReset(user.password, user.password, '');
      await (await loginPage.updatePasswordButton()).click();
      expect(await loginPage.getPasswordResetErrorMessage('fields-required')).to.equal(MISSING_PASSWORD_CONFIRM);
    });

    it('should verify password strength', async () => {
      await browser.url('/');
      await loginPage.setPasswordValue(user.password);
      await loginPage.setUsernameValue(user.username);
      await (await loginPage.loginButton()).click();
      await loginPage.passwordReset(user.password, '12345678', '12345678');
      await (await loginPage.updatePasswordButton()).click();
      expect(await loginPage.getPasswordResetErrorMessage('password-weak')).to.equal(PASSWORD_WEAK);
    });

    it('should verify current password is not correct', async () => {
      await browser.url('/');
      await loginPage.setPasswordValue(user.password);
      await loginPage.setUsernameValue(user.username);
      await (await loginPage.loginButton()).click();
      await loginPage.passwordReset('12', user.password, user.password);
      await (await loginPage.updatePasswordButton()).click();
      expect(await loginPage.getPasswordResetErrorMessage('current-password-incorrect')).to.equal(
        CURRENT_PASSWORD_INCORRECT
      );
    });

    it('should verify current password cannot be same as new password', async () => {
      await browser.url('/');
      await loginPage.setPasswordValue(user.password);
      await loginPage.setUsernameValue(user.username);
      await (await loginPage.loginButton()).click();
      await loginPage.passwordReset(user.password, user.password, user.password);
      await (await loginPage.updatePasswordButton()).click();
      expect(await loginPage.getPasswordResetErrorMessage('password-same')).to.equal(PASSWORD_SAME);
    });

    it('should verify password and confirm password mismatch', async () => {
      await browser.url('/');
      await loginPage.setPasswordValue(user.password);
      await loginPage.setUsernameValue(user.username);
      await (await loginPage.loginButton()).click();
      await loginPage.passwordReset(user.password, NEW_PASSWORD, 'pass');
      await (await loginPage.updatePasswordButton()).click();
      expect(await loginPage.getPasswordResetErrorMessage('password-mismatch')).to.equal(PASSWORD_MISMATCH);
    });

    it('should reset password successfully and redirect to webapp', async () => {
      await browser.url('/');
      await loginPage.setPasswordValue(user.password);
      await loginPage.setUsernameValue(user.username);
      await (await loginPage.loginButton()).click();
      await loginPage.passwordReset(user.password, NEW_PASSWORD, NEW_PASSWORD);
      await (await loginPage.updatePasswordButton()).click();
      await commonPage.waitForPageLoaded();
      await (await commonPage.tabsSelector.messagesTab()).waitForDisplayed();
    });
  });
});
