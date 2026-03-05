const {
  setState,
  request,
  getCookie,
  getLocale,
  parseTranslations,
  baseTranslate,
  togglePassword,
  getUserCtx
} = window.AuthUtils;

let selectedLocale;
let translations;

const PASSWORD_INPUT_ID = 'password';

const setTokenState = className => {
  document.getElementById('wrapper').className = `has-error ${className}`;
};

const submit = function(e) {
  e.preventDefault();
  if (document.getElementById('form')?.className === 'loading') {
    // debounce double clicks
    return;
  }
  setState('loading');
  const url = document.getElementById('form')?.action;
  const payload = JSON.stringify({
    user: getUsername(),
    password: document.getElementById(PASSWORD_INPUT_ID)?.value,
    redirect: getRedirectUrl(),
    locale: selectedLocale
  });
  request('POST', url, payload, function(xmlhttp) {
    if (xmlhttp.status === 302) {
      // success - redirect to app
      window.location = xmlhttp.response;
    } else if (xmlhttp.status === 401) {
      // bad user/pass provided
      setState('loginincorrect');
    } else {
      // unknown error
      setState('loginerror');
      console.error('Error logging in', xmlhttp.response);
    }
  });
};

const requestSSOLogin = function(e){
  e.preventDefault();
  if (document.getElementById('form')?.className === 'loading') {
    // debounce double clicks
    return;
  }
  setState('loading');
  const url = '/medic/login/oidc/authorize';
  request('GET', url, null, (xmlhttp) => {
    if (xmlhttp.status === 302) {
      // success - redirect to app
      window.location = xmlhttp.response;
    } else {
      // unknown error
      setState('loginerror');
      console.error('Error logging in', xmlhttp.response);
    }
  });
};

const requestTokenLogin = (retry = 20) => {
  const url = document.getElementById('tokenLogin')?.action;
  const payload = JSON.stringify({ locale: selectedLocale });
  request('POST', url, payload, xmlhttp => {
    let response = {};
    try {
      response = JSON.parse(xmlhttp.responseText);
    } catch {
      // no body
    }
    switch (xmlhttp.status) {
      case 302:
        window.location = xmlhttp.response;
        break;
      case 401:
        setTokenState(response && response.error === 'expired' ? 'tokenexpired' : 'tokeninvalid');
        break;
      case 408:
        if (retry <= 0) {
          return setTokenState('tokentimeout');
        }
        requestTokenLogin(retry - 1);
        break;
      case 400:
        setTokenState(response && response.error === 'missing' ? 'tokenmissing' : 'tokenerror');
        break;
      default:
        setTokenState('tokenerror');
    }
  });
};

const focusOnPassword = function(e) {
  if (e.keyCode === 13) {
    e.preventDefault();
    document.getElementById(PASSWORD_INPUT_ID)?.focus();
  }
};

const focusOnSubmit = function(e) {
  if (e.keyCode === 13) {
    document.getElementById('login')?.focus();
  }
};

const highlightSelectedLocale = function() {
  const locales = document.getElementsByClassName('locale');
  for (const elem of locales) {
    elem.className = (elem.name === selectedLocale) ? 'locale selected' : 'locale';
  }
};

const handleLocaleSelection = function(e) {
  if (e.target.tagName.toLowerCase() === 'a') {
    e.preventDefault();
    selectedLocale = e.target.name;
    translate();
  }
};

const translate = () => {
  baseTranslate(selectedLocale, translations);
  highlightSelectedLocale();
};

const getUsername = function() {
  return document.getElementById('user')?.value.toLowerCase().trim();
};

const getRedirectUrl = function() {
  const urlParams = new URLSearchParams(window.location.search);
  const usernameQueryParam = urlParams.get('username');
  const usernameEntered = getUsername();
  if (usernameQueryParam === usernameEntered) {
    return urlParams.get('redirect');
  }
};

const getSsoError = function() {
  const urlParams = new URLSearchParams(window.location.search);
  const sso_error = urlParams.get('sso_error');

  if (!sso_error || ['ssouserinvalid', 'loginerror'].indexOf(sso_error) === -1) {
    return;
  }
  return sso_error;
};

const checkSession = function() {
  if (getCookie('login') === 'force') {
    // require user to login regardless of session state
    return;
  }
  const userCtx = getUserCtx();
  if (userCtx && userCtx.name) {
    // user is already logged in - redirect to app
    window.location = getRedirectUrl() || userCtx.home || '/';
  }
};

const isUsingSupportedBrowser = () => {
  if (!globalThis.bowser || !globalThis.bowser.getParser) {
    return false;
  }

  const parser = globalThis.bowser.getParser(globalThis.navigator.userAgent);
  return parser.satisfies({
    chrome: '>=90', // Chrome 90 was released on April 14, 2021; for desktop and Android.
    firefox: '>=98', // Firefox 98 was released on March 8, 2022; for desktop and Android.
  });
};

const isSafariBrowser = () => /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);

const isUsingChtAndroid = () => typeof window.medicmobile_android !== 'undefined';

const getAndroidAppVersion = () => {
  if (isUsingChtAndroid() && typeof window.medicmobile_android.getAppVersion === 'function') {
    return window.medicmobile_android.getAppVersion();
  }
};

const isUsingChtAndroidV1 = () => {
  const androidAppVersion = getAndroidAppVersion();
  if (typeof androidAppVersion !== 'string') {
    return false;
  }

  return androidAppVersion.startsWith('v1.');
};

// It will return true if the browser should be blocked from using the app i.e. Safari
const shouldBlockBrowser = () => {
  return isSafariBrowser();
};

const checkUnsupportedBrowser = () => {
  if (!selectedLocale) {
    return;
  }

  let outdatedComponentKey;
  const isSafari = isSafariBrowser();
  
  if (isUsingChtAndroid()) {
    if (!isUsingChtAndroidV1()) {
      outdatedComponentKey = 'login.unsupported_browser.outdated_cht_android';
    } else if (!isUsingSupportedBrowser()) {
      outdatedComponentKey = 'login.unsupported_browser.outdated_webview_apk';
    }
  } else if (isSafari) {
    outdatedComponentKey = 'login.unsupported_browser.safari';
  } else if (!isUsingSupportedBrowser()) {
    outdatedComponentKey = 'login.unsupported_browser.outdated_browser';
  }

  if (typeof outdatedComponentKey !== 'undefined') {
    document.getElementById('unsupported-browser-update')?.setAttribute('translate', outdatedComponentKey);
    document.getElementById('unsupported-browser-update').innerText =
      translations[selectedLocale][outdatedComponentKey];
    document.getElementById('unsupported-browser')?.classList.remove('hidden');

    if (isSafari) {
      document.getElementById('login-fields')?.classList.add('hidden');
      document.querySelector('.locale-wrapper .loading')?.classList.add('hidden');
    }
  }
};

const handleLoginButton = () => {
  const loginButton = document.getElementById('login');
  if (loginButton) {
    loginButton.addEventListener('click', submit, false);
  }
};

const handleUserInputFocus = () => {
  const userInput = document.getElementById('user');
  if (userInput) {
    userInput.addEventListener('keydown', focusOnPassword, false);
    userInput.focus();
  }
};

const handlePasswordInputFocus = () => {
  const passwordInput = document.getElementById(PASSWORD_INPUT_ID);
  if (passwordInput) {
    passwordInput.addEventListener('keydown', focusOnSubmit, false);
  }
};

const handlePasswordToggle = () => {
  const passwordToggle = document.getElementById('password-toggle');
  if (passwordToggle) {
    passwordToggle.addEventListener('click', () => togglePassword(PASSWORD_INPUT_ID), false);
  }
};

const handleServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js');
  }
};

document.addEventListener('DOMContentLoaded', function() {
  translations = parseTranslations();
  selectedLocale = getLocale(translations);
  translate();

  document.getElementById('locale')?.addEventListener('click', handleLocaleSelection, false);
  handlePasswordToggle();

  checkUnsupportedBrowser();

  if (document.getElementById('tokenLogin')) {
    if (!shouldBlockBrowser()) {
      requestTokenLogin();
    }
  } else {
    checkSession();
    handleLoginButton();
    handleUserInputFocus();
    handlePasswordInputFocus();
    handleServiceWorker();
  }

  const ssoLoginButton = document.getElementById('login-sso');
  if (ssoLoginButton) {
    ssoLoginButton.addEventListener('click', requestSSOLogin, false);
  }

});

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    checkSession();
  }

  const ssoError = getSsoError();
  if (ssoError) {
    setState(ssoError);
  }
});
