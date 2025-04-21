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

const requestTokenLogin = (retry = 20) => {
  const url = document.getElementById('tokenLogin')?.action;
  const payload = JSON.stringify({ locale: selectedLocale });
  request('POST', url, payload, xmlhttp => {
    let response = {};
    try {
      response = JSON.parse(xmlhttp.responseText);
    } catch (err) {
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

const getSSOLoginUrl = function(){
  window.location.href = '/medic/login/oidc';
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
  const parser = window.bowser.getParser(window.navigator.userAgent);
  return parser.satisfies({
    chrome: '>=90', // Chrome 90 was released on April 14, 2021; for desktop and Android.
    firefox: '>=98', // Firefox 98 was released on March 8, 2022; for desktop and Android.
  });
};

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

const checkUnsupportedBrowser = () => {
  if (!selectedLocale) {
    return;
  }

  let outdatedComponentKey;
  if (isUsingChtAndroid()) {
    if (!isUsingChtAndroidV1()) {
      outdatedComponentKey = 'login.unsupported_browser.outdated_cht_android';
    } else if (!isUsingSupportedBrowser()) {
      outdatedComponentKey = 'login.unsupported_browser.outdated_webview_apk';
    }
  } else if (!isUsingSupportedBrowser()) {
    outdatedComponentKey = 'login.unsupported_browser.outdated_browser';
  }

  if (typeof outdatedComponentKey !== 'undefined') {
    document.getElementById('unsupported-browser-update')?.setAttribute('translate', outdatedComponentKey);
    document.getElementById('unsupported-browser-update').innerText =
      translations[selectedLocale][outdatedComponentKey];
    document.getElementById('unsupported-browser')?.classList.remove('hidden');
  }
};

document.addEventListener('DOMContentLoaded', function() {
  translations = parseTranslations();
  selectedLocale = getLocale(translations);

  translate();

  document.getElementById('locale')?.addEventListener('click', handleLocaleSelection, false);
  const passwordToggle = document.getElementById('password-toggle');
  if (passwordToggle) {
    passwordToggle.addEventListener('click', () => togglePassword(PASSWORD_INPUT_ID), false);
  }

  if (document.getElementById('tokenLogin')) {
    requestTokenLogin();
  } else {
    checkSession();
    document.getElementById('login')?.addEventListener('click', submit, false);

    const user = document.getElementById('user');
    user.addEventListener('keydown', focusOnPassword, false);
    user.focus();

    document.getElementById(PASSWORD_INPUT_ID)?.addEventListener('keydown', focusOnSubmit, false);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js');
    }
  }

  const ssoLoginButton = document.getElementById('login-sso');
  ssoLoginButton.addEventListener('click', function(){
    getSSOLoginUrl();
  });

  checkUnsupportedBrowser();
});

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    checkSession();
  }
});
