var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var unirest = require('unirest');
var bcrypt = require('bcryptjs');
var config = require('./config');

var app = express();

var users = {};
var auths = {};

app.use(express.static(path.join(__dirname, './public')));
app.use(bodyParser.urlencoded({ 
  extended: true
})); 

app.post('/api/login', function (req, res) {
	if(!auths[req.body.authorization_code]) {
		unirest.post('http://illidan.sia/api/oauth/token')
		.send({ grant_type: "authorization_code", authorization_code: req.body.authorization_code })
		.auth(config.etu.api_client_id, config.etu.api_client_secret, true)
		.end(function (response) {
			var data = JSON.parse(response.body);
			if(data.response.access_token) {
				var access_token = data.response.access_token;
				auths[req.body.authorization_code] = access_token;

				unirest.get('http://illidan.sia/api/public/user/account')
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
							delete auths[req.body.authorization_code];
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
	} else {
		var access_token = auths[req.body.authorization_code];

		unirest.get('http://illidan.sia/api/public/user/account')
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
					delete auths[req.body.authorization_code];
					res.send({success: 1, token: data.token });
				} else {
					res.status(500).send({error: "pin"});
				}

			});
		});
	}
});

app.post('/api/transfer', function (req, res) {
	if (req.headers.authorization) {
		if (req.body.userId) {
			req.body.userId = parseInt(req.body.userId, 10);
			if(req.body.userId != users[req.headers.authorization.replace('Bearer ','')]) {
				if (req.body.amount) {
					req.body.amount = parseInt(req.body.amount, 10);
					if(req.body.amount > 0) {
						unirest.get('http://'+config.backend.host+':'+config.backend.port+'/api/users')
						.header('Authorization', req.headers.authorization)
						.type('json')
						.query({ id: users[req.headers.authorization.replace('Bearer ','')] })
						.end(function (user) {
							if(user.body.data) {
								bcrypt.compare(req.body.pin, user.body.data.pin, function(err, statecrypt) {
								    if(statecrypt) {
										unirest.post('http://'+config.backend.host+':'+config.backend.port+'/api/services/transfer')
										.header('Authorization', req.headers.authorization)
										.type('json')
										.send({ amount: req.body.amount, userId: req.body.userId})
										.end(function (resTransfer) {
											if (resTransfer.body.data) {
												res.send({status: 1, transfer: resTransfer.body.data});
											} else {
												res.status(500).send({error: resTransfer.body.error});
											}
										});
								    } else {
								    	res.status(500).send({error: "wrongPin"});
								    }
								});
							}
						});
					} else {
						res.status(500).send({error: "amount"});
					}
				} else {
					res.status(500).send({error: "amount"});
				}
			} else {
				res.status(500).send({error: "sameUser"});
			}
		} else {
			res.status(500).send({error: "user"});
		}
	} else {
		res.status(500).send({error: "bearer"});
	}
});

app.get('/api/getEtuName', function (req,res) {
	if(req.headers.authorization) {
		if (!req.query.cardId) {
			return res.status(500).send({error: "card"});
		}

		unirest.get('http://'+config.backend.host+':'+config.backend.port+'/api/meanofloginsusers')
		.header('Authorization', req.headers.authorization)
		.type('json')
		.query({ data: req.query.cardId, MeanOfLoginId: '2' })
		.end(function (meanoflogin) {
			if (meanoflogin.body.data) {
				unirest.get('http://'+config.backend.host+':'+config.backend.port+'/api/users')
				.header('Authorization', req.headers.authorization)
				.type('json')
				.query({ id: meanoflogin.body.data.UserId })
				.end(function (user) {
					if (user.body.data) {
						res.json({ username: user.body.data.firstname + ' ' + user.body.data.lastname, id: user.body.data.id });
					} else {
						res.status(500).send({error: "user"});
					}
				});
			} else {
				res.status(500).send({error: "user"});
			}
		});
	} else {
		res.status(500).send({error: "bearer"});
	}
});

app.get('/api/history', function (req, res) {
	if(req.headers.authorization) {
		unirest.get('http://'+config.backend.host+':'+config.backend.port+'/api/purchases')
		.header('Authorization', req.headers.authorization)
		.type('json')
		.query({ BuyerId: users[req.headers.authorization.replace('Bearer ','')], isRemoved: 0, embed: 'Point,Article,Seller', order: 'date', asc: 'DESC' })
		.end(function (purchases) {
			if(purchases.body) {
				purchases.body.data = purchases.body.data || [];
				if(purchases.body.data.id) purchases.body.data = [purchases.body.data];
				unirest.get('http://'+config.backend.host+':'+config.backend.port+'/api/reloads')
				.header('Authorization', req.headers.authorization)
				.type('json')
				.query({ BuyerId: users[req.headers.authorization.replace('Bearer ','')], isRemoved: 0, embed: 'Point,Operator,ReloadType', order: 'date', asc: 'DESC' })
				.end(function (reloads) {
					if(reloads.body) {
						reloads.body.data = reloads.body.data || [];
						if(reloads.body.data.id) reloads.body.data = [reloads.body.data];
						unirest.get('http://'+config.backend.host+':'+config.backend.port+'/api/transfers')
						.header('Authorization', req.headers.authorization)
						.type('json')
						.query({ FromId: users[req.headers.authorization.replace('Bearer ','')], isRemoved: 0, embed: 'From,To', order: 'date', asc: 'DESC' })
						.end(function (transfersFrom) {
							if(transfersFrom.body) {
								transfersFrom.body.data = transfersFrom.body.data || [];
								if(transfersFrom.body.data.id) transfersFrom.body.data = [transfersFrom.body.data];
								transfersFrom.body.data = transfersFrom.body.data.map(function (transferItem) {
									transferItem.amount = -1 * transferItem.amount;
									return transferItem;
								});
								unirest.get('http://'+config.backend.host+':'+config.backend.port+'/api/transfers')
								.header('Authorization', req.headers.authorization)
								.type('json')
								.query({ ToId: users[req.headers.authorization.replace('Bearer ','')], isRemoved:0, embed: 'From,To', order: 'date', asc: 'DESC' })
								.end(function (transfersTo) {
									if(transfersTo.body) {
										transfersTo.body.data = transfersTo.body.data || [];
										if(transfersTo.body.data.id) transfersTo.body.data = [transfersTo.body.data];
										var history = purchases.body.data.concat(reloads.body.data.concat(transfersFrom.body.data.concat(transfersTo.body.data))).sort(function(a,b) { return new Date(b.date)-new Date(a.date); });
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

app.get('/api/credit', function (req, res) {
	if(req.headers.authorization) {
		unirest.get('http://'+config.backend.host+':'+config.backend.port+'/api/users')
		.header('Authorization', req.headers.authorization)
		.type('json')
		.query({ id: users[req.headers.authorization.replace('Bearer ','')] })
		.end(function (user) {
			if(user.body.data) {
				res.json({ credit: user.body.data.credit });
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
					if(user.body.data) {
						bcrypt.compare(req.body.oldPin, user.body.data.pin, function(err, statecrypt) {
						    if(statecrypt) {
								bcrypt.genSalt(10, function(err, salt) {
								    bcrypt.hash(req.body.newPin, salt, function(err, hash) {
										unirest.put('http://'+config.backend.host+':'+config.backend.port+'/api/users/' + users[req.headers.authorization.replace('Bearer ','')])
										.header('Authorization', req.headers.authorization)
										.type('json')
										.send({ pin: hash })
										.end(function (user) {
											res.send({ success: "changePin" });
										});
								    });
								});
						    } else {
						    	res.status(500).send({error: "wrongPin"});
						    }
						});
					}
				});
			} else {
				res.status(500).send({error: "formatPin"});
			}
		} else {
			res.status(500).send({error: "checkFailed"});
		}
	}
});

var server = app.listen(config.port, 'localhost', function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('App listening at http://%s:%s', host, port);
});
