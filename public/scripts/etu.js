function getQueryStringValue (key) {  
	return unescape(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + escape(key).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));  
}

if(getQueryStringValue("authorization_code")) {
	sessionStorage.setItem("authorization_code", getQueryStringValue("authorization_code"));
	document.location.href = "/";
} else if(!getQueryStringValue("authorization_code") && !sessionStorage.getItem("authorization_code")) {
	document.location.href = "https://etu.utt.fr/api/oauth/authorize?client_id=24536666550&scopes=public&response_type=code&state=xyz";
}