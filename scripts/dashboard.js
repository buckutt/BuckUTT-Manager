'use strict';

/* global document */

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
