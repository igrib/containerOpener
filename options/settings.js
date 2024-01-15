'use strict'
/******************************************************************************
There are 3 asynchronous calls that produce promises, this drives the structure of the code. We have to wait for each of those to be completed before doing any next steps.
 	1. Reading list of contexts (Container)s
	2. Getting storage variable we saved
 	3. Setting storage variable

  Page Loads -> call load() -> getStoredValues (only when complete)
	-> getContextNames (only when complete) -> generateTable()
******************************************************************************/

//Add listener so when page loads - load() function is called
document.addEventListener("DOMContentLoaded", load);

let checkBoxSymbol = '\u2714';

function load() {
	
	/*load() is called on page load*/

	//Draw up the table with any saved value but first read info we need
	//These calls are asynchronous so we need to wait for them to complete before moving on
	let tempList;
	getStoredValues().then(
		function(siteList) {
			tempList = siteList; //Hack to store siteList for a call to generateTable()
			return getContextNames();
		}).catch(
		function(error) {
			console.log("Trouble getting storedValues Names :" + error);
		}).then(
		function(contexts) {
			generateTable(tempList, contexts);
		}).catch(function(error) {
		console.log("Trouble getting context names");
	});

	//Register event Listener for the save button
	document.querySelector(".saveBtn").addEventListener("click", saveOptions);
	document.querySelector(".clearBtn").addEventListener("click", clearAll);
}

function clearAll()
{
	var r=confirm("Are you sure you want to clear all your saved URLs?");
	
	if(r==true)
	{
		// clear Stored Values
		browser.storage.sync.clear().then(function (){
			clearTable();
			load();
		});
	}
}

function saveOptions() {
	/***********************************************************************
	saveOptions() called when Save button is pressed
	************************************************************************/
	


	//Hide the error message if it was displayed
	var div = document.querySelector(".badURLError");
	if (div != null) {
		div.remove();
	}

	getStoredValues().then(function(siteList) {
		let contextList = getCheckBoxValues(); //Read the values of the checkboxes
		let siteName = getSiteName(); //Read the value from input of site URL
		let displayName = getDisplayName(); //Read the value from input of displayName
		let entryKey = generateEntryKey(siteName); //Use this to reference our entries; couldn't get away with just using site names because special characters would break things
		
		
		if (validateURL(siteName)) {
			
			let keyNamePair = {entryKey, siteName};
			
			siteList[entryKey] = {
					'url': siteName,
					'displayName': displayName,
					'containers': contextList
					};
					

			//Asynchronous part to retrieve stored values
			browser.storage.sync.set(siteList).then(function() {
					return getStoredValues();
				})
				.then(
					function() {
						return getContextNames();
					}).then(
					function(contexts) {
						clearTable();
						generateTable(siteList, contexts);
					}).catch(function(error) {
					console.log("Error in async chain: " + error)
				});


		} else {
			//If the URL was invalid
			//Create a banner to show error to user
			var div = document.createElement("div");
			div.className = "badURLError";
			div.innerHTML = "URL is not valid. Please enter URL in the form: https://mozilla.com";
			document.body.appendChild(div);
		}
	});

	function getCheckBoxValues() {
		var checkboxes = document.querySelectorAll("input[type=checkbox]:checked");
		var contextList = [];
		for (var i = 0; i < checkboxes.length; i++) {
			contextList.push(checkboxes[i].value);
		}
		return contextList;
	}

	function getSiteName() {
		return document.querySelector(".siteURLInput").value;
	}

	function getDisplayName() {
		return document.querySelector(".siteDisplayNameInput").value;
	}

	function generateEntryKey(data)
	{
		//Check if we have an key we arwe already using 
		if(document.querySelector(".siteURLInput").id!="")
			return document.querySelector(".siteURLInput").id
			
return  Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);  //Thank you: https://gist.github.com/6174/6062387
	}
}

function getStoredValues() {
	/***********************************************************************
	Called from multiple places
	Contains asynchronous functions to be called when storage is read
	Returns promise
	************************************************************************/

	return new Promise(function(resolve, reject) {
		let siteList = {};
		//Called on return of promise from reading storage
		function setSiteList(result) {
			//Iterate over the results and store them in window.siteList
			for (let site in result) {
				siteList[site] = result[site]; //Save the result in global variable
				//console.log("getStoredValues: ", siteList[site]);
			}
			resolve(siteList);
		}

		//Called on error of reading local storage
		function onError(error) {
			reject("No siteList");
		}

		var getting = browser.storage.sync.get();
		getting.then(setSiteList, onError);
	});

}

function getContextNames() {
	/***********************************************************************
	Called from multiple places	
	Returns a promise
	***********************************************************************/

	
	return new Promise(function(resolve, reject) {
		browser.contextualIdentities.query({}).then(returnContextNames, onError);

		function returnContextNames(contexts) {
			resolve(contexts);
		}

		function onError() {
			reject("Can't get context names");
		}
	});
}

function generateTable(siteList, contexts) {
	/***********************************************************************
	Called from multiple places
	***********************************************************************/
	
		console.log(checkBoxSymbol);

	let table = document.getElementsByClassName("siteTable")[0]; //Select the table
	let headerRow = table.insertRow(0); //Create a header row

	//Create header cell with title: "Display Name"
	let header = document.createElement("th");
	header.innerHTML = "Display name";
	headerRow.appendChild(header);

	//Create header cell with title: "URL"
	header = document.createElement("th");
	header.innerHTML = "URL";
	headerRow.appendChild(header);

	//Iterate over the known contexts and create header labels for it
	for (let context of contexts) {
		header = document.createElement("th");
		header.innerHTML = context.name;
		headerRow.appendChild(header);
	}

	//Select table
	
	table = document.getElementsByClassName("siteTable")[0];

	var itemCount = 0;
	
	
	
	//Fill in the saved data
	fillSavedTableValues(siteList);

	//Create input row
	//var inputRow = document.getElementsByClassName("inputRow")[0];
	let inputRow = table.insertRow(-1);

	let inputCellDisplayName = document.createElement("input");
	inputCellDisplayName.setAttribute("placeholder", "Enter name to display");

	/*DEBUG*/
	//inputCellDisplayName.setAttribute("value", "QUACK");  
	/*END DEBUG*/

	inputCellDisplayName.className = "siteDisplayNameInput";
	inputRow.appendChild(inputCellDisplayName);
	
	let cell = document.createElement("td");

	let inputCell = document.createElement("input");
	inputCell.setAttribute("placeholder", "Enter URL");

	/*DEBUG*/
	//inputCell.setAttribute("value", "https://duckduckgo.com");  
	/*END DEBUG*/

	inputCell.className = "siteURLInput";
	cell = inputRow.insertCell(-1);
	cell.appendChild(inputCell);


	//Create input row
	for (let context of contexts) {
		//Insert checkboxes into each row to make a grid
		let checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.className = "selectBox";
		checkbox.value = context.name;

		let cell = inputRow.insertCell(-1);
		cell.className = "selectBoxCell";
		cell.appendChild(checkbox);

	}

	function fillSavedTableValues(siteList) {
		/***********************************************************************
			Function is used to take a list of site context pairs and create a
		    table with those marked
		***********************************************************************/

		//Format of siteList
		// siteList[entryKey] = {
		// 				'url': siteName,
		// 				'containers': contextList
		// 				};

		//Goes through each site we have, For each site, we add a new row
		for (let key in siteList) {
			//Create the row at the end of the table
			var row = table.insertRow(-1);

			//Create the cell with site name
			let displayNameCell = document.createElement("td");
			console.log("displayName should be: ",siteList[key].displayName);
			var displayName = siteList[key].displayName;
			console.log(displayName);
			if(displayName == "")
			{
				displayName=siteList[key].url;
			}
			displayNameCell.innerHTML = displayName;
			displayNameCell.id=key;
			row.appendChild(displayNameCell);
			
			//Create the cell with site name
			let urlCell = document.createElement("td");
			console.log("Url should be: ",siteList[key].url);
			urlCell.innerHTML = siteList[key].url;
			urlCell.id=key;
			row.appendChild(urlCell);

			//Iterate over the context we have saved for the site and check off the box
			
			for (let columnCounter = 2; columnCounter < table.rows[0].cells.length; columnCounter++) {
				//Create markers if the respective container is selected
				let checkedCell = document.createElement("td");
				checkedCell.className = "selectBoxCell"
				checkedCell.setAttribute("value", table.rows[0].cells[columnCounter].innerHTML);


				for (let context of siteList[key].containers) {
					
					//If the name of the column header matches the saved context for the site lets market it with a checkBoxSymbol
					
					if (table.rows[0].cells[columnCounter].innerHTML === context) {
						checkedCell.innerHTML = checkBoxSymbol;
					} else if (checkedCell.innerHTML === checkBoxSymbol) {
						//To skip over marked ones already and not clear them
					} else {
						checkedCell.innerHTML = "";
					}
				}
				row.appendChild(checkedCell);
			}//for loop
			//Create cell for the edit button
			let editCell = document.createElement("td");
			editCell.className = "deleteCell";
			editCell.id = key; //Set ID to key name it used for editing row
			var img = document.createElement("img");
			img.id = key; //Set ID to key name it is used for editing row
			img.src = "../icons/container-edit.svg";

			editCell.appendChild(img);
			row.appendChild(editCell);

			//Attach click handlers to the image and cell
			editCell.addEventListener("click", function(e) {
				editRow(e)
			});
			img.addEventListener("click", function(e) {
				editRow(e)
			});

			//Create cell for the delete button
			let deleteCell = document.createElement("td");
			deleteCell.className = "deleteCell";
			deleteCell.id = urlCell.innerHTML; //Set ID to URL name it used for deleting row
			var img = document.createElement("img");
			img.id = key; //Set ID to key; it is used for deleting row
			img.src = "../icons/container-delete.svg";

			deleteCell.appendChild(img);
			row.appendChild(deleteCell);

			//Attach click handlers to the image and cell
			deleteCell.addEventListener("click", function(e) {
				deleteRow(e)
			});
			img.addEventListener("click", function(e) {
				deleteRow(e)
			});
			
		}//for loop
	}//fillSavedTableValues()

}


function clearTable() {
	/***********************************************************************
	Called multiple times
	Clears the table before redrawing
	************************************************************************/

	let table = document.getElementsByClassName("siteTable")[0]; //Select the table

	let length = table.rows.length;
	console.log("Clearing Table of length", length);
	while (table.length > 0)
		table.parentNode.removeChild(tables[0]);
	for (let i = length - 1; i > 0; i--) {
		table.deleteRow(0);
	}
	table.innerHTML = "";

}

function editRow(e)
{
	/***********************************************************************
	Called when a user clicks on the edit button
	Changes the row to input fields
	************************************************************************/
	
	let key = e.target.id;

	//Select table
	var table = document.getElementsByClassName("siteTable")[0];
	//console.log(table);

	//Iterate over every row in the table
	for(let row of table.rows)
	{
			//Check if the first cell in the row is equal to our target URL
			if(row.cells[0].id === key)
			{
							
				//Set the value of the input URL box to the url we want to edit
				var uncleanURL = (row.cells[1].innerHTML); //Basically a hack to get rid of ampersand issue
				document.getElementsByClassName("siteURLInput")[0].value=uncleanURL.replace(/&amp;/g, '&');
			
				//Set the value of the input display name box to the display name we want to edit
				var uncleanDisplayName = (row.cells[0].innerHTML); //Basically a hack to get rid of ampersand issue
				document.getElementsByClassName("siteDisplayNameInput")[0].value=uncleanDisplayName.replace(/&amp;/g, '&');
			
				//Set id of input field to our key, so we can track it in the save action
				document.getElementsByClassName("siteURLInput")[0].id=key;
				

				//Go through all the cells in the row now
				for(let cell of row.cells)
				{
					//console.log(cell.getAttribute("class"));
					let currentCellClass = cell.getAttribute("class"); 
					if(currentCellClass === "selectBoxCell") //Means we are looking the marked cells for context
					{
						//console.log(cell.innerHTML);
						let cellContext = cell.getAttribute("value");
						//console.log(cellContext);
						
						
						if(cell.innerHTML===checkBoxSymbol)
						{
							for(let checkBox of document.getElementsByClassName("selectBox"))
								if(checkBox.getAttribute("value") === cellContext)
								{
									checkBox.checked=true;
								}
							
						}
					}
				}
				
		}
	}
}

function deleteRow(e) {
	/***********************************************************************
	Called when a user clicks on the delete button
	Delete the row
	************************************************************************/
	
	getStoredValues().then(function(siteList) {
		let key = e.target.id;
		console.log("Deleting: ", key);
		console.log("Deleteing: ", siteList[key]);
		siteList[key] = "";
		delete siteList[key];

		browser.storage.sync.remove(key).then(function() {
				return getStoredValues();
			}).catch(function(error) {
				console.log("Error setting storage: " + error);
			})
			.then(
				function() {
					return getContextNames();
				}).then(
				function(contexts) {
					clearTable();
					generateTable(siteList, contexts);
				});
	});
}

function validateURL(textval) {
	/***********************************************************************
	Called from saveOptions()
	Checks if it's a valid URL
	/**********************************************************************/

	let url;
	try { 
		url = new URL(textval);
  	} catch (_) {
      	return false;  
	}
	
	return url.protocol === "http:" || url.protocol === "https:";
}
