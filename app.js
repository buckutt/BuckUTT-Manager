var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var unirest = require('unirest');
var Promise = require('promise');
var config = require('./config');

var app = express();

app.use(express.static(path.join(__dirname, './public')));
app.use(bodyParser.urlencoded({ 
  extended: true
})); 

app.post('/api/login', function (req, res) {
	unirest.post('https://etu.utt.fr/api/oauth/token')
	.send({ "grant_type": "authorization_code", "authorization_code": req.body.authorization_code })
	.auth(config.etu.api_client_id, config.etu.api_client_secret, true)
	.end(function (response) {
		var data =JSON.parse(response.body);
		if(data.response.access_token) {
			var access_token = data.response.access_token

			unirest.get('https://etu.utt.fr/api/public/user/account')
			.query({ "access_token": access_token})
			.end(function (response) {
				var data = JSON.parse(response.body);
				var login = data.response.data.login;

			});
		} else {
			res.send({error: "error"});
		}			
	});
});

var server = app.listen(config.port, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('App listening at http://%s:%s', host, port);
});