import parse5 = require("parse5");
import { chdir } from "process";
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
	let table = getTables(input);
	let output = parseTableChild(table, readCase);
	return output;
}

export function getTables(input: any): any {
	if (input === null) {
		return null;
	}
	// DFS to find child with nodeName "table"
	let todo: any[] = [];
	todo.push(input);
	// console.log("pong");

	while(todo.length !== 0){
		let n = todo.length;
		while(n > 0){
			let foo = todo.shift();
			if (foo.nodeName === "table"){
				// console.log("TABLE FOUND");
				return foo;
			}
			let child: any[] = foo.childNodes;
			if (child !== undefined){
				for (let i = 0; i < child.length; i++){
					let rc = child[i];
					todo.push(rc);
				}
			}
			n = n - 1;
		}
	}
	return null;
}

// item is table as html tag
export function parseTableChild(item: any, readCase: string): any[] {
	if (item === "" || item === null || item === undefined){
		return [];
	}
	// get childNodes of the table
	let child = item.childNodes;
	if (child === "" || child === null || child === undefined){
		return [];
	}
	// console.log("in parseTableChild()");
	let ret = [];
	for (let i = 0; i < child.length; i++){
		let atr = child[i];
		// parse to JSON with buffer
		let name = atr.nodeName;
		// go to tbody childNodes of the table
		if (name === "tbody"){
			// get tbody childNodes
			let children = atr.childNodes;
			if (children !== [] && children !== null && children !== undefined){
				for (let j = 0; j < children.length; j++){
					let itt = children[j];
					let bufferJSON = null;
					switch(readCase){
					case ("buildings"):
						bufferJSON = makeBuildingsJSON(itt);
						if (bufferJSON !== null && bufferJSON !== false){
							ret.push(bufferJSON);
						}
						break;
					case ("rooms"):
						bufferJSON = makeRoomsJSON(itt);
						if (bufferJSON !== null && bufferJSON !== false){
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
		let ret = new RoomData();
		let children = child.childNodes;
		if (children !== null || children !== undefined){
			for (let i = 0; i < children.length; i++){
				let itt = children[i];
				if (itt.nodeName === "td"){
					let switchCase = itt.attrs[0].value;
					switch (switchCase){
					case ("views-field views-field-field-building-code"):
						ret.rooms_shortname = itt.childNodes[0].value.trim();
						break;
					case ("views-field views-field-title"):
						ret.rooms_fullname = itt.childNodes[1].childNodes[0].value.trim();
						break;
					case ("views-field views-field-field-building-address"):
						ret.rooms_address = itt.childNodes[0].value.trim();
						break;
					default:
						break;
					}
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
		return ret;
	} else {
		return false;
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
		if (children !== null || children !== undefined){
			for (let i = 0; i < children.length; i++){
				let itt = children[i];
				if (itt.nodeName === "td"){
					let switchCase = itt.attrs[0].value;
					let val = "";
					switch (switchCase){
					case ("views-field views-field-field-room-number"):
						val = itt.childNodes[1].childNodes[0].value.trim();
						ret.rooms_number = val;
						break;
					case ("views-field views-field-field-room-capacity"):
						ret.rooms_seats = itt.childNodes[0].value.trim();
						break;
					case ("views-field views-field-field-room-furniture"):
						ret.rooms_furniture = itt.childNodes[0].value.trim();
						break;
					case ("views-field views-field-field-room-type"):
						ret.rooms_type = itt.childNodes[0].value.trim();
						break;
					case ("views-field views-field-nothing"):
						val = itt.childNodes[1].attrs[0].value.trim();
						ret.rooms_href = val;
						break;
					default:
						break;
					}
				}
			}
		}
		let str = ret.rooms_href.split("/").slice(-1).pop();
		if (str !== undefined){
			ret.rooms_name = str;
		}
		// ret.print();
		return ret;
	} else {
		return false;
	}

}

export function matchRoomBuilding(rooms: any[], buildings: any[]): boolean {
	if (rooms === [] || buildings === []){
		return false;
	}
	console.log("matching ...");
	console.log(rooms);
	let data = rooms[0];
	console.log(data);
	let val = data[0].rooms_name.split("-")[0];
	console.log(val);
	for (let i = 0; i < rooms.length; i++){
		if (val !== undefined && val !== ""){
			data.rooms_shortname = val;
			for ( let j = 0; j < buildings.length; j++ ){
				let dataB = buildings[j];
				if (val === dataB.rooms_shortname){
					data.rooms_fullname = dataB.rooms_fullname;
					data.rooms_address = dataB.rooms_address;
					data.rooms_lat = dataB.rooms_lat;
					data.rooms_lon = dataB.rooms_lon;
				}
			}
		}
	}
	return true;
}

export function combineBuffer(buildings: any, dataSet: any[], id: string, kind: string): any {
	if (buildings === null && dataSet === null){
		return new Error("Error: No rooms read");
	}
	// console.log("ping");
	// traverse tables in "index.htm" and format as RoomData
	let buffer1 = traverseRooms(buildings, "buildings");
	// traverses files in "rooms/campus/discover/buildings-and-classrooms"
	// and format as RoomData
	// console.log("map");
	let buffer2 = dataSet.map((x) => traverseRooms(x, "rooms"));
	// resulting dataSet is missing fullname, address, lat and lon
	// get issing values from RoomData with matching shortname in buffer1
	// matchRoomBuilding(buffer2, buffer1);

	// combine arrays
	// let ret = buffer1.concat(dataSet);
	// let mode = {id: id, kind: kind};
	// ret.unshift(mode);
	let buffer = [];
	let bufferPos2 = [];
	let mode = {id: id, kind: kind};
	buffer.push(mode);
	for (let itt of buffer1) {
		bufferPos2.push(itt);
	}
	for (let item of buffer2){
		for (let itt of item) {
			bufferPos2.push(itt);
		}
	}
	buffer.push(bufferPos2);
	// console.log(buffer);
	return buffer;
}
