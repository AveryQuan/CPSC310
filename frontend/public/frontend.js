document.getElementById("roomsButton").addEventListener("click", postRooms);

function postRooms() {
	let building = document.getElementById("roomsDropdown").value;

	let data = {
		"WHERE": {

			"IS": {
				"rooms_shortname": building
			}
		},
		"OPTIONS": {
			"COLUMNS": [
				"rooms_name",
				"rooms_shortname",
				"rooms_seats",
				"rooms_number",
				"rooms_type",
				"rooms_furniture",
				"rooms_href"
			]
		}
	};
	postData(data);
}

document.getElementById("coursesButton").addEventListener("click", postCourses);

function postCourses() {
	let grade = parseInt(document.getElementById("gradeDropdown").value, 10);
	console.log(grade, typeof (grade), document.getElementById("gradeDropdown").value, typeof (document.getElementById("gradeDropdown").value))
	// let order = document.getElementById("sortbyDropdown").value;

	let data =
		{
			"WHERE": {
				"LT":{
					"courses_avg": grade
				}
			},
			"OPTIONS": {
				"COLUMNS": [
					"courses_instructor",
					"overallAvg"
				],
				"ORDER": {
					"dir": "DOWN",
					"keys": [
						"overallAvg"
					]
				}
			},
			"TRANSFORMATIONS": {
				"GROUP": [
					"courses_instructor"
				],
				"APPLY": [
					{
						"overallAvg": {
							"AVG": "courses_avg"
						}
					}
				]
			}
		}
		postData(data);

}

function postData(data)
{
	let xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function () {
		if (this.readyState != 4) return;

		if (this.status == 200) {
			try{
				let results = document.getElementById("results");
				results.parentNode.removeChild(results);
			} catch (e) {

			}

			let data = JSON.parse(this.responseText)["result"];
			document.body.appendChild(buildHtmlTable(data));
		}
	};
	xhr.open("POST", "http://localhost:4321/query", true);
	xhr.setRequestHeader('Content-Type', 'application/json');
	xhr.send(JSON.stringify(data));
}

// document.getElementById("post-button").addEventListener("click", postCourses);

// Tabs thanks to w3schools.com
function openCity(evt, cityName) {
	// Declare all variables
	var i, tabcontent, tablinks;

	// Get all elements with class="tabcontent" and hide them
	tabcontent = document.getElementsByClassName("tabcontent");
	for (i = 0; i < tabcontent.length; i++) {
		tabcontent[i].style.display = "none";
	}

	// Get all elements with class="tablinks" and remove the class "active"
	tablinks = document.getElementsByClassName("tablinks");
	for (i = 0; i < tablinks.length; i++) {
		tablinks[i].className = tablinks[i].className.replace(" active", "");
	}

	// Show the current tab, and add an "active" class to the button that opened the tab
	document.getElementById(cityName).style.display = "block";
	evt.currentTarget.className += " active";
}

function handleClickMe() {
	alert("Button Clicked!");
}

function httpGetAsync(theUrl, callback)
{
	// alert(theUrl);
	let xmlHttp = new XMLHttpRequest();
	xmlHttp.onreadystatechange = function() {
		if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
			document.getElementById("text").setAttribute("value", xmlHttp.responseText);
	}
	xmlHttp.open("GET", "http://localhost:4321/dataset", true); // true for asynchronous
	xmlHttp.send(null);
}
function httpPutAsync(theUrl, callback)
{
	// alert(theUrl);
	let xmlHttp = new XMLHttpRequest();
	xmlHttp.onreadystatechange = function() {
		if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
			callback(xmlHttp.responseText);
	}
	xmlHttp.open("GET", "http://localhost:4321/dataset", true); // true for asynchronous
	xmlHttp.send(null);
}

function httpPostAsync(theUrl, callback)
{
	let data = {
		WHERE: {
			NOT: {
				NOT: {
					GT: {
						courses_avg: 90
					}
				}
			}
		},
		OPTIONS: {
			COLUMNS: [
				"courses_pass",
				"courses_dept",
				"courses_instructor",
				"courses_avg"
			],
			ORDER: {
				dir: "UP",
				keys: ["courses_avg"]
			}
		}
	};

	let xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function () {
		if (this.readyState != 4) return;

		if (this.status == 200) {
			try{
				let results = document.getElementById("results");
				results.parentNode.removeChild(results);
			} catch (e) {

			}

			let data = JSON.parse(this.responseText)["result"];
			document.body.appendChild(buildHtmlTable(data));
		}
	};
	xhr.open("POST", "http://localhost:4321/query", true);
	xhr.setRequestHeader('Content-Type', 'application/json');
	xhr.send(JSON.stringify(data));

}


var _table_ = document.createElement('table'),
	_tr_ = document.createElement('tr'),
	_th_ = document.createElement('th'),
	_td_ = document.createElement('td');


// Builds the HTML Table out of myList json data from Ivy restful service.
function buildHtmlTable(arr) {
	var table = _table_.cloneNode(false),
		columns = addAllColumnHeaders(arr, table);
	table.id = "results";
	let cellValue;
	for (var i = 0, maxi = arr.length; i < maxi; ++i) {
		var tr = _tr_.cloneNode(false);
		for (var j = 0, maxj = columns.length; j < maxj; ++j) {
			var td = _td_.cloneNode(false);
			cellValue = arr[i][columns[j]];
			td.appendChild(document.createTextNode(arr[i][columns[j]] || ''));
			tr.appendChild(td);
		}
		table.appendChild(tr);
	}
	return table;
}

// Adds a header row to the table and returns the set of columns.
// Need to do union of keys from all records as some records may not contain
// all records
function addAllColumnHeaders(arr, table) {
	var columnSet = [],
		tr = _tr_.cloneNode(false);
	for (var i = 0, l = arr.length; i < l; i++) {
		for (var key in arr[i]) {
			if (arr[i].hasOwnProperty(key) && columnSet.indexOf(key) === -1) {
				columnSet.push(key);
				var th = _th_.cloneNode(false);
				th.appendChild(document.createTextNode(key));
				tr.appendChild(th);
			}
		}
	}
	table.appendChild(tr);
	return columnSet;
}





function httpDeleteAsync(theUrl, callback)
{
	// alert(theUrl);
	let xmlHttp = new XMLHttpRequest();
	xmlHttp.onreadystatechange = function() {
		if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
			callback(xmlHttp.responseText);
	}
	xmlHttp.open("GET", "http://localhost:4321/dataset", true); // true for asynchronous
	xmlHttp.send(null);
}
