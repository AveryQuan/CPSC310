import JSZip from "jszip";
import {InsightDatasetKind, InsightError} from "./IInsightFacade";
import InsightFacade from "./InsightFacade";
import {Utils} from "./Utils";
import * as _ from "fs-extra";

export class NeedsThis {
	public static getDatasetKind(dataset: any, data: { get: (arg0: any) => any; }) {
		let temp = data.get(dataset);
		if (temp) {
			return temp[0]["kind"];
		}
		return undefined;
	}

	public  static queryNot(query: any, not: boolean, obj: any){
		let keys = Object.keys(query);
		if(keys.length !== 1) {
			return Promise.reject(new InsightError("more than one query after NOT"));
		}
		return Promise.resolve(obj.nextQuery(query, !not));
	}

	public static convertCoursesField(obj: any, groupSplit: any, func: any) {
		if (NeedsThis.getDatasetKind(groupSplit[0], obj.data) === "courses" && func[1].includes("_")) {
			func[1] = func[1].split("_")[1];
			if (InsightFacade.CONVERT_FIELDS.has(func[1])) {
				func[1] = InsightFacade.CONVERT_FIELDS.get(func[1])!;
			}
			if (func[1] !== "id") {
				func[1] = func[1][0].toUpperCase() + func[1].substring(1);
			}
		}
	}

	public static convertCourseField2(obj: any, groupFields: any, groupSplit: any, temp: any, result: any, group: any) {
		for (let field of groupFields) {
			if (NeedsThis.getDatasetKind(groupSplit[0], obj.data) === "courses" && field.includes("_")) {
				let splitField = field.split("_")[1];
				if (InsightFacade.CONVERT_FIELDS.has(splitField)) {
					splitField = InsightFacade.CONVERT_FIELDS.get(splitField)!;
				}
				if (splitField !== "id") {
					splitField = splitField[0].toUpperCase() + splitField.substring(1);
				}
				temp[field] = result[0].get(group)[0][splitField];
			} else {
				temp[field] = result[0].get(group)[0][field];	// take any group member to get the fields
			}
			// temp[field] = result[0].get(group)[0][field];
		}
	}

	// takes set of rows and groups by list of keys, returns map[key values, list of rows]
	public static group(results: any, keys: any) {
		const groups = new Map();
		results.forEach((row: any) => {
			let  rowValues: any[] = [];
			keys.forEach((key: any) => {
				rowValues.push(row[key]);
			});
			if (!groups.has(JSON.stringify(rowValues))){
				groups.set(JSON.stringify(rowValues), []);
			}
			groups.get(JSON.stringify(rowValues)).push(row);
		});
		return groups;
	}

	public static order(results: any, query: any) {
		const orderConvert = new Map([["UP",Utils.up], ["DOWN", Utils.down]]);
		if (!Utils.isEqual(Object.keys(query), ["dir", "keys"]) ) {
			if (!(typeof query === "string")){
				throw new InsightError("invalid order");
			} else {
				Utils.sort(results[0], [query], orderConvert.get("UP"));
			}
		} else {
			Utils.sort(results[0], query["keys"], orderConvert.get(query["dir"]));
		}

	}

	public static transformations(obj: any, results: any, query: any) {
		let columns: string[] = [];
		const APPLY = new Map([["MAX" , Utils.max],["MIN" , Utils.min],
			["AVG" , Utils.avg], [ "COUNT" , Utils.count],[ "SUM", Utils.sum]]);
		let keys = Object.keys(query);
		if (!keys.includes("GROUP")) {
			return Promise.reject(new InsightError("Must include group"));
		}

		let groupSplit = query["GROUP"][0].split("_",2);	// [0] is dataset name [1] is field to group on
		for (let g of query["GROUP"]){
			let fieldSplit = g.split("_", 2);
			if (fieldSplit[0] !== results[1]) {
				return Promise.reject(new InsightError(fieldSplit[0] + " refers to different dataset"));
			}
			if (NeedsThis.getDatasetKind(results[1], obj.data) === "rooms") {
				if (InsightFacade.FIELDS.indexOf(fieldSplit[1]) === -1){
					return Promise.reject(new InsightError(fieldSplit[1] + " is invalid group field"));
				}
			} else {
				if (InsightFacade.FIELDS.indexOf(fieldSplit[1]) === -1){
					return Promise.reject(new InsightError(fieldSplit[1] + " is invalid group field"));
				}
			}
		}

		if (NeedsThis.getDatasetKind(groupSplit[0], obj.data) === "rooms") {
			results[0] = NeedsThis.group(results[0], query["GROUP"]);
			columns = columns.concat(query["GROUP"]);
		} else {
			let groupWithoutDataname: any[] = [];
			let optionsCheckGroups = [];
			for (let g of query["GROUP"]){
				optionsCheckGroups.push(g);
				let temp = g.split("_")[1];
				if (InsightFacade.CONVERT_FIELDS.has(temp)) {
					temp = InsightFacade.CONVERT_FIELDS.get(temp)!;
				}
				if (temp !== "id" ) {
					temp =  temp[0].toUpperCase() + temp.substring(1);
				}
				groupWithoutDataname.push(temp);
			}
			results[0] = NeedsThis.group(results[0], groupWithoutDataname); // results[0] is now a map instead of a list
			let columnsSet = new Set(optionsCheckGroups);
			optionsCheckGroups = Array.from( columnsSet );
			columns = columns.concat(optionsCheckGroups);
		}
		return obj.apply(keys, query, columns, results, APPLY, groupSplit);
	}

	public static querySComparator(obj: any, query: any, not: boolean): Promise<any> {
		let keys = Object.keys(query);
		if(keys.length !== 1) {
			return Promise.reject(new InsightError("more than one string comparator"));
		}
		let value = query[keys[0]];
		let split = keys[0].split("_", 2);
		let datasetName = split[0];
		let	field: string = split[1];
		if (typeof value !== "string" ||  !InsightFacade.FIELDS.includes(field)) {
			return Promise.reject(new InsightError("invalid string comparator field"));
		}
		if (InsightFacade.CONVERT_FIELDS.has(field)) {
			field = InsightFacade.CONVERT_FIELDS.get(field)!;
		}
		let dataset = obj.getDataset(datasetName);
		let retval = new Set();
		if (dataset) {
			if (NeedsThis.getDatasetKind(datasetName, obj.data) === "rooms") {
				field = keys[0];
			}
			dataset.forEach((row: any) => {
				if (value.includes("*")) {
					Utils.regexEquals(not, row, field, value, retval);
				} else {
					Utils.fieldEquals(not, row, field, value, retval);
				}
			});
			return Promise.resolve([retval, datasetName]);
		} else{
			return Promise.reject(new InsightError("dataset doesnt exist"));
		}
	}

	public static queryComparator(obj: any, query: any, comparator: any, not: boolean){
		let FIELDS = ["Avg" , "Pass" , "Fail" , "Audit" , "Year", "Lat" , "Lon" , "Seats"];
		let keys = Object.keys(query);
		if(keys.length !== 1) {
			return Promise.reject(new InsightError("more than one number comparator"));
		}
		let value = query[keys[0]];
		let split = keys[0].split("_", 2);
		let datasetName = split[0];

		let	field: string =  split[1][0].toUpperCase() + split[1].substring(1);
		if (typeof value !== "number" || !FIELDS.includes(field)) {
			return Promise.reject(new InsightError("invalid comparator field"));
		}
		let dataset = obj.getDataset(datasetName);
		if (dataset) {
			if (NeedsThis.getDatasetKind(datasetName, obj.data) === "rooms") {
				field = keys[0];
			}
			let retval = new Set();
			dataset.forEach((row: any) => {

				if (not) {
					if (!comparator(row[field], value)) {
						retval.add(row);
					}
				} else if (comparator(row[field], value)) {
					retval.add(row);
				}

			});
			return Promise.resolve([retval, datasetName]);
		} else {
			return Promise.reject(new InsightError("dataset doesnt exist"));
		}
	}

	public static queryLogic(obj: any, query: any, logic: (a: any, b: any) => any, not: boolean): Promise<any>{
		let keys = Object.keys(query);
		if(keys.length < 2) {
			return Promise.reject(new InsightError("more than one logic query"));
		}
		let promises: any[] = [];
		keys.forEach((key) => {
			promises.push(new Promise((resolve, reject) => {
				resolve(obj.nextQuery(query[key], not));
				reject((err: any)=> {
					return err;
				});
			}));
		});

		return Promise.all(promises).then(async (sets) => {
			let currentSet = sets[0];
			for (let i = 1; i < sets.length; i++) {
				if (currentSet[1] !== sets[i][1]) {
					return Promise.reject(new InsightError("More than one dataset referenced"));
				}
				await logic(currentSet, sets[i]).then((value: any) => {
					currentSet = [value, currentSet[1]];
				});
			}
			return Promise.resolve(currentSet);
		});
	}

	public static checkValidColumns(validColumns: any, field: any){
		if (validColumns !== undefined && !validColumns!.includes(field)) {
			let sCheck = field.split("_")[1];
			let temp1 = InsightFacade.CONVERT_FIELDS.get(sCheck);
			if(!(sCheck !== undefined && validColumns!.includes(temp1))){
				return true;	// return true if invlid columns
			}
		}
		return false;
	}

	public static checkValidOrder(query: any, columns: any){
		let orderField: any[string] = query["ORDER"]["keys"];
		let dir = query["ORDER"]["dir"];
		if (orderField === undefined || dir === undefined){
			return 1;
		}
		for(let field of orderField) {
			if (!columns.includes(field)) {
				return 2;
			}
		}
		return 0;
	}

	public static convertCoursesField3(results: any, temp: any, obj: any) {
		if (NeedsThis.getDatasetKind(results[1], obj.data) === InsightDatasetKind.Courses &&
			results[3] === undefined) {
			if (temp.split("_")[1] !== undefined) {
				temp = temp.split("_")[1];

				if (InsightFacade.CONVERT_FIELDS.has(temp)) {
					temp = InsightFacade.CONVERT_FIELDS.get(temp);
				}
				if (temp !== "id") {
					temp = temp[0].toUpperCase() + temp.substring(1);
				}
			}
		}
		return temp;
	}

	public static checkOrder(query: any, columns: any){
		if (typeof query["ORDER"] === "string") {
			if (!columns.includes(query["ORDER"])){
				return false;
			}
		} else if (NeedsThis.checkValidOrder(query, columns) === 1) {
			return false;
		} else if (NeedsThis.checkValidOrder(query, columns) === 2) {
			return false;
		}
		return true;
	}
}

export function checkValidZip(zip: JSZip){
	if (zip === undefined || zip === null){
		return false;
	}
	return true;
}
