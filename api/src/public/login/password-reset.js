const {
  setState,
  request,
  getLocale,
  parseTranslations,
  baseTranslate,
  togglePassword,
  getUserCtx
} = window.AuthUtils;

let selectedLocale;
let translations;

const PASSWORD_INPUT_ID = 'password';
const CONFIRM_PASSWORD_INPUT_ID = 'confirm-password';
const CURRENT_PASSWORD_INPUT_ID = 'current-password';

const checkSession = function() {
  const userCtx = getUserCtx();
  if (!userCtx || !userCtx.name) {
    // only logged-in users should access password reset page
    window.location = '/medic/login';
  }
};

const translate = () => {
  baseTranslate(selectedLocale, translations);
};

const displayPasswordValidationError = (serverResponse) => {
  const { error, params } = JSON.parse(serverResponse);
  setState(error);

  const errorElement = document.querySelector(`.error.${error}`);
  if (params && errorElement) {
    errorElement.setAttribute('translate-values', JSON.stringify(params));
    translate();
  }
};

const validateRequiredFields = (currentPassword, password, confirmPassword) => {
  const missingFields = [];

  if (!currentPassword) {
    missingFields.push(translations[selectedLocale]['user.password.current']);
  }
  if (!password) {
    missingFields.push(translations[selectedLocale]['change.password.new.password']);
  }
  if (!confirmPassword) {
    missingFields.push(translations[selectedLocale]['change.password.confirm.password']);
  }

  if (missingFields.length > 0) {
    return {
      isValid: false,
      error: 'fields-required',
      params: { fields: missingFields.join(', ') }
    };
  }

  return { isValid: true };
};

const validatePasswordMatch = (password, confirmPassword) => {
  if (password !== confirmPassword) {
    return {
      isValid: false,
      error: 'password-mismatch',
    };
  }
  return { isValid: true };
};

const submit = function(e) {
  e.preventDefault();
  if (document.getElementById('form')?.className === 'loading') {
    // debounce double clicks
    return;
  }

  const currentPassword = document.getElementById(CURRENT_PASSWORD_INPUT_ID)?.value;
  const password = document.getElementById(PASSWORD_INPUT_ID)?.value;
  const confirmPassword = document.getElementById(CONFIRM_PASSWORD_INPUT_ID)?.value;

  const validations = [
    validateRequiredFields(currentPassword, password, confirmPassword),
    validatePasswordMatch(password, confirmPassword)
  ];

  for (const validation of validations) {
    if (!validation.isValid) {
      displayPasswordValidationError(JSON.stringify({
        error: validation.error,
        params: validation.params
      }));
      return;
    }
  }

  setState('loading');
  const url = document.getElementById('form')?.action;
  const userCtx = getUserCtx();

  const payload = JSON.stringify({
    username: userCtx.name,
    password: password,
    currentPassword: currentPassword,
    locale: selectedLocale
  });

  request('POST', url, payload, function(xmlhttp) {
    if (xmlhttp.status === 302) {
      // success - redirect to app
      localStorage.setItem('passwordStatus', 'PASSWORD_CHANGED');
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
  checkSession();

  document.getElementById('update-password')?.addEventListener('click', submit, false);

  const passwordToggle = document.getElementById('password-toggle');
  if (passwordToggle) {
    passwordToggle.addEventListener('click', () => {
      togglePassword('password', 'password-container');
      togglePassword('confirm-password', 'confirm-password-container');
      togglePassword('current-password', 'current-password-container');
    }, false);
  }
});
