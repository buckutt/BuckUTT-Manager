var $login = document.getElementById('login');

$login.addEventListener('submit', function (e){
	e.preventDefault();
	reqwest({
		url: 'api/login',
		method: 'post',
		data: { authorization_code: getQueryStringValue("authorization_code"), pin: $login.elements['pin'].value }
	})
	.then(function (resp) {
		sessionStorage.setItem('token', resp.token);
		document.location.href = './dashboard.html';
		
	})
	.fail(function (err, msg) {
    	console.log(err);
	});

}, false);