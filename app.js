var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var unirest = require('unirest');
var config = require('./config');

var app = express();

var users = {};

app.use(express.static(path.join(__dirname, './public')));
app.use(bodyParser.urlencoded({ 
  extended: true
})); 

app.post('/api/login', function (req, res) {
	unirest.post('https://etu.utt.fr/api/oauth/token')
	.send({ grant_type: "authorization_code", authorization_code: req.body.authorization_code })
	.auth(config.etu.api_client_id, config.etu.api_client_secret, true)
	.end(function (response) {
		var data =JSON.parse(response.body);
		if(data.response.access_token) {
			var access_token = data.response.access_token

			unirest.get('https://etu.utt.fr/api/public/user/account')
			.query({ access_token: access_token})
			.end(function (response) {
				var data = JSON.parse(response.body);
				var login = data.response.data.login;

				unirest.post('http://'+config.backend.host+':'+config.backend.port+'/api/services/login')
				.headers({'Accept': 'application/json'})
				.type('json')
				.send({MeanOfLoginId: 1, data: login, pin: req.body.pin})
				.end(function (response) {
					var data = response.body;
					if(data.token) {
						users[data.token] = data.user.id;
						res.send({success: 1, token: data.token });
					} else {
						res.status(500).send({error: "pin"});
					}

				});

			});
		} else {
			res.status(500).send({error: "user"});
		}			
	});
});

app.get('/api/history', function (req, res) {
	if(req.headers.authorization) {
		unirest.get('http://'+config.backend.host+':'+config.backend.port+'/api/purchases')
		.header('Authorization', req.headers.authorization)
		.type('json')
		.query({ BuyerId: users[req.headers.authorization.replace('Bearer ','')], embed: 'Point,Article,Seller', order: 'date', asc: 'DESC' })
		.end(function (purchases) {
			if(purchases.body.data) {
				unirest.get('http://'+config.backend.host+':'+config.backend.port+'/api/reloads')
				.header('Authorization', req.headers.authorization)
				.type('json')
				.query({ BuyerId: users[req.headers.authorization.replace('Bearer ','')], embed: 'Point,Operator,ReloadType', order: 'date', asc: 'DESC' })
				.end(function (reloads) {
					if(reloads.body.data) {
						var history = purchases.body.data.concat(reloads.body.data).sort(function(a,b) { return new Date(b.date)-new Date(a.date); });
						res.send({ success: 1, history: history });
					} else {
						res.status(500).send({error: "disconnected"});
					}
				});
			} else {
				res.status(500).send({error: "disconnected"});
			}
		});
	} else {
		res.status(500).send({error: "bearer"});
	}
});

app.post('/api/pin', function (req, res) {

});

var server = app.listen(config.port, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('App listening at http://%s:%s', host, port);
});