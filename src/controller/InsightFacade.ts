import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import JSZip = require("jszip");
import {Utils, EnumDataItem} from "./Utils";
import {checkCourseFormat, combineBuffer} from "./UtilsFunctions";
import parse5 = require("parse5");
import Min = Mocha.reporters.Min;
import Decimal from "decimal.js";
import {C2Query} from "./C2Query";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 */
export default class InsightFacade implements IInsightFacade {
	// [0] is InsightDataset meta data for course id
	// [1] is EnumDataItem[] => buffer for JSON data
	// [1] is any[] => buffer for JSON data
	public data: Map<string, any[]>;
	public static FIELDS = ["dept" , "id" , "instructor" , "Title" , "uuid", "fullname","shortname",
		"number", "name", "address", "lat",	 "lon",	 "seats", "type", "furniture", "href"];

	public static CONVERT_FIELDS = new Map<string, string>(
		[["dept", "Subject"],["id", "Course"],["uuid", "id"],["instructor", "Professor"]]);


	constructor() {
		this.data = new Map();
	}


	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		let dataSet: any[] = [];
		let promises: any[] = [];
		let total = 0;
		let buildings: parse5.Document;
		if (!checkCourseFormat(id) || this.data.has(id) || !Utils.checkDataKind(kind)) {
			return Promise.reject(new InsightError("Error: Invalid ID or Dataset already has Id"));
		}
		let zip = await JSZip.loadAsync(content, {base64: true});
		if (zip === undefined || zip === null){
			return Promise.reject(new InsightError("Error: Read failed for given zipfile"));
		}
		return new Promise<string[]>((resolve, reject) => {

			if (kind === InsightDatasetKind.Courses){
				zip.forEach((relativePath: string, file: JSZip.JSZipObject) => {
					let path = relativePath.substr(id.length + 1);
					promises.push(zip.folder(id)?.file(path)?.async("string").then((result: string) => {
						let item = new EnumDataItem(result, path, kind);
						dataSet.push(item.data);
						total = total + item.mode.numRows;
					}));
				});
				Promise.all(promises).then((value: any[]) => {
					if (dataSet.length === 0){
						reject(new InsightError("Error: courses - Read invalid"));
					} else {
						dataSet.unshift({id:id, kind:kind, numRows:total});
						this.data.set(id, dataSet);
						resolve([id]);
					}
				});
			} else if (kind === InsightDatasetKind.Rooms) {
				promises.push(zip.folder("rooms")?.file("index.htm")?.async("string").then((result: string) => {
					buildings = parse5.parse(result);
				}));
				zip.folder("rooms/campus/discover/buildings-and-classrooms")?.forEach((path, file) => {
					promises.push(zip.file(file.name)?.async("string").then((buff: string) => {
						dataSet.push(parse5.parse(buff));
					}));
				});
				Promise.all(promises).then(async (value: any[]) => {
					this.data.set(id, await combineBuffer(buildings, dataSet, id, kind));
					resolve([id]);
				});
			}
		}).catch(() => {
			return Promise.reject(new InsightError("Error: Parse failed for zipfile"));
		});
	}

	public removeDataset(id: string): Promise<string> {
		if (!checkCourseFormat(id)) {
			return Promise.reject(new InsightError("Error: Invalid ID -- has dashes or spaces"));
		}
		if (!this.data.has(id)) {
			return Promise.reject(new NotFoundError("Error: No dataset found with ID given"));
		}
		this.data.forEach((value, key) => {
			if (key === id){
				this.data.delete(id);
			}
		});
		return Promise.resolve(id);
	}


	private queryComparator(query: any, comparator: any, not: boolean){
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
		let dataset = this.getDataset(datasetName);
		if (dataset) {
			if (this.getDatasetKind(datasetName) === "rooms") {
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

	private querySComparator(query: any, not: boolean): Promise<any> {
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
		let dataset = this.getDataset(datasetName);
		let retval = new Set();
		if (dataset) {

			// dataset.forEach((elem: any) => {
				// let result = elem.data["result"];
			if (this.getDatasetKind(datasetName) === "rooms") {
				field = keys[0];
			}
			dataset.forEach((row: any) => {
				if (value.includes("*")) {
					Utils.regexEquals(not, row, field, value, retval);
				} else {
					Utils.fieldEquals(not, row, field, value, retval);
				}
			});

			// });
			return Promise.resolve([retval, datasetName]);

		} else{
			return Promise.reject(new InsightError("dataset doesnt exist"));
		}
	}


	private queryLogic(query: any, logic: (a: any, b: any) => any, not: boolean): Promise<any>{
		let keys = Object.keys(query);
		if(keys.length < 2) {
			return Promise.reject(new InsightError("more than one logic query"));
		}
		let promises: any[] = [];
		keys.forEach((key) => {
			promises.push(new Promise((resolve, reject) => {
				resolve(this.nextQuery(query[key], not));
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

	private async nextQuery(query: any, not: boolean): Promise<any> {
		const map = new Map([["AND", "OR"], ["OR", "AND"]]);
		let keys = Object.keys(query);
		if (keys.length !== 1) {
			return Promise.reject(new InsightError("Invalid Json"));
		}
		let key: string | undefined = keys[0];
		if (not && map.has(key)) {
			key = map.get(key);
		}
		switch (key) {
			case "AND": {
				return this.queryLogic(query[keys[0]], Utils.intersection, not);
			}
			case "OR": {
				return this.queryLogic(query[keys[0]], Utils.union, not);
			}
			case "EQ": {
				return this.queryComparator(query[key], Utils.equals, not);
			}
			case "GT": {
				return this.queryComparator(query[key], Utils.greaterThan, not);
			}
			case "LT": {
				return this.queryComparator(query[key], Utils.lessThan, not);
			}
			case "NOT": {
				return this.queryNot(query[key], not);
			}
			case "IS": {
				return this.querySComparator(query[key], not);
			}
			default: {
				return Promise.reject(new InsightError("Invalid Json"));
			}
		}
	}

	// eslint-disable-next-line max-lines-per-function
	private options(results: any, query: any): Promise<Array<{ result: any[] }>> {
		let keys = Object.keys(query);
		keys.forEach((k) => {
			if (!["COLUMNS", "ORDER"].includes(k)) {
				return Promise.reject(new InsightError("Invalid field in options"));
			}
		});

		let retval: any[] = [];
		if (keys.includes("COLUMNS")) {
			let columns = query["COLUMNS"];
			if (results[2] !== undefined){
				columns.concat(results[2]);
			}
			if (!columns) {
				return Promise.reject(new InsightError("columns empty"));
			}
			results[0].forEach((row: any) => {
				let newRow: { [key: string]: any } = {};
				columns.forEach((field: string) => {
					let fieldSplit = field.split("_",2);
					if (fieldSplit[0] !== results[1] &&  !columns.includes(fieldSplit[0])) {
						return Promise.reject(new InsightError("Columns refers to wrong dataset"));
					}
					let specField: string;
					if (InsightFacade.CONVERT_FIELDS.has(fieldSplit[1]) ) {
						specField = InsightFacade.CONVERT_FIELDS.get(fieldSplit[1])!;
					} else if (fieldSplit[1] !== undefined) {
						specField = fieldSplit[1];
					} else {
						specField = fieldSplit[0];
					}
					if (specField !== "id" && fieldSplit[1] !== undefined) {
						specField =  specField[0].toUpperCase() + specField.substring(1);
					}
					if (this.getDatasetKind(fieldSplit[0]) === "rooms") {
						specField = field;
					}
					newRow[field] = row[specField];
				});
				retval.push(newRow);
			});
			if (keys.includes("ORDER")) {
				let orderField: any[string] = query["ORDER"]["keys"];
				let dir = query["ORDER"]["dir"];
				if (orderField === undefined || dir === undefined){
					return Promise.reject(new InsightError("order fields missing"));
				}
				orderField.forEach((field: string) =>{
					if (!columns.includes(field)) {
						return Promise.reject(new InsightError("order field not in columns"));
					}
				});
				InsightFacade.order([retval, results[1]], query["ORDER"]) ;

			}
		} else {// eslint-disable-next-line max-lines

			return Promise.reject(new InsightError("Columns missing from options"));
		}// eslint-disable-next-line max-lines
		return Promise.resolve(retval);
	}

	private static order(results: any, query: any) {
		const orderConvert = new Map([["UP",Utils.up], ["DOWN", Utils.down]]);
		if (!this.isEqual(Object.keys(query), ["dir", "keys"])) {
			throw new InsightError("invalid order");
		}// eslint-disable-next-line max-lines

		Utils.sort(results[0], query["keys"], orderConvert.get(query["dir"]));
	}

// takes set of rows and groups by list of keys, returns map[key values, list of rows]
	private static group(results: any, keys: any) {
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

	// eslint-disable-next-line max-lines-per-function
	private transformations(results: any, query: any) {
		const APPLY = new Map([["MAX" , Utils.max],["MIN" , Utils.min],
			["AVG" , Utils.avg], [ "COUNT" , Utils.count],[ "SUM", Utils.sum]]);
		let keys = Object.keys(query);
		if (!keys.includes("GROUP")) {
			return Promise.reject(new InsightError("Must include group"));
		}
		let groupSplit = query["GROUP"][0].split("_",2);	// [0] is dataset name [1] is field to group on
		if (groupSplit[0] !== results[1]) {
			return Promise.reject(new InsightError(groupSplit[0] + " refers to different dataset"));
		}
		if (this.getDatasetKind(results[1]) === "rooms") {
			if (InsightFacade.FIELDS.indexOf(groupSplit[1]) === -1){
				return Promise.reject(new InsightError(groupSplit[1] + " is invalid group field"));
			}
		} else {
			if (InsightFacade.FIELDS.indexOf(groupSplit[0]) === -1){
				return Promise.reject(new InsightError(groupSplit[0] + " is invalid group field"));
			}
		}

		if (this.getDatasetKind(groupSplit[0]) === "rooms") {
			results[0] = InsightFacade.group(results[0], query["GROUP"]);
		} else {
			results[0] = InsightFacade.group(results[0], groupSplit[1]); // results[0] is now a map instead of a list
		}
		if (keys.includes("APPLY")){
			if (keys.length > 2) {
				return Promise.reject(new InsightError(keys + " contains an invalid key"));
			}
			let apply = query["APPLY"];
			if (Object.keys(apply).length === 0) {
				return Promise.reject(new InsightError("must have a field for apply"));
			}
			let fields = Object.keys(apply);
			let funcs: any[] = [];
			let columns: string[] = [];
			fields.forEach((fieldIndex) => {
				let fieldName = Object.keys(apply[fieldIndex])[0];
				columns.push(fieldName);
				let operation = Object.keys(apply[fieldIndex][fieldName])[0];
				let applyTokenValueSplit = apply[fieldIndex][fieldName][operation].split("_", 2);
				if (applyTokenValueSplit[0] !== results[1]) {
					return Promise.reject(new InsightError(applyTokenValueSplit[0] + "refers to different dataset"));
				}

				if (!APPLY.has(operation)) {
					return Promise.reject(new InsightError(operation + "is an invalid apply field"));
				}
				funcs.push([fieldName,apply[fieldIndex][fieldName][operation],  APPLY.get(operation)!]);
			});
			let groups = Array.from(results[0].keys());
			let groupFields = query["GROUP"];
			let result: any[] = [];
			groups.forEach((group: any)=> {
				let temp: any[any] = {};
				groupFields.forEach((field: string | number)=> {
					temp[field] = results[0].get(group)[0][field];	// take any group member to get the fields
				});
				funcs.forEach((func)=> {
					temp[func[0]] =  func[2](results[0].get(group), func[1]);
				});
				result.push(temp);
			});
			results[0] = result;
			results.push(columns);
			return Promise.resolve(results);

		} else {
			return Promise.reject(new InsightError(keys + " contains an invalid key"));
		}
	}

	public performQuery(query: any): Promise<any[]> {
		if(typeof query !== "object" ||
			!Utils.listFormatChecker(Object.keys(query), ["WHERE", "OPTIONS"], ["TRANSFORMATIONS"])) {
			return Promise.reject(new InsightError("invalid query"));
		} else {
			return this.nextQuery(query["WHERE"], false).then((queryResults) => {

				if (Object.keys(query).includes("TRANSFORMATIONS")) {
					return this.transformations(queryResults, query["TRANSFORMATIONS"]).then((results) => {
						return this.options(results, query["OPTIONS"]);
					});
				}
				return this.options(queryResults, query["OPTIONS"]);
			});
		}
	}

	public listDatasets(): Promise<InsightDataset[]> {
		let list: InsightDataset[] = [];
		this.data.forEach((value, key) => {
			list.push(value[0]);
		});
		return Promise.resolve(list);
	}

	private getDataset(dataset: any) {
		let temp = this.data.get(dataset);
		if (temp) {
			return temp[1];
		}
		return undefined;
	}

	private getDatasetKind(dataset: any) {
		let temp = this.data.get(dataset);
		if (temp) {
			return temp[0]["kind"];
		}
		return undefined;
	}

	private queryNot(query: any, not: boolean){
		let keys = Object.keys(query);
		if(keys.length !== 1) {
			return Promise.reject(new InsightError("more than one query after NOT"));
		}
		return Promise.resolve(this.nextQuery(query, !not));
	}

	private static isEqual(a: any, b: any) {
		return JSON.stringify(a) === JSON.stringify(b);
	}

}
