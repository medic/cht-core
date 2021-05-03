const commonElements = require('../../page-objects/common/common.po.js');
const loginPage = require('../../page-objects/login/login.po.js');

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

  const frTranslations ={
    user: `Nom d'utilisateur`,
    pass: 'Mot de passe',
    error: `Nom d'utilisateur ou mot de passe incorrect. Veuillez réessayer`
  };

  const esTranslations = {
    user: 'Nombre de usuario',
    pass: 'Contraseña',
    error: 'Nombre de usuario o contraseña incorrecto. Favor intentar de nuevo.'
  };   

  it('should show a warning before log out', async () => {
    const warning = await commonElements.logout();
    expect(warning).toBe('Are you sure you want to log out?');        
  });

  it('should show locale selector on login page', async () => {
    await commonElements.goToLoginPageNative();
    const locales = await loginPage.getAllLocales(); 
    expect(locales).toEqual(defaultLocales);  
  });

  it('should change locale on login page', async () => {

    //French and Spanish translations
    expect(await loginPage.changeLanguage('fr')).toEqual(frTranslations);
    expect(await loginPage.changeLanguage('es')).toEqual(esTranslations);
  });
});
