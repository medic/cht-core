import {
    setState,
    request,
    getLocale,
    parseTranslations,
    baseTranslate
} from './auth-utils.js';

let selectedLocale;
let translations;

const PASSWORD_INPUT_ID = 'password';
const CONFIRM_PASSWORD_INPUT_ID = 'confirm-password';

const translate = () => {
    baseTranslate(selectedLocale, translations);
};

const togglePassword = () => {
    const passwordInput = document.getElementById(PASSWORD_INPUT_ID);
    const confirmPasswordInput = document.getElementById(CONFIRM_PASSWORD_INPUT_ID);

    const displayType = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = displayType;
    confirmPasswordInput.type = displayType;
    document.getElementById('password-container').classList.toggle('hidden-password');
    document.getElementById('confirm-password-container').classList.toggle('hidden-password');
};

const displayPasswordValidationError = (serverResponse) => {
    const { error, params } = JSON.parse(serverResponse);
    setState(error);

    if (params) {
        //add translate values param
    }
};

const submit = function(e) {
    e.preventDefault();
    if (document.getElementById('form').className === 'loading') {
        // debounce double clicks
        return;
    }
    setState('loading');
    const url = document.getElementById('form').action;
    const password = document.getElementById(PASSWORD_INPUT_ID).value;
    const confirmPassword = document.getElementById(CONFIRM_PASSWORD_INPUT_ID).value;

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

    document.getElementById('update-password').addEventListener('click', submit, false);

    const passwordToggle = document.getElementById('password-toggle');
    if (passwordToggle) {
        passwordToggle.addEventListener('click', togglePassword, false);
    }
});
