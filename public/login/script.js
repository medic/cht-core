var setState = function(className) {
  document.getElementById('form').className = className;
};

var createPayload = function(user, password) {
  return JSON.stringify({ name: user, password: password });
};

var createAuthHeader = function(user, password) {
  return 'Basic ' + window.btoa(user + ':' + password);
};

var unescape = function(s) {
  return s.
    replace(/&amp;/g,  '&').
    replace(/&lt;/g,   '<').
    replace(/&gt;/g,   '>').
    replace(/&quot;/g, '"').
    replace(/&#x27;/g, "'").
    replace(/&#x60;/g, '`');
}

var handleResponse = function(xmlhttp) {
  if (xmlhttp.status === 200) {
    setState('');
    location.href = unescape(
        document.getElementById('form').getAttribute('data-redirect'));
    return;
  }
  if (xmlhttp.status === 401) {
    setState('loginincorrect');
  } else {
    setState('loginerror');
    console.error('Error logging in', xmlhttp.response);
  }
};

var submit = function() {
  if (document.getElementById('form').className === 'loading') {
    return;
  }
  setState('loading');
  var user = document.getElementById('user').value;
  var password = document.getElementById('password').value;
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (xmlhttp.readyState === XMLHttpRequest.DONE) {
      handleResponse(xmlhttp);
    }
  };
  xmlhttp.open('POST', document.getElementById('form').action, true);
  xmlhttp.setRequestHeader('Content-Type', 'application/json');
  xmlhttp.setRequestHeader('Authorization', createAuthHeader(user, password));
  xmlhttp.send(createPayload(user, password));
};

var pressed = function(e) {
  if (e.keyCode === 13) {
    submit();
    return false;
  }
};

document.getElementById('login').addEventListener('click', submit, false);
document.getElementById('password').addEventListener('keypress', pressed, false);
