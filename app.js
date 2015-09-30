var express = require('express');
var path = require('path');
var app = express();

app.use(express.static(path.join(__dirname, './public')));

app.post('/api/login', function (req, res) {
	
});

var server = app.listen(80, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('App listening at http://%s:%s', host, port);
});
