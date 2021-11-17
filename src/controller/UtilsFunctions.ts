import parse5 = require("parse5");
import { resolve } from "path";
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
			if (foo.nodeName === "table"){
				console.log("TABLE FOUND");
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
export async function parseBuildingChild(item: any): Promise<any[]> {
	if (item === "" || item === null || item === undefined){
		return [];
	}
	// get childNodes of the table
	let child = item.childNodes;
	if (child === "" || child === null || child === undefined){
		return [];
	}
	console.log("in parseTableChild()");
	let ret = [];
	for (let i = 0; i < child.length; i++){
		let atr = child[i];
		let name = atr.nodeName;
		let children = atr.childNodes;
		if (name === "tbody" && children !== [] && children !== undefined){
			for (let j = 0; j < children.length; j++){
				let itt = children[j];
				let bufferJSON = await makeBuildingsJSON(itt);
				if (bufferJSON !== null && bufferJSON !== false){
					ret.push(bufferJSON);
				}
			}
		}
	}
	return ret;
}


export function parseRoomChild(item: any): any{
	if (item === "" || item === null || item === undefined){
		return [];
	}
	let child = item.childNodes;
	if (child === "" || child === null || child === undefined){
		return [];
	}
	console.log("in parseRoomChild()");
	let ret = [];
	for (let i = 0; i < child.length; i++){
		let atr = child[i];
		let name = atr.nodeName;
		let children = atr.childNodes;
		if (name === "tbody" && children !== [] && children !== undefined){
			for (let j = 0; j < children.length; j++){
				let itt = children[j];
				let bufferJSON = makeRoomsJSON(itt);
				if (bufferJSON !== null && bufferJSON !== false){
					ret.push(bufferJSON);
				}
			}
		}
	}
	return ret;
}

export function getLatLon(url: string): Promise<number[]> {
	return new Promise((resolve, reject) => {
		let arr: number[] = [NaN, NaN];
		let xhr = new XMLHttpRequest();
		xhr.open("GET", url, true);
		xhr.send();
		xhr.onload = function () {
			if (xhr.readyState === 4) {
				if (xhr.status === 200) {
					let response = JSON.parse(xhr.responseText);
					arr[0] = response.lat;
					arr[1] = response.lon;
					resolve(arr);
				}
			}
			reject(arr);
		};
	});
}


export async function makeBuildingsJSON(child: any): Promise<any>{
	if (child === [] || child === null || child === undefined){
		return null;
	}
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
		let url = apiAdr.concat(encodeURIComponent(ret.rooms_address));
		let response = await getLatLon(url);
		ret.rooms_lat = response[0];
		ret.rooms_lon = response[1];
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
		return ret;
	} else {
		return false;
	}
}

export async function combineBuffer(buildings: any, dataSet: any[], id: string, kind: string): Promise<any> {
	if (buildings === null && dataSet === null){
		return new Error("Error: No rooms read");
	}
	let buffer = [];
	let bufferPos2 = [];

	let mode = {id: id, kind: kind};
	buffer.push(mode);
	let table2 = dataSet.map((x) => getTables(x));
	let buffer2 = Array.from(table2.map((y) => parseRoomChild(y)));
	let table1 = getTables(buildings);
	let buffer1 = await parseBuildingChild(table1);
	console.log("BUFFER 1 IS: " + buffer1);
	for (let itt of buffer1) {
		bufferPos2.push(itt);
	}
	for (let item of buffer2){
		let itt = item[0];
		if (itt !== undefined){
			let match = itt;
			let name = itt.rooms_name.split("-")[0];
			for (let val of buffer1){
				if (name === val.rooms_shortname){
					match = val;
					break;
				}
			}
			for (let i: number = 0; i < item.length; i++) {
				itt = item[i];
				itt.rooms_fullname = match.rooms_fullname;
				itt.rooms_shortname = name;
				itt.rooms_address = match.rooms_address;
				itt.rooms_lat = match.rooms_lat;
				itt.rooms_lon = match.rooms_lon;
				bufferPos2.push(itt);
			}
		}
	}
	buffer.push(bufferPos2);
	return buffer;
}
