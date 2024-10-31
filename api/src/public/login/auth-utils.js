export const setState = function(className) {
    document.getElementById('form').className = className;
};

export const request = function(method, url, payload, callback) {
    const xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState === XMLHttpRequest.DONE) {
            callback(xmlhttp);
        }
    };
    xmlhttp.open(method, url, true);
    xmlhttp.setRequestHeader('Content-Type', 'application/json');
    xmlhttp.setRequestHeader('Accept', 'application/json');
    xmlhttp.send(payload);
};

const extractCookie = function(cookies, name) {
    for (const cookie of cookies) {
        const [cookieName, cookieValue] = cookie.trim().split('=');
        if (cookieName === name) {
            return cookieValue.trim();
        }
    }
    return null;
};

export const getCookie = function(name) {
    if (!document.cookie) {
        return null;
    }

    const cookies = document.cookie.split(';');
    return extractCookie(cookies, name);
};

export const getLocale = function(translations) {
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

export const parseTranslations = function() {
    const raw = document.body.getAttribute('data-translations');
    return JSON.parse(decodeURIComponent(raw));
};

export const baseTranslate = (selectedLocale, translations) => {
    if (!selectedLocale) {
        return console.error('No enabled locales found - not translating');
    }
    document
        .querySelectorAll('[translate]')
        .forEach(elem => elem.innerText = translations[selectedLocale][elem.getAttribute('translate')]);
    document
        .querySelectorAll('[translate-title]')
        .forEach(elem => elem.title = translations[selectedLocale][elem.getAttribute('translate-title')]);
};