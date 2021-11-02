import parse5 = require("parse5");
import {Utils, EnumDataItem, RoomData} from "./Utils";
let XMLHttpRequest = require("xhr2");
let apiAdr = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team110/";

// Returns false if input is invalid
export function checkCourseFormat(input: string): boolean {
	if (input.includes("_")){
		return false;
	}
	let i = input.length;
	let onlySpaces = true;
	while (i--) {
		if (input[i] !== " ")	{
			onlySpaces = false;
		}
	}
	if (onlySpaces) {
		return false;
	}
	return true;
}

export function checkRoomFormat(input: string, buffer: string): boolean {
	if (input.includes("_")){
		return false;
	}
	let i = input.length;
	let onlySpaces = true;
	while (i--) {
		if (input[i] !== " ")	{
			onlySpaces = false;
		}
	}
	if (onlySpaces) {
		return false;
	}
	return true;
}

export function traverseRooms(input: any, readCase: string): any[] {
	// get tables
	let table = getTables(input);
	// parseTableChild()
	// if table is null or has no children => return []
	// otherwise returns data as an array
	let output = parseTableChild(table, readCase);
	if (output !== []){
		return output;
	}
	return [];
}

export function getTables(input: any): any {
	if (input === null) {
		return null;
	}
	// DFS to find child with nodeName "table"
	let todo: any[] = [];
	todo.push(input);

	while(todo.length !== 0){
		let n = todo.length;
		while(n > 0){
			let foo = todo.shift();
			console.log(foo.nodeName);
			if (foo.nodeName === "table"){
				return foo;
			}
			let child = foo.childNodes;
			console.log(child);
			for (let rc of child){
				todo.push(rc);
			}
			n = n - 1;
		}
	}
	return null;
}


export function parseTableChild(item: any, readCase: string): any[] {
	if (item === null){
		return [];
	}
	// get childNodes of the table
	let child = item.childNodes;
	if (child === [] || child === null || child === undefined){
		return [];
	}
	let ret = [];
	for (let atr of child){
		// atr.nodeName does not work
		// parse to JSON with buffer
		let buffer1 = JSON.parse(atr);
		let name = buffer1.nodeName;
		// go to tbody childNodes of the table
		if (name === "tbody"){
			// get tbody childNodes
			let children = buffer1.childNodes;
			if (children === [] || children === null || children === undefined){
				return [];
			} else {
				// iterate over childNodes of tbody
				for (let itt of children){
					let buffer2 = JSON.parse(itt);
					let bufferJSON = null;
					switch(readCase){
					case ("buildings"):
						bufferJSON = makeBuildingsJSON(buffer2);
						if (bufferJSON !== null){
							ret.push(bufferJSON);
						}
						break;
					case ("rooms"):
						bufferJSON = makeRoomsJSON(buffer2);
						if (bufferJSON !== null){
							ret.push(bufferJSON);
						}
						break;
					default:
						break;
					}
				}
			}
		}
	}
	return ret;
}

export function makeBuildingsJSON(child: any): any{
	if (child === [] || child === null || child === undefined){
		return null;
	}
	// if the nodeName is 'tr'
	let name = child.nodeName;
	if (name === "tr") {
		// initiate return value
		let ret = new RoomData();
		let children = child.childNodes;
		// make data structure from values in td
		for (let cl of children){
			let itt = JSON.parse(cl);
			if (itt.nodeName === "td"){
				let switchCase = itt.attrs.value;
				let val = itt.childNodes["#text"].value.trim();
				switch (switchCase){
				case ("views-field views-field-field-building-code"):
					ret.rooms_shortname = val;
					break;
				case ("views-field views-field-title"):
					ret.rooms_fullname = val;
					break;
				case ("views-field views-field-field-building-address"):
					ret.rooms_address = val;
					break;
				default:
					break;
				}
			}
		}
		// set lon and lat
		let url = apiAdr.concat(encodeURIComponent(ret.rooms_address));
		let xhr = new XMLHttpRequest();
		xhr.open("GET", url);
		xhr.onload = function () {
			if (xhr.readyState === 4) {
				if (xhr.status === 200) {
					ret.rooms_lat = xhr.responseText.lat;
					ret.rooms_lon = xhr.responseText.lon;
				}
			}
		};
		xhr.send();
		// return array as JSON or string
		return ret;
	} else {
		return null;
	}
}

export function makeRoomsJSON(child: any): any {
	if (child === null || child === undefined){
		return null;
	}
	// iterate until tag <tr/> is found then load
	// if the nodeName is 'tr'
	let name = child.nodeName;
	if (name === "tr") {
		// initiate return value
		let ret = new RoomData();
		let children = child.childNodes;
		// make data structure from values in td
		for (let cl of children){
			let itt = JSON.parse(cl);
			if (itt.nodeName === "td"){
				let switchCase = itt.attrs.value;
				let val = itt.childNodes["#text"].value.trim();
				switch (switchCase){
				case ("views-field views-field-field-room-number"):
					val = itt.childNodes["a"].attrs.childNodes["#text"].value.trim();
					ret.rooms_number = val;
					break;
				case ("views-field views-field-field-room-capacity"):
					ret.rooms_seats = val;
					break;
				case ("views-field views-field-field-room-furniture"):
					ret.rooms_furniture = val;
					break;
				case ("views-field views-field-field-room-type"):
					ret.rooms_type = val;
					break;
				case ("views-field views-field-nothing"):
					val = itt.childNodes["a"].attrs.value.trim();
					ret.rooms_href = val;
					break;
				default:
					break;
				}
			}
		}
		let str = ret.rooms_href.split("/").slice(-1).pop();
		if (str !== undefined){
			ret.rooms_name = str;
		}
		// return array as JSON or string
		return ret;
	} else {
		return null;
	}

}

export function matchRoomBuilding(rooms: any[], buildings: any[]): any[] {
	if (rooms === [] || buildings === []){
		return [];
	}
	// RoomData
	for (let rs of rooms){
		let data = JSON.parse(rs);
		// read in rooms_name and remove dash and course number
		let val = data.rooms_name.split("-")[0];

		if (val !== undefined){
			data.rooms_shortname = val;
			for (let bs of buildings){
				let dataB = JSON.parse(bs);
				if (val === dataB.rooms_shortname){
					data.rooms_fullname = dataB.rooms_fullname;
					data.rooms_address = dataB.rooms_address;
					data.rooms_lat = dataB.rooms_lat;
					data.rooms_lon = dataB.rooms_lon;
				}
			}

		}
	}
	return [];
}

export function combineBuffer(buildings: any, dataSet: any[], id: string, kind: string): any {
	if (buildings === null && dataSet === null){
		return new Error("Error: No rooms read");
	}
	console.log("ping");
	// traverse tables in "index.htm" and format as RoomData
	let buffer1 = traverseRooms(buildings, "buildings");
	console.log("buffer 1");
	// traverses files in "rooms/campus/discover/buildings-and-classrooms"
	// and format as RoomData
	dataSet.map((x) => traverseRooms(x, "rooms"));
	// resulting dataSet is missing fullname, address, lat and lon
	// get issing values from RoomData with matching shortname in buffer1
	dataSet = matchRoomBuilding(dataSet, buffer1);
	// combine arrays
	let ret = buffer1.concat(dataSet);
	let mode = {id: id, kind: kind};
	ret.unshift(mode);
	return ret;
}
