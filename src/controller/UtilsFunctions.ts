
import parse5 = require("parse5");
import { InsightDataset, InsightDatasetKind } from "./IInsightFacade";
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
				return foo;
			}
			let child: any[] = foo.childNodes;
			if (child !== undefined){
				for (let rc of child){
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
	let ret = [];
	for (let atr of child){
		let name = atr.nodeName;
		let children = atr.childNodes;
		if (name === "tbody" && children !== [] && children !== undefined){
			for (let itt of children){
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
	let ret = [];
	for (let atr of child){
		let name = atr.nodeName;
		let children = atr.childNodes;
		if (name === "tbody" && children !== [] && children !== undefined){
			for (let itt of children){
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
	let xhr = new XMLHttpRequest();
	return new Promise((resolve, reject) => {
		let arr: number[] = [NaN, NaN];
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
			for (let itt of children){
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
		return getLatLon(url).then((response) => {
			ret.rooms_lat = response[0];
			ret.rooms_lon = response[1];
			return ret;
		});
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
			for (let itt of children){
				if (itt.nodeName === "td"){
					let switchCase = itt.attrs[0].value;
					let val = "";
					switch (switchCase){
						case ("views-field views-field-field-room-number"):
							val = itt.childNodes[1].childNodes[0].value.trim();
							ret.rooms_number = val;
							break;
						case ("views-field views-field-field-room-capacity"):
							ret.rooms_seats = parseInt(itt.childNodes[0].value.trim(), 10);
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
			ret.rooms_name = str.replace(/-/g, "_");
		}
		return ret;
	} else {
		return false;
	}
}

export async function combineBuffer(buildings: any, dataSet: any[], id: string): Promise<any> {
	if (buildings === null && dataSet === null){
		return new Error("Error: No rooms read");
	}
	let buffer = [];
	let bufferPos2 = [];

	let table2 = dataSet.map((x) => getTables(x));
	let buffer2 = Array.from(table2.map((y) => parseRoomChild(y)));
	let table1 = getTables(buildings);
	let buffer1 = await parseBuildingChild(table1);
	if (buffer1 === [] || buffer2 === []){
		return new Error("Error: Parse html failed/No tables found");
	}

	for (let item of buffer2){
		let itm = item[0];
		if (itm !== undefined){
			let match = itm;
			let matchFound = false;
			let name = itm.rooms_name.split("_")[0];
			for (let val of buffer1){
				if (name === val.rooms_shortname){
					match = val;
					matchFound = true;
					break;
				}
			}
			if (matchFound){
				for (let obj of item) {
					obj.rooms_fullname = match.rooms_fullname;
					obj.rooms_shortname = name;
					obj.rooms_address = match.rooms_address;
					obj.rooms_lat = match.rooms_lat;
					obj.rooms_lon = match.rooms_lon;
					bufferPos2.push(obj);
				}
			}
		}
	}

	let num: number = bufferPos2.length;
	let mode: InsightDataset = {id: id, kind: InsightDatasetKind.Rooms, numRows:num};
	buffer.push(mode);

	buffer.push(bufferPos2);
	return buffer;
}
