window.AuthUtils = (function() {

  const setState = (className) => {
    const form = document.getElementById('form');
    if (!form) {
      return;
    }
    form.className = className;
  };

  const request = (method, url, payload, callback) => {
    const xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = () => {
      if (xmlhttp.readyState === XMLHttpRequest.DONE) {
        callback(xmlhttp);
      }
    };
    xmlhttp.open(method, url, true);
    xmlhttp.setRequestHeader('Content-Type', 'application/json');
    xmlhttp.setRequestHeader('Accept', 'application/json');
    xmlhttp.send(payload);
  };

  const extractCookie = (cookies, name) => {
    for (const cookie of cookies) {
      const [cookieName, cookieValue] = cookie.trim().split('=');
      if (cookieName === name) {
        return cookieValue.trim();
      }
    }
    return null;
  };

  const getCookie = (name) => {
    if (!document.cookie) {
      return null;
    }

    const cookies = document.cookie.split(';');
    return extractCookie(cookies, name);
  };

  const getUserCtx = () => {
    const cookie = getCookie('userCtx');
    if (cookie) {
      try {
        return JSON.parse(decodeURIComponent(cookie));
      } catch (e) {
        console.error('Error parsing cookie', e);
      }
    }
  };

  const getLocale = (translations) => {
    const selectedLocale = getCookie('locale');
    const defaultLocale = document.body.getAttribute('data-default-locale');
    const locale = selectedLocale || defaultLocale;
    if (translations[locale]) {
      return locale;
    }
    const validLocales = Object.keys(translations);
    if (validLocales.length) {
      return validLocales[0];
    }
  };

  const parseTranslations = () => {
    const raw = document.body.getAttribute('data-translations');
    return JSON.parse(decodeURIComponent(raw));
  };

  const replaceTranslationPlaceholders = (text, translateValues) => {
    if (!text || !translateValues) {
      return text;
    }

    try {
      const values = JSON.parse(translateValues);
      return Object
        .entries(values)
        .reduce((result, [key, value]) => result.replace(new RegExp(`{{${key}}}`, 'g'), value), text);
    } catch (e) {
      console.error('Error parsing translation placeholders', e);
      return text;
    }
  };

  const baseTranslate = (selectedLocale, translations) => {
    if (!selectedLocale) {
      return console.error('No enabled locales found - not translating');
    }
    document
      .querySelectorAll('[translate]')
      .forEach(elem => {
        let text = translations[selectedLocale][elem.getAttribute('translate')];
        const translateValues = elem.getAttribute('translate-values');
        if (translateValues) {
          text = replaceTranslationPlaceholders(text, translateValues);
        }
        elem.innerText = text;
      });
    document
      .querySelectorAll('[translate-title]')
      .forEach(elem => elem.title = translations[selectedLocale][elem.getAttribute('translate-title')]);
  };

  const togglePassword = (passwordInputId, confirmPasswordInputId = null, currentPasswordInputId = null) => {
    const passwordInput = document.getElementById(passwordInputId);
    if (!passwordInput) {
      return;
    }

    const displayType = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = displayType;
    document.getElementById('password-container')?.classList.toggle('hidden-password');

    if (confirmPasswordInputId) {
      const confirmPasswordInput = document.getElementById(confirmPasswordInputId);
      confirmPasswordInput.type = displayType;
      document.getElementById('confirm-password-container')?.classList.toggle('hidden-password');
    }

    if (currentPasswordInputId) {
      const currentPasswordInput = document.getElementById(currentPasswordInputId);
      currentPasswordInput.type = displayType;
      document.getElementById('current-password-container')?.classList.toggle('hidden-password');
    }
  };

  return {
    setState,
    request,
    getCookie,
    getUserCtx,
    getLocale,
    parseTranslations,
    baseTranslate,
    togglePassword,
  };
})();