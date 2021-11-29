// document.getElementById("click-me-button").addEventListener("click", httpGetAsync);
document.getElementById("post-button").addEventListener("click", httpPostAsync);
document.getElementById("post-building-button").addEventListener("click", postBuilding);
document.getElementById("order").addEventListener("change", changeSort);

var asc = {
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
let dsc = {
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
				dir: "DOWN",
				keys: ["courses_avg"]
			}
		}
	};
var data = asc; 
// room query
var ret = [];



function changeSort(url, callback) {
	var order = document.getElementById("order").value;
	if (order === "asc"){
		data = asc;
	} else if (order === "dsc"){
		data = dsc;
	}
	console.log(data);
}

function handleClickMe() {
	alert("Button Clicked!");
}
function postBuildingQuery(){	
	let query = {
		WHERE : {
			GT: {
				rooms_seats: 0
			}
		},
		OPTIONS: {
			COLUMNS: [
				"rooms_shortname",
				"rooms_name",
				"rooms_seats"
			],
			ORDER: {
				dir: "UP",
				keys: ["rooms_shortname"]
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

			ret = JSON.parse(this.responseText)["result"];
			makeBuildingList();
		}
	};
	xhr.open("POST", "http://localhost:4321/query", true);
	xhr.setRequestHeader('Content-Type', 'application/json');
	xhr.send(JSON.stringify(query));
}


function httpGetAsync(theUrl, callback) {
	// alert(theUrl);
	let xmlHttp = new XMLHttpRequest();
	xmlHttp.onreadystatechange = function() {
		if (xmlHttp.readyState == 4 && xmlHttp.status == 200){
			console.log("READY STATE 4");
			// document.getElementById("text").setAttribute("value", xmlHttp.responseText);
			postBuildingQuery();
			console.log("cont")
		}}
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

function makeBuildingList(){
	var selectList = document.getElementById("building");
	console.log(ret);
	if (ret === []){
		var option = document.createElement("option");
		option.value = "false";
		option.text = "No building information avaliable in dataset";
		selectList.appendChild(option);
	} else {
		var acc = ""; 
		for (var i = 0, maxi = ret.length; i < maxi; ++i) {
			if (acc !== ret[i]["rooms_shortname"]){
				var option = document.createElement('option');
				acc = ret[i]["rooms_shortname"];
				option.value = acc;
				option.text = acc;
				selectList.appendChild(option);
			} 
		}
	}
}

function postBuilding(){
	console.log("POST BUILDING");
	let name = [];
	let data = [];
	try{
		Array.from(document.querySelector("#building").options).forEach(function(option_element) {
		let is_option_selected = option_element.selected;
			if (is_option_selected){
				name.push(option_element.value);
				// let tableData = JSON.parse(ret)["result"][option_value];
			}
		});
	} catch(e) {
		console.log(e);
	}
	
	for (var i = 0; i < ret.length; i++){
		if (name.includes(ret[i]["rooms_shortname"])){
			data.push(ret[i]);
		}
	};
	try{
		let results = document.getElementById("results");
		results.parentNode.removeChild(results);
	} catch (e) {

	}
	document.body.appendChild(buildHtmlTable(data));
}