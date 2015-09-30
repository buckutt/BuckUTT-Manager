var $login = document.getElementById('login');

$login.addEventListener('submit', function (e){
	e.preventDefault();
	reqwest({
		url: 'api/login',
		method: 'post',
		data: { authorization_code: getQueryStringValue("authorization_code"), pin: $login.elements['pin'].value }
	})
	.then(function (resp) {
		alert(resp);
	})
	.fail(function (err, msg) {
    	console.log(err);
	});

}, false);