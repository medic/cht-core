var app = require('express')(),
    proxy = require('http-proxy').createProxyServer({}),
    auditProxy = require('./audit-proxy'),
    db = require('./db'),
    target = 'http://' + db.client.host + ':' + db.client.port,
    activePregnancies = require('./controllers/active-pregnancies'),
    upcomingAppointments = require('./controllers/upcoming-appointments'),
    missedAppointments = require('./controllers/missed-appointments');
  
var audit = function(req, res) {
  auditProxy.onMatch(proxy, req, res, target);
};

var auditPath = '/' + db.name + '/*';
app.put(auditPath, audit);
app.post(auditPath, audit);
app.delete(auditPath, audit);

app.get('/api/active-pregnancies', function(req, res) {
  activePregnancies.get({ district: req.query.district }, function(err, obj) {
    if (err) {
      return error(err, res);
    }
    res.json(obj);
  })
});

app.get('/api/upcoming-appointments', function(req, res) {
  upcomingAppointments.get({ district: req.query.district }, function(err, obj) {
    if (err) {
      return error(err, res);
    }
    res.json(obj);
  })
});

app.get('/api/missed-appointments', function(req, res) {
  missedAppointments.get({ district: req.query.district }, function(err, obj) {
    if (err) {
      return error(err, res);
    }
    res.json(obj);
  })
});

app.all('*', function(req, res) {
  proxy.web(req, res, { target: target });
});

var error = function(err, res) {
  console.error(err);
  res.writeHead(500, { 'Content-Type': 'text/plain' });
  res.end('Server error');
};

app.use(function(err, req, res, next) {
  error(err.stack, res);
});

proxy.on('error', function(err, req, res) { 
  error(JSON.stringify(err), res);
});

app.listen(5988, function() {
  console.log('Listening on port 5988');
});
