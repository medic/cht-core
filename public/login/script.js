var setState = function(className) {
  document.getElementById('form').className = className;
};

var handleResponse = function(xmlhttp) {
  if (xmlhttp.status === 200) {
    setState('');
    location.href = document.getElementById('form').getAttribute('data-redirect');
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
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (xmlhttp.readyState === XMLHttpRequest.DONE) {
      handleResponse(xmlhttp);
    }
  };
  setState('loading');
  xmlhttp.open('POST', document.getElementById('form').action, true);
  xmlhttp.setRequestHeader('Content-Type', 'application/json');
  xmlhttp.send(JSON.stringify({
    name: document.getElementById('user').value,
    password: document.getElementById('password').value
  }));
};

var pressed = function(e) {
  if (e.keyCode === 13) {
    submit();
    return false;
  }
};

document.getElementById('login').addEventListener('click', submit, false);
document.getElementById('password').addEventListener('keypress', pressed, false);