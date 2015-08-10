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
    replace(/&#x27;/g, '\'').
    replace(/&#x60;/g, '`');
};

var request = function(method, url, headers, payload, callback) {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (xmlhttp.readyState === XMLHttpRequest.DONE) {
      callback(xmlhttp);
    }
  };
  xmlhttp.open(method, url, true);
  if (headers.contentType) {
    xmlhttp.setRequestHeader('Content-Type', headers.contentType);
  }
  if (headers.authorization) {
    xmlhttp.setRequestHeader('Authorization', headers.authorization);
  }
  xmlhttp.send(payload);
};

var getUserCtx = function(xmlhttp, callback) {
  var response = JSON.parse(xmlhttp.responseText);
  if (response.userCtx) {
    callback(null, response.userCtx);
  } else {
    var url = document.getElementById('form').action;
    request('GET', url, {}, null, function(request) {
      var getResponse = JSON.parse(request.responseText);
      if (!getResponse.userCtx) {
        return callback(new Error('Could not get UserCtx.'));
      }
      callback(null, getResponse.userCtx);
    });
  }
};

var storeUserCtx = function(userCtx) {
  var cookie = 'userCtx=' + JSON.stringify(userCtx);
  var expiry = new Date();
  expiry.setTime(expiry.getTime() + (365*24*60*60*1000));
  cookie += '; expires=' + expiry.toGMTString();
  cookie += '; path=/';
  document.cookie = cookie;
};

var handleResponse = function(xmlhttp) {
  if (xmlhttp.status === 200) {
    getUserCtx(xmlhttp, function(err, userCtx) {
      if (err) {
        setState('loginerror');
        console.error('Error logging in', err);
      } else {
        storeUserCtx(userCtx);
        setState('');
        location.href = unescape(document.getElementById('form').getAttribute('data-redirect'));
      }
    });
  } else if (xmlhttp.status === 401) {
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
  var url = document.getElementById('form').action;
  var headers = {
    contentType: 'application/json',
    authorization: createAuthHeader(user, password)
  };
  var payload = createPayload(user, password);
  request('POST', url, headers, payload, handleResponse);
};

var pressed = function(e) {
  if (e.keyCode === 13) {
    submit();
    return false;
  }
};

document.getElementById('login').addEventListener('click', submit, false);
document.getElementById('password').addEventListener('keypress', pressed, false);
