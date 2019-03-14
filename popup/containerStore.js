//browser.browserAction.onClicked.addListener(handleClick)
'use strict'
load();

function load() {
	/***********************************************************************
	Called from multiple places
	************************************************************************/

	getSavedSiteList();
	browser.contextualIdentities.query({}).then(onGot, onError);
	listenForClicks();
}

function generateSiteList(siteList) {
	/***********************************************************************
	Called by getSavedSiteList
	Creates a div for each site name
	************************************************************************/
	
	let list = document.getElementsByClassName("siteList")[0]; //Select 

	for (let site in siteList) {
		let div = document.createElement("div");
		div.className = "siteItem";
		div.innerHTML = site;
		list.appendChild(div);
	}
}

function getSavedSiteList() {
	/***********************************************************************
	Called on load of popup page
	************************************************************************/

	window.siteList = {};

	//Called on return of promise from reading storage
	function setCurrentChoice(result) {

		//Iterate over the results and store them in window.siteList
		for (let site in result) {
			window.siteList[site] = result[site];
		}
		generateSiteList(window.siteList);

	}

	function onError(error) {
		console.log(`Error: ${error}`);
	}

	var getting = browser.storage.sync.get();
	getting.then(setCurrentChoice, onError);
}

function onError(error) {
	console.log(`Error: ${error}`);
}

function onGot(contexts) {
	window.knownContexts = {};
	for (let context of contexts) {
		window.knownContexts[context.name] = context.cookieStoreId;
	}
}


function openSite(siteName) {
	/***********************************************************************
	Called when user clicks on site name
	************************************************************************/
	
	for (let context of window.siteList[siteName]) {
		if (validateURL(siteName))
		{
	
			let creating = browser.tabs.create({
				url: siteName, //Needs to be a full domain
				cookieStoreId: window.knownContexts[context]
			});
			
			creating.then(onCreated, onError);
		}
		else
		{
			console.log("Url is invalid");
		}
	}
}

function listenForClicks() {
	document.addEventListener("click", (e) => {
		/**
		 * Clicking on one of the div (site names/urls) will open it up the tabs
		 */
		if (e.target.classList.contains("siteItem")) {
			let siteName = e.target.innerHTML;
			openSite(siteName);
		}
		if (e.target.classList.contains("editButton"))
		{
			browser.runtime.openOptionsPage();
		}

	});
}
function validateURL(textval) {
	/***********************************************************************
	Called from saveOptions()
	Checks if it's a valid URL
	Got it from: https://stackoverflow.com/questions/1303872/trying-to-validate-url-using-javascript
	************************************************************************/

    let urlregex = /^(https?|ftp):\/\/([a-zA-Z0-9.-]+(:[a-zA-Z0-9.&%$-]+)*@)*((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}|([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(:[0-9]+)*(\/($|[a-zA-Z0-9.,?'\\+&%$#=~_-]+))*$/;
    return urlregex.test(textval);
}
