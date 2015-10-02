'use strict';

var $overlay  = document.getElementsByClassName('overlay')[0];
var $modal    = document.getElementsByClassName('statusModal')[0];

var isVisible = false;

function showModal (title, text) {
    isVisible = true;

    $overlay.className += ' visible';
    $modal.className   += ' visible';

    $modal.getElementsByTagName('h2')[0].innerHTML = title;
    $modal.getElementsByTagName('p')[0].innerHTML  = text;
}

$overlay.addEventListener('click', function (e) {
    e.preventDefault();

    isVisible = false;
    $overlay.className = 'overlay';
    $modal.className   = 'mdl-card mdl-shadow--4dp statusModal';

    return false;
}, false);

document.addEventListener('keyup', function (e) {
    if (e.keyCode === 27 && isVisible) {
        isVisible = false;
        $overlay.className = 'overlay';
        $modal.className   = 'mdl-card mdl-shadow--4dp statusModal';
    }
}, false);

window.showModal = showModal;
