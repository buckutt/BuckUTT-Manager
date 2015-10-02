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
        console.log('length', batchHistory.length);

        historyData.history = batchHistory.slice(index, perPage);
        renderHistory(historyData);
    })
    .fail(function (err, msg) {
        console.log(err);
    });

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

var $input = document.querySelector('#page-1 .mdl-textfield__input');
setTimeout(function () {
    $input.setAttribute('required', '');
}, 100);


var $history = document.getElementById('history');
var $prevHistory = document.getElementById('prevHistory');
var $nextHistory = document.getElementById('nextHistory');


var batchHistory = [];
var index = 0;
var perPage = 10;

var historyData = {
    type: function() {
        if(this.credit) return 'Rechargement';
        return 'Achat';
    },
    priceEuro: function() {
        if(this.credit) return this.credit/100;
        return this.price/100;
    },
    performer: function() {
        if(this.credit) return 'Opérateur ' + this.Operator.firstname + ' ' + this.Operator.lastname;
        return  'Vendeur ' + this.Seller.firstname + ' ' + this.Seller.lastname;
    },
    object: function() {
        if(this.credit) return this.ReloadType.name;
        return this.Article.name;
    },
    formatDate: function() {
        var date = new Date(this.date);
        return ('0' + date.getDate()).slice(-2) + '/' + ('0' + (date.getMonth()+1)).slice(-2) + '/' + date.getFullYear();
    }
};

$history.addEventListener('click', loadHistory, false);

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

loadHistory();