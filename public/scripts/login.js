var $login = document.getElementById('login');

$login.addEventListener('submit', function (e){
	e.preventDefault();
	reqwest({
		url: 'api/login',
		method: 'post',
		data: { authorization_code: sessionStorage.getItem("authorization_code"), pin: $login.elements['pin'].value }
	})
	.then(function (resp) {
		sessionStorage.removeItem("authorization_code");
		sessionStorage.setItem('token', resp.token);
		document.location.href = './dashboard.html';
		
	})
	.fail(function (err, msg) {
    	showModal('Erreur', 'La connexion a échoué');
	});

}, false);