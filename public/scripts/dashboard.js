'use strict';

/* global document */

function renderHistory(history) {
    var template = document.getElementById('history-template').innerHTML;
    var display = Mustache.render(template, history);
    document.getElementById('historyTable').innerHTML = display;

    if(index === 0) {
        $prevHistory.style.display = 'none';
    } else {
        $prevHistory.style.display = 'inline';
    }

    if (index === batchHistory.length - perPage) {
        $nextHistory.style.display = 'none';
    } else {
        $nextHistory.style.display = 'inline';
    }
}

function loadCredit () {
    reqwest({
        url: 'api/credit',
        method: 'get',
        headers: {
            'Authorization': 'Bearer '+sessionStorage.getItem('token')
        }
    })
    .then(function (resp) {
        document.getElementById('credit').innerHTML = (resp.credit / 100).toFixed(2) + '€';
    });
}

function loadHistory(e) {
    if (e) {
        e.preventDefault();
    }

    reqwest({
        url: 'api/history',
        method: 'get',
        headers: {
            'Authorization': 'Bearer '+sessionStorage.getItem('token')
        }
    })
    .then(function (resp) {
        batchHistory = resp.history;
        index = 0;
        perPage = 10;

        historyData.history = batchHistory.slice(index, perPage);
        renderHistory(historyData);
    })
    .fail(function (err, msg) {
        if(JSON.parse(err.response).error == 'disconnected') document.location.href = './';
    });

}

function changePin(e) {
    if (e) {
        e.preventDefault();
    }

    reqwest({
        url: 'api/pin',
        method: 'put',
        headers: {
            'Authorization': 'Bearer '+sessionStorage.getItem('token')
        },
        data: { oldPin: $pin.elements['oldPin'].value, newPin: $pin.elements['newPin'].value, checkPin: $pin.elements['checkPin'].value }
    })
    .then(function (resp) {
        if(resp.success == 'changePin') {
            showModal('Changement de PIN', 'Le code PIN a bien été modifié !');

            var $inputs = [].slice.call(document.getElementsByTagName('input'));
            $inputs.forEach(function ($input) {
                $input.value = '';
            });
        }
    })
    .fail(function (err, msg) {
        var error = JSON.parse(err.response);
        switch(error.error) {
            case 'wrongPin':
                showModal('Erreur', 'Le PIN actuel n\'est pas le bon');
                break;
            case 'formatPin':
                showModal('Erreur', 'Le format du nouveau PIN n\'est pas bon (4 caractères, uniquement des chiffres)');
                break;
            case 'checkFailed':
                showModal('Erreur', 'Les deux PIN ne correspondent pas');
                break;
            default:
                showModal('Erreur', 'Une erreur a eu lieu');
                break;
        }
    });

}

function transfer(e) {
    e.preventDefault();

    var isFirstStep = $transferCancel.nextElementSibling.childNodes[0].nodeValue.indexOf('Suivant') === 0;

    if (!isFirstStep) {
        reqwest({
            url: 'api/transfer',
            method: 'post',
            headers: {
                'Authorization': 'Bearer '+sessionStorage.getItem('token')
            },
            data: {
                userId: realUserId,
                amount: $transferAmount.value,
                pin: $transferPIN.value
            }
        })
        .then(function (resp) {
            showModal('Virement', 'Virement effectué');
            $transferCancel.style.display = 'none';
            $transferTo.removeAttribute('disabled');
            $transferPIN.removeAttribute('disabled');
            $transferAmount.removeAttribute('disabled');
            $transferTo.value = '';
            $transferPIN.value = '';
            $transferAmount.value = '';
            $transferCancel.nextElementSibling.childNodes[0].nodeValue = 'Suivant ›';
        })
        .fail(function (err, msg) {
            var error = JSON.parse(err.response);
            switch(error.error) {
                case 'bearer':
                    showModal('Erreur', 'Utilisateur introuvable');
                    break;
                default:
                    showModal('Erreur', 'Une erreur a eu lieu');
                    break;
            }
        });
        return;
    }


    reqwest({
        url: 'api/getEtuName?cardId=' + $transferTo.value,
        method: 'get',
        headers: {
            'Authorization': 'Bearer '+sessionStorage.getItem('token')
        }
    })
    .then(function (resp) {
        realUserId = resp.id;
        $transferCancel.style.display = 'inline-block';
        $transferTo.setAttribute('disabled', '');
        $transferPIN.setAttribute('disabled', '');
        $transferAmount.setAttribute('disabled', '');
        // next button (suivant) children.
        // First one is text node (suivant >), second one is ripple effect
        $transferCancel.nextElementSibling.childNodes[0].nodeValue = 'Envoyer à ' + resp.username;
    })
    .fail(function (err, msg) {
        var error = JSON.parse(err.response);
        switch(error.error) {
            case 'wrongPin':
                showModal('Erreur', 'Le PIN actuel n\'est pas le bon');
                break;
            case 'card':
                showModal('Erreur', 'Spécifiez un utilisateur');
                break;
            case 'user':
                showModal('Erreur', 'Utilisateur introuvable');
                break;
            default:
                showModal('Erreur', 'Une erreur a eu lieu');
                break;
        }
    });
}

function cancelTransfer(e) {
    e.preventDefault();

    $transferCancel.style.display = 'none';
    $transferTo.removeAttribute('disabled');
    $transferPIN.removeAttribute('disabled');
    $transferAmount.removeAttribute('disabled');
    $transferTo.value = '';
    $transferTo.focus();
    $transferCancel.nextElementSibling.childNodes[0].nodeValue = 'Suivant ›';
}

var $links = [].slice.call(document.getElementsByClassName('mdl-navigation__link'));

$links.forEach(function ($link) {
    $link.addEventListener('click', function (e) {
        e.preventDefault();

        var $page       = document.getElementById($link.getAttribute('data-target'));
        var $active     = document.getElementsByClassName('page-visible')[0];
        var $activeLink = document.getElementsByClassName('navigation-active')[0];

        if ($page === $active) {
            return;
        }

        $active.className = 'page-content';
        $page.className  += ' page-visible';

        $activeLink.className = 'mdl-navigation__link';
        $link.className      += ' navigation-active';

        return false;
    }, false);
});

// Set required after Material loads to prevent automatic error input
var $input = document.querySelector('#page-1 .mdl-textfield__input');
setTimeout(function () {
    $input.setAttribute('required', '');
}, 100);


var $history = document.getElementById('history');
var $pin = document.getElementById('pin');
var $transferPIN = document.getElementById('transferPIN');
var $transferTo = document.getElementById('transferTo');
var $transferAmount = document.getElementById('transferAmount');
var $transfer = document.getElementById('transfer');
var $transferCancel = document.getElementById('cancelTransfer');
var $prevHistory = document.getElementById('prevHistory');
var $nextHistory = document.getElementById('nextHistory');
var realUserId;

var batchHistory = [];
var index = 0;
var perPage = 10;

var historyData = {
    type: function() {
        if(this.credit) return 'Rechargement';
        else if(this.amount) return 'Virement';
        return 'Achat';
    },
    priceEuro: function() {
        if(this.credit) return this.credit/100;
        else if(this.amount) return this.amount/100;
        return -this.price/100;
    },
    performer: function() {
        if(this.credit) return 'Opérateur ' + this.Operator.firstname + ' ' + this.Operator.lastname;
        else if(this.amount) {
            if(this.amount > 0) return 'Avec ' + this.From.firstname + ' ' + this.From.lastname;
            else return 'Avec ' + this.To.firstname + ' ' + this.To.lastname;
        }
        return  'Vendeur ' + this.Seller.firstname + ' ' + this.Seller.lastname;
    },
    object: function() {
        if(this.credit) return this.ReloadType.name;
        else if (this.amount) return '';
        return this.Article.name;
    },
    formatDate: function() {
        var date = new Date(this.date);
        return ('0' + date.getDate()).slice(-2) + '/' + ('0' + (date.getMonth()+1)).slice(-2) + '/' + date.getFullYear();
    },
    point: function() {
        if(this.Point) return this.Point.name;
        else return 'Internet';
    }
};

$history.addEventListener('click', loadHistory, false);

$pin.addEventListener('submit', changePin, false);

$transfer.addEventListener('submit', transfer, false);
$transferCancel.addEventListener('click', cancelTransfer, false);

$prevHistory.addEventListener('click', function (e){
    e.preventDefault();

    index -= perPage;
    index = Math.max(0, index);

    historyData.history = batchHistory.slice(index, index + perPage);
    renderHistory(historyData);
});

$nextHistory.addEventListener('click', function (e){
    e.preventDefault();

    index += perPage;
    index = Math.min(batchHistory.length - perPage, index);

    historyData.history = batchHistory.slice(index, index + perPage);
    renderHistory(historyData);
});

$transferPIN.removeAttribute('disabled');
$transferAmount.removeAttribute('disabled');
$transferTo.removeAttribute('disabled');

loadHistory();
loadCredit();
