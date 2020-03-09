let selectedLocale;

const setState = function(className) {
  document.getElementById('form').className = className;
};

const post = function(url, payload, callback) {
  const xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (xmlhttp.readyState === XMLHttpRequest.DONE) {
      callback(xmlhttp);
    }
  };
  xmlhttp.open('POST', url, true);
  xmlhttp.setRequestHeader('Content-Type', 'application/json');
  xmlhttp.send(payload);
};

const handleResponse = function(xmlhttp) {
  if (xmlhttp.status === 302) {
    window.location = xmlhttp.response;
  } else if (xmlhttp.status === 401) {
    setState('loginincorrect');
  } else {
    setState('loginerror');
    console.error('Error logging in', xmlhttp.response);
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
  const payload = JSON.stringify({
    user: document.getElementById('user').value.toLowerCase().trim(),
    password: document.getElementById('password').value,
    locale: selectedLocale
  });
  post(url, payload, handleResponse);
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

const selectLocale = function(e) {
  if (e.target.tagName.toLowerCase() === 'a') {
    e.preventDefault();
    const locales = document.getElementsByClassName('locale');
    for(let i = 0; i < locales.length; i++) {
      locales[i].className = 'locale';
    }
    e.target.className += ' selected';
    selectedLocale = e.target.name;
  }
};

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('login').addEventListener('click', submit, false);

  const user = document.getElementById('user');
  user.addEventListener('keydown', focusOnPassword, false);
  user.focus();

  document.getElementById('password').addEventListener('keydown', focusOnSubmit, false);
  
  document.getElementById('locale').addEventListener('click', selectLocale, false);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js');
  }
});
