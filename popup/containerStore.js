//browser.browserAction.onClicked.addListener(handleClick)
'use strict'
load();

function load() {
	/***********************************************************************
	Called from multiple places
	************************************************************************/

	getSavedSiteList();
	browser.contextualIdentities.query({}).then(onGotContexts, onError);
	listenForClicks();
}

function generateSiteList(siteList) {
	/***********************************************************************
	Called by getSavedSiteList
	Creates a div for each site name
	************************************************************************/
	
	let list = document.getElementsByClassName("siteList")[0]; //Select 
	for (let key in siteList) {
		let div = document.createElement("div");
		div.className = "siteItem";

		if (typeof siteList[key].displayName == 'undefined' || siteList[key].displayName == "")
		{
			div.innerHTML = siteList[key].url;
		}
		else{
			div.innerHTML=siteList[key].displayName;
		}
		div.id = key;
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

function onGotContexts(contexts) {
	window.knownContexts = {};
	for (let context of contexts) {
		window.knownContexts[context.name] = context.cookieStoreId;
	}
}


function openSite(key) {
	/***********************************************************************
	Called when user clicks on site name
	************************************************************************/
	
	//Iterate overall the specified containers and open one in a tab
	
	for (let context of siteList[key].containers) {
		if (validateURL(siteList[key].url))
		{
			let creating = browser.tabs.create({
				url: siteList[key].url, //Needs to be a full domain
				cookieStoreId: window.knownContexts[context]
			});
			
			//creating.then(onCreated, onError);
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
			let key = e.target.id;
			
			console.log("listenForClicks - target:",e.target)
			console.log("listenForClicks - key:",key)
			openSite(key);
		}
		if (e.target.classList.contains("editButton"))
		{
			browser.runtime.openOptionsPage();
		}
		if (e.target.classList.contains("openButton"))
		{
			openCurrentUrl();
		}

	});
}
function openCurrentUrl()
{
	/***********************************************************************
	Called when user clicks on open current site in all containers
	************************************************************************/
	var currentURL;
	//Iterate overall the specified containers and open one in a tab
	browser.tabs.query({currentWindow: true, active: true}).then(
		function(tabs)
		{
			currentURL=tabs[0].url;
	    	for (let context in window.knownContexts) 
			{
				if (validateURL(currentURL))
				{
					let creating = browser.tabs.create({
						url: currentURL, //Needs to be a full domain
						cookieStoreId: window.knownContexts[context]
					});
				}
				else
				{
					console.log("Url is invalid");
				}
			}
		}
		, onError);
}
function validateURL(textval) {
	/***********************************************************************
	Called from saveOptions()
	Checks if it's a valid URL
	************************************************************************/
	let url;
	try { 
		url = new URL(textval);
  	} catch (_) {
      	return false;  
	}
	
	return url.protocol === "http:" || url.protocol === "https:";
}

