'use strict'
/******************************************************************************
	There are 3 asynchronous calls that produce promises, this drives the       	structure of the code. We have to wait for each of those to be completed    	before doing any next steps.
 	1. Reading list of contexts (Container)s
	2. Getting storage variable we saved
 	3. Setting storage variable

  Page Loads -> call load() -> getStoredValues (only when complete)
	-> getContextNames (only when complete) -> generateTable()
******************************************************************************/

//Add listener so when page loads - load() function is called
document.addEventListener("DOMContentLoaded", load);

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
		let siteName = getSiteName(); //Read the value from input
		if (validateURL(siteName)) {

			siteList[siteName] = contextList;

			//Asynchronous part
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
	

	let table = document.getElementsByClassName("siteTable")[0]; //Select the table
	let headerRow = table.insertRow(0); //Create a header row

	//Create header cell with title: "Site Name"
	let header = document.createElement("th");
	header.innerHTML = "Site Name";
	headerRow.appendChild(header);

	//Iterate over the known contexts and create header labels for it
	for (let context of contexts) {
		header = document.createElement("th");
		header.innerHTML = context.name;
		headerRow.appendChild(header);
	}

	//Fill in the saved data
	fillSavedTableValues(siteList);

	//Create input row
	//var inputRow = document.getElementsByClassName("inputRow")[0];
	let inputRow = table.insertRow(-1);
	let inputCell = document.createElement("input");
	inputCell.setAttribute("placeholder", "Enter URL");
	//inputCell.setAttribute("value", "https://duckduckgo.com");  DEBUG
	inputCell.className = "siteURLInput";
	inputRow.appendChild(inputCell);
	let cell = document.createElement("td");

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

		//Select table
		var table = document.getElementsByClassName("siteTable")[0];

		var itemCount = 0;

		//Goes through each site we have, For each site, we add a new row
		for (let item in siteList) {
			//Create the row at the end of the table
			var row = table.insertRow(-1);

			//Create the cell with site name
			let urlCell = document.createElement("td");
			urlCell.innerHTML = item;
			row.appendChild(urlCell);

			//Iterate over the context we have saved for the site and check off the box
			
			for (let columnCounter = 1; columnCounter < table.rows[0].cells.length; columnCounter++) {
				//Create markers if the respective container is selected
				let checkedCell = document.createElement("td");
				checkedCell.className = "selectBoxCell"
				checkedCell.setAttribute("value", table.rows[0].cells[columnCounter].innerHTML);


				for (let context of siteList[item]) {
					
					//If the name of the column header matches the saved context for the site lets market it with a "*"
					
					if (table.rows[0].cells[columnCounter].innerHTML === context) {
						checkedCell.innerHTML = "*";
					} else if (checkedCell.innerHTML === "*") {
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
			editCell.id = urlCell.innerHTML; //Set ID to URL name it used for editing row
			var img = document.createElement("img");
			img.id = urlCell.innerHTML; //Set ID to URL name it is used for editing row
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
			img.id = urlCell.innerHTML; //Set ID to URL name it is used for deleting row
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
	
	console.log("Called edit row");
	let siteName = e.target.id;
	

	//Select table
	var table = document.getElementsByClassName("siteTable")[0];
	//console.log(table);

	//Iterate over every row in the table
	for(let row of table.rows)
	{
		//console.log(row);
		//for(let cell of row.cells)
		//{
			//Check if the first cell in the row is equal to our target URL
			if(row.cells[0].innerHTML === e.target.id)
			{
				
				// console.log("Found " + document.getElementsByClassName("siteURLInput").length + " elements with this class name");
//
				
				//Set the value of the input URL box to the url we want to edit
				document.getElementsByClassName("siteURLInput")[0].value=row.cells[0].innerHTML;

				//Go through all the cells in the row now
				for(let cell of row.cells)
				{
					//console.log(cell.getAttribute("class"));
					let currentCellClass = cell.getAttribute("class"); 
					if(currentCellClass === "selectBoxCell") //Means we are looking the marked cells for context
					{
						console.log(cell.innerHTML);
						let cellContext = cell.getAttribute("value");
						console.log(cellContext);
						
						
						if(cell.innerHTML==="*")
						{
							for(let checkBox of document.getElementsByClassName("selectBox"))
								if(checkBox.getAttribute("value") === cellContext)
								{
									checkBox.checked=true;
								}
							
						}
					}
					//if(cell.className=)
				}
				// //Found our row to edit
			// 	let cell = row.cells[0];
			// 	console.log(cell);
			//
			//
			// 	//Convert the Site Name cell of the row to an input
			// 	let inputCell = document.createElement("input");
			// 	inputCell.setAttribute("value", cell.innerHTML);
			//
			// 	inputCell.className = "siteURLInput";
			// 	cell.replaceChild(inputCell,cell.firstChild);
			//
			// 	// //Convert the checked off list to check boxes
			// 	for (let cell of row) {
			// 		//Insert checkboxes into each row to make a grid
			// 		let checkbox = document.createElement("input");
			// 		checkbox.type = "checkbox";
			// 		checkbox.className = "selectBox";
			// 		checkbox.value = context.name;
			//
			// 		//Check if it's already selected
			// 		if(cell.)
			// 		checkbox.checked
			//
			// 		let cell = inputRow.insertCell(-1);
			// 		cell.className = "selectBoxCell";
			// 		cell.appendChild(checkbox);
			//
			// 		break;
			// 	}
				
				
				
				//}
		}
	}
}

function deleteRow(e) {
	/***********************************************************************
	Called when a user clicks on the delete button
	Delete the row
	************************************************************************/

	getStoredValues().then(function(siteList) {
		let siteName = e.target.id;
		siteList[siteName] = "";
		delete siteList[siteName];

		browser.storage.sync.remove(siteName).then(function() {
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
	Got it from: https://stackoverflow.com/questions/1303872/trying-to-validate-url-using-javascript
	************************************************************************/

	let urlregex = /^(https?|ftp):\/\/([a-zA-Z0-9.-]+(:[a-zA-Z0-9.&%$-]+)*@)*((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}|([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(:[0-9]+)*(\/($|[a-zA-Z0-9.,?'\\+&%$#=~_-]+))*$/;
	return urlregex.test(textval);
}
