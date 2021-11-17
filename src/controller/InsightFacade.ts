import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import JSZip = require("jszip");
import {Utils, EnumDataItem} from "./Utils";
import {checkCourseFormat, combineBuffer} from "./UtilsFunctions";
import parse5 = require("parse5");
import Min = Mocha.reporters.Min;
import Decimal from "decimal.js";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 */
export default class InsightFacade implements IInsightFacade {
	// [0] is InsightDataset meta data for course id
	// [1] is EnumDataItem[] => buffer for JSON data
	// [1] is any[] => buffer for JSON data
	public data: Map<string, any[]>;
	private static FIELDS = ["dept" , "id" , "instructor" , "Title" , "uuid", "fullname","shortname",
		"number", "name", "address", "lat",	 "lon",	 "seats", "type", "furniture", "href"];

	private static CONVERT_FIELDS = new Map<string, string>(
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
		}).catch((err) => {
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
		let FIELDS = ["Avg" , "Pass" , "Fail" , "Audit" , "Year"];
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
			let retval = new Set();
			dataset.forEach((elem: any) => {
				let result = elem.data["result"];
				result.forEach((row: any) => {
					if (not) {
						if (!comparator(row[field], value)) {
							retval.add(row);
						}
					} else if (comparator(row[field], value)) {
						retval.add(row);
					}
				});

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

			dataset.forEach((elem: any) => {
				let result = elem.data["result"];
				result.forEach((row: any) => {
					if(not) {
						if (row[field] !== value) {
							retval.add(row);
						}
					} else if (row[field] === value) {

						retval.add(row);
					}
				});
			});
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
	private options(results: any, query: any): Promise<never> | Promise<any[]> {
		let keys = Object.keys(query);
		keys.forEach((k) => {
			if (!["COLUMNS", "ORDER"].includes(k)) {
				return Promise.reject(new InsightError("Invalid field in options"));
			}
		});
		let retval: any[] = [];
		if (keys.includes("COLUMNS")) {
			let columns = query["COLUMNS"];
			if (!columns) {
				return Promise.reject(new InsightError("columns empty"));
			}
			results[0].forEach((row: any) => {
				let newRow: { [key: string]: any } = {};
				columns.forEach((field: string) => {
					let fieldSplit = field.split("_",2);
					if (fieldSplit[0] !== results[1]) {
						return Promise.reject(new InsightError("Columns refers to wrong dataset"));
					}
					let specField: string;
					if (InsightFacade.CONVERT_FIELDS.has(fieldSplit[1]) ) {
						specField = InsightFacade.CONVERT_FIELDS.get(fieldSplit[1])!;
					} else {
						specField = fieldSplit[1];
					}
					if (specField !== "id") {
						specField =  specField[0].toUpperCase() + specField.substring(1);
					}
					newRow[field] = row[specField];
				});
				retval.push(newRow);
			});
			if (keys.includes("ORDER")) {
				let orderField: string = query["ORDER"]["keys"];
				let dir = query["ORDER"]["dir"];
				if (orderField === undefined || dir === undefined){
					return Promise.reject(new InsightError("order fields missing"));
				}// eslint-disable-next-line max-lines
				if (!columns.includes(orderField)) {
					return Promise.reject(new InsightError("order field not in columns"));
				}
				InsightFacade.order([retval, results[1]], query["ORDER"]) ;

				if (keys.includes("TRANSFORMATIONS")) {
					return InsightFacade.transformations([retval, results[1]], query["TRANSFORMATIONS"])!;
				}
			}
		} else {
			return Promise.reject(new InsightError("Columns missing from options"));
		}
		return Promise.resolve(retval);
	}

	private static order(results: any, query: any) {
		const orderConvert = new Map([["UP",InsightFacade.up], ["DOWN", InsightFacade.down]]);
		if (Object.keys(query) !== ["dir", "keys"]) {
			throw new InsightError("invalid order");
		}
		InsightFacade.sort(results[0], query["keys"], orderConvert.get(query["dir"]));
	}

	private static up(a: any, b: any) {
		return (a === b) ? -1 : a > b;
	}

	private static down(a: any, b: any) {
		return (a === b) ? -1 : a < b;
	}

	private static sort(array: any, sortKeys: any, direction: any){
		const zeroConvert = new Map([[1,1], [0, -1]]);
		array.sort((a: any, b: any) => {
			sortKeys.forEach((key: any)=> {	// if elements tie, for loop will keep going through sorting keys list
				let greater = direction(a[key], b[key]);
				if (greater !== -1) {
					return zeroConvert.get(greater);
				}
			});
		});
	}


// takes set of rows and groups by list of keys, returns map[key values, list of rows]
	private static group(results: any, keys: any) {
		const groups = new Map();
		results.forEach((row: any) => {
			let  temp = [];
			let rowValues = keys.forEach((key: any) => {
				temp.push(row[key]);
			});
			if (!groups.has(rowValues)){
				groups.set(rowValues, []);
			}
			groups.get(rowValues).push(row);
		});
		return groups;
	}

	private static sum(rows: [any], field: string){
		let sum = new Decimal(0);
		rows.forEach((row) => {
			sum.add(new Decimal(row[field]));
		});
		return Number(sum.toFixed(2));
	}

	private static avg(rows: [any], field: string){
		let avg: number = InsightFacade.sum(rows,field) / rows.length;
		return Number(avg.toFixed(2));
	}

	private static max(rows: [any], field: string) {
		let maximum = Number.MIN_VALUE;
		rows.forEach((row) => {
			if (row[field] > maximum) {
				maximum = row[field];
			}
		});
		return maximum;
	}

	private static min(rows: [any], field: string) {
		let minimum = Number.MAX_VALUE;
		rows.forEach((row) => {
			if (row[field] > minimum) {
				minimum = row[field];
			}
		});
		return minimum;
	}

	private static count(rows: [any], field: string) {
		const unique: any[]  = [];
		let count = 0;
		rows.forEach((row: any)=> {
			let value: any = row[field];
			if (!unique.includes(value)) {
				unique.push(value);
				count++;
			}
		});
		return count;
	}

	private static transformations(results: any, query: any) {
		const APPLY = new Map([["MAX" , InsightFacade.max],["MIN" , InsightFacade.min],
			["AVG" , InsightFacade.avg], [ "COUNT" , InsightFacade.count],[ "SUM", InsightFacade.sum]]);
		let keys = Object.keys(query);
		if (!keys.includes("GROUP")) {
			return Promise.reject(new InsightError("Must include group"));
		}
		let groupSplit = query["GROUP"].split("_",2);	// [0] is dataset name [1] is field to group on
		if (groupSplit[0] !== results[1]) {
			return Promise.reject(new InsightError(groupSplit[0] + " refers to different dataset"));
		}
		if (InsightFacade.FIELDS.indexOf(groupSplit[1]) === -1){
			return Promise.reject(new InsightError(groupSplit[1] + " is invalid group field"));
		}
		results[0] = InsightFacade.group(results[0], groupSplit[1]); // results[0] is now a map instead of a list
		if (keys.includes("APPLY")){
			if (keys.length > 2) {
				return Promise.reject(new InsightError(keys + " contains an invalid key"));
			}
			let apply = query["APPLY"];
			if (Object.keys(apply).length === 0) {
				return Promise.reject(new InsightError("must have a field for apply"));
			}
			let fieldName = Object.keys(apply)[0];
			let applyToken = apply[fieldName];

			let applyTokenValueSplit = apply[fieldName][applyToken].split("_", 2);
			// TODO check applyTokenValue is a valid room field, wait for yvonne to add rooms
			if (applyTokenValueSplit[0] !== results[1]) {
				return Promise.reject(new InsightError(applyTokenValueSplit[0] + "refers to different dataset"));
			}
			if (!APPLY.has(applyToken)) {
				return Promise.reject(new InsightError(applyToken + "is an invalid apply field"));
			}
			let func = APPLY.get(applyToken)!;
			let groups = results[0].keys();
			let result: any[] = [];
			let groupName: string = groupSplit[1];
			groups.forEach((group: any)=> {
				result.push(new Set([[groupName, group], [fieldName, func(results[0], applyTokenValueSplit[1])]]));
			});
			return Promise.resolve(result);

		} else if (keys.length > 1) {
			return Promise.reject(new InsightError(keys + " contains an invalid key"));
		}
	}

	public performQuery(query: any): Promise<any[]> {
		if(typeof query !== "object" ||
			!Utils.listFormatChecker(Object.keys(query), ["WHERE", "OPTIONS"], ["TRANSFORMATIONS"])) {
			return Promise.reject(new InsightError("invalid query"));
		} else {
			return this.nextQuery(query["WHERE"], false).then((queryResults) => {
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
