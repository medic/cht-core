import {
  setState,
  request,
  getLocale,
  parseTranslations,
  baseTranslate,
  togglePassword
} from './auth-utils.js';

let selectedLocale;
let translations;

const PASSWORD_INPUT_ID = 'password';
const CONFIRM_PASSWORD_INPUT_ID = 'confirm-password';

const translate = () => {
  baseTranslate(selectedLocale, translations);
};

const displayPasswordValidationError = (serverResponse) => {
  const { error, params } = JSON.parse(serverResponse);
  setState(error);

  const passwordError = document.querySelector('.error.password-short');
  if (params?.minimum && passwordError) {
    passwordError.setAttribute('translate-values', JSON.stringify(params));
    baseTranslate(selectedLocale, translations);
  }
};

const submit = function(e) {
  e.preventDefault();
  if (document.getElementById('form')?.className === 'loading') {
    // debounce double clicks
    return;
  }
  setState('loading');
  const url = document.getElementById('form')?.action;
  const password = document.getElementById(PASSWORD_INPUT_ID)?.value;
  const confirmPassword = document.getElementById(CONFIRM_PASSWORD_INPUT_ID)?.value;

  const payload = JSON.stringify({
    password: password,
    confirmPassword: confirmPassword,
  });

  request('POST', url, payload, function(xmlhttp) {
    if (xmlhttp.status === 302 || xmlhttp.status === 200) {
      // success - redirect to app
      window.location = xmlhttp.response;
    } else if (xmlhttp.status === 400) {
      // password validation failed
      displayPasswordValidationError(xmlhttp.response);
    } else {
      setState('error');
      console.error('Error updating password', xmlhttp.response);
    }
  });
};

document.addEventListener('DOMContentLoaded', function() {
  translations = parseTranslations();
  selectedLocale = getLocale(translations);
  translate();

  document.getElementById('update-password')?.addEventListener('click', submit, false);

  const passwordToggle = document.getElementById('password-toggle');
  if (passwordToggle) {
    passwordToggle.addEventListener('click', () => togglePassword(PASSWORD_INPUT_ID, CONFIRM_PASSWORD_INPUT_ID), false);
  }
});
