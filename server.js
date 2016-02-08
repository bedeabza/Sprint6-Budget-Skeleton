var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');

var app = express();
var PORT = 8080;

app.use(bodyParser.urlencoded({extended:false}));

app.use(function (req, res, next) {
    if (path.extname(req.path).length > 0) {
        //static file
        next();
    } else {
        // should force return `index.html` for angular.js
        req.url = '/index.html';
        next();
    }
});

app.use(express.static(__dirname));
app.listen(PORT);

console.log('Listening on localhost:' + PORT);
