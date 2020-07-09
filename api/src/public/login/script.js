let selectedLocale;
let translations;

const setState = function(className) {
  document.getElementById('form').className = className;
};

const setTokenState = className => {
  document.getElementById('wrapper').className = `has-error ${className}`;
};

const request = function(method, url, payload, callback) {
  const xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (xmlhttp.readyState === XMLHttpRequest.DONE) {
      callback(xmlhttp);
    }
  };
  xmlhttp.open(method, url, true);
  xmlhttp.setRequestHeader('Content-Type', 'application/json');
  xmlhttp.send(payload);
};

const submit = function(e) {
  e.preventDefault();
  if (document.getElementById('form').className === 'loading') {
    // debounce double clicks
    return;
  }
  setState('loading');
  const url = document.getElementById('form').action;
  const payload = JSON.stringify({
    user: document.getElementById('user').value.toLowerCase().trim(),
    password: document.getElementById('password').value,
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
  const url = document.getElementById('tokenLogin').action;
  request('POST', url, '', xmlhttp => {
    console.log(xmlhttp);
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
    document.getElementById('password').focus();
  }
};

const focusOnSubmit = function(e) {
  if (e.keyCode === 13) {
    document.getElementById('login').focus();
  }
};

const highlightSelectedLocale = function() {
  const locales = document.getElementsByClassName('locale');
  for (let i = 0; i < locales.length; i++) {
    const elem = locales[i];
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

const getCookie = function(name) {
  const cookies = document.cookie && document.cookie.split(';');
  if (cookies) {
    for (const cookie of cookies) {
      const parts = cookie.trim().split('=');
      if (parts[0] === name) {
        return parts[1].trim();
      }
    }
  }
};

const getLocale = function() {
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
  return;
};

const translate = function() {
  if (!selectedLocale) {
    return console.error('No enabled locales found - not translating');
  }
  highlightSelectedLocale();
  document.querySelectorAll('[translate]').forEach(function(elem) {
    const key = elem.getAttribute('translate');
    elem.innerText = translations[selectedLocale][key];
  });
};

const parseTranslations = function() {
  const raw = document.body.getAttribute('data-translations');
  return JSON.parse(decodeURIComponent(raw));
};

const getRedirectUrl = function() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('redirect');
};

const getUserCtx = function() {
  const cookie = getCookie('userCtx');
  if (cookie) {
    try {
      return JSON.parse(decodeURIComponent(cookie));
    } catch(e) {
      console.error('Error parsing cookie', e);
    }
  }
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

document.addEventListener('DOMContentLoaded', function() {
  checkSession();

  translations = parseTranslations();
  selectedLocale = getLocale();

  translate();

  document.getElementById('locale').addEventListener('click', handleLocaleSelection, false);

  if (document.getElementById('tokenLogin')) {
    requestTokenLogin();
  } else {
    document.getElementById('login').addEventListener('click', submit, false);

    const user = document.getElementById('user');
    user.addEventListener('keydown', focusOnPassword, false);
    user.focus();

    document.getElementById('password').addEventListener('keydown', focusOnSubmit, false);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js');
    }
  }
});
