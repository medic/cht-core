const express = require('express');
const bodyParser = require('body-parser');

var app = express();

app.use(bodyParser.urlencoded());

app.all('*', function(req,res){
    console.log('message received');
    console.log(req.body);
    res.send('thanks');
})

app.listen(3000, function(){
    console.log('listening on 8080');
})