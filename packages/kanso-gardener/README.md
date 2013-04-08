kanso-gardener
===============

Power-up your couchapp by running node modules. kanso-gardener makes it easy to add and deploy node processes with your couchapp.

This is designed to work with https://github.com/garden20/gardener.


Usage
-----

Add kanso-gardener to your dependecies in kanso.json

		"name" : "test",
		"version" : "1.0.0",
        "dependencies": {
                "attachments": null,
                "kanso-gardener": null
        }


Kanso install the package

    kanso install


Create a folder called node_module in the root of your project

    mkdir node_module

Create a server.js file (eg node_module/server.js) that looks like the following

```
var port = 38293;

console.log('here we go!');

var http = require('http');
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');
}).listen(port, '127.0.0.1');

if (process.send) {
        process.send({
                port: port
        })
}
```
push it!

    kanso push test

Now if you have a gardener running, eg

    git clone http://github.com/garden20/gardener
    cd gardener
    ./bin/gardener watch http://localhost:5984


You will see output like this

    info: [gardener] polling couch for design doc changes.
    info: [gardener] Starting package [test] in working_dir/aHR0cDovL2xvY2FsaG9zdDo1OTg0L3Rlc3QvX2Rlc2lnbi9tdWNreW11Y2s=
    info: [test] here we go!
    info: [gardener] adding route /_gardener/test/_design/test
    warn: [gardener] Altering Couch config, adding httpd_global_handler

Now you can visit http://localhost:5984/_gardener/test/_design/test and see 'Hello World'



