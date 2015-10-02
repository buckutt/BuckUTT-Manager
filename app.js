var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var unirest = require('unirest');
var bcrypt = require('bcryptjs');
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
		var data = JSON.parse(response.body);
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

app.put('/api/pin', function (req, res) {
	if(req.headers.authorization) {
		if(req.body.newPin == req.body.checkPin) {
			if(typeof parseInt(req.body.newPin) == "number" && req.body.newPin.length == 4) {
				unirest.get('http://'+config.backend.host+':'+config.backend.port+'/api/users')
				.header('Authorization', req.headers.authorization)
				.type('json')
				.query({ id: users[req.headers.authorization.replace('Bearer ','')] })
				.end(function (user) {
					bcrypt.compare(req.body.oldPin, user.body.data.pin, function(err, statecrypt) {
					    if(statecrypt) {
							bcrypt.genSalt(10, function(err, salt) {
							    bcrypt.hash(req.body.newPin, salt, function(err, hash) {
									unirest.put('http://'+config.backend.host+':'+config.backend.port+'/api/users/' + users[req.headers.authorization.replace('Bearer ','')])
									.header('Authorization', req.headers.authorization)
									.type('json')
									.send({ pin: hash })
									.end(function (user) {
										res.send({ success: 1 });
									});
							    });
							});
					    } else {
					    	res.status(500).send({error: "wrongPin"});
					    }
					});
				});
			} else {
				res.status(500).send({error: "formatPin"});
			}
		} else {
			res.status(500).send({error: "checkFailed"});
		}
	}
});

var server = app.listen(config.port, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('App listening at http://%s:%s', host, port);
});