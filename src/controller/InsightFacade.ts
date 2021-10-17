import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
// import fs = require("fs");
import JSZip = require("jszip");
// import { relative } from "path";
// import { rejects } from "assert";
// import { KeyObject } from "crypto";

/* class to store data */
export class EnumDataItem {
	public mode: InsightDataset;
	public data: string[];

	constructor(result: string, _id: string, _kind: InsightDatasetKind) {
		let buffer = JSON.parse(result);
		let count = 0;
		for (const key in buffer.result) {
			count++;
		}
		for (const key in buffer.rank){
			count++;
		}
		if (count === 0) {
			count = 2;
		}
		this.data = buffer;
		this.mode = {
			id: _id,
			kind: _kind,
			numRows: count
		};
	}
}

// Returns false if input is invalid
let checkFormat: (input: string) => boolean = function(input: string) {
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
};


/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	public data: Map<string, EnumDataItem[]>;
	constructor() {
		console.trace("InsightFacadeImpl::init()");
		this.data = new Map();
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		let dataSet: EnumDataItem[] = [];
		let promises: any[] = [];
		if (!checkFormat(id)) {
			return Promise.reject("Invalid ID");
		}
		let ReadPromise = new Promise<string[]>((resolve, reject) => {
			JSZip.loadAsync(content, {base64: true}).then( (zip: JSZip) => {
				zip.forEach((relativePath: string, file: JSZip.JSZipObject) => {
					let path = relativePath.substr(id.length + 1);
					promises.push(zip.folder(id)?.file(path)?.async("string").then((result: string) => {
						let item = new EnumDataItem(result, path, kind);
						dataSet.push(item);
					}));
				});
				Promise.all(promises).then((value: any[]) => {
					this.data.set(id, dataSet);
					// console.log(this.data.get(id));
					return  Promise.resolve([id]);
				});
			});
		}).catch();
		return Promise.reject("Error: Read failed");
	}

	public removeDataset(id: string): Promise<string> {
		if (!checkFormat(id)) {
			return Promise.reject("Invalid ID");
		}
		for (const [key, value] of Object.entries(this.data)){
			if (key === id){
				this.data.delete(id);
			}
		}
		return Promise.resolve(id);
	}

	private intersection(setA: any, setB: any) {
		let intersect = new Set();
		setB.forEach((elem: unknown) => {
			if (setA.has(elem)) {
				intersect.add(elem);
			}
		});

		return intersect;
	}

	private union(setA: any, setB: any) {
		let retval = new Set(setA);
		setB.forEach((elem: unknown) => {
			retval.add(elem);
		});
		return retval;
	}

	private equals(a: number, b: number) {
		return a === b;
	}

	private  greaterThan(a: number, b: number) {
		return a > b;
	}

	private lessThan(a: number, b: number) {
		return a < b;
	}

	private queryComparator(query: any, comparator: any){
		let FIELDS = ["avg" , "pass" , "fail" , "audit" , "year"];
		let keys = Object.keys(query);
		if(keys.length !== 1) {
			return Promise.reject("more than one number comparator");
		}
		let value = query[keys[0]];
		let split = keys[0].split("_", 1);
		let datasetName = split[0];

		let	field: string = split[1];
		if (typeof value !== "number" || !FIELDS.includes(field)) {
			return Promise.reject("invalid comparator field");
		}
		let dataset = this.getDataset(datasetName);
		if (dataset) {
			let retval = new Set();
			dataset.forEach((elem: any) => {
				elem.forEach((row: any) => {
					if (comparator(row[field], value)) {
						retval.add(elem);
					}
				});

			});
			return Promise.resolve([retval, datasetName]);
		} else {
			return Promise.reject("dataset doesnt exist");
		}
	}

	private querySComparator(query: any): Promise<any> {
		let FIELDS = ["dept" , "id" , "instructor" , "title" , "uuid"];
		let keys = Object.keys(query);
		if(keys.length !== 1) {
			return Promise.reject("more than one string comparator");
		}
		let value = query[keys[0]];
		let split = keys[0].split("_", 1);
		let datasetName = split[0];
		let	field: string = split[1];

		if (typeof value !== "string" ||  !FIELDS.includes(field)) {
			return Promise.reject("invalid string comparator field");
		}
		let dataset = this.getDataset(datasetName);
		let retval = new Set();
		if (dataset) {
			dataset[0].data.forEach((elem: any) => {
				elem.forEach((row: any) => {
					if(row[field] === value){
						retval.add(row);
					}
				});
			});
		} else{
			return Promise.reject("dataset doesnt exist");
		}
		return Promise.resolve([ dataset, datasetName]);
	}

	private queryLogic(query: any, logic: (a: any, b: any) => any): Promise<any>{
		let keys = Object.keys(query);
		if(keys.length !== 2) {
			return Promise.reject("more than one logic query");
		}
		return this.nextQuery(query[keys[0]]).then((set1) => {
			return this.nextQuery(query[keys[1]]).then((set2) => {
				if (set1[1] !== set2[1]) {	// Checking database names
					return Promise.reject("More than one dataset referenced");
				}
				return Promise.resolve(logic(set1, set2));
			});
		});
	}

	private nextQuery(query: any): Promise<any>{
		let keys = Object.keys(query);
		if(keys.length !== 1) {
			return Promise.reject("Invalid Json");
		}
		let key = keys[0];
		switch (key) {
		case "AND": {
			return this.queryLogic(query[key], this.intersection);
		}
		case "OR": {
			return this.queryLogic(query[key],this.union);
		}
		case "EQ": {
			return this.queryComparator(query[key], this.equals);
		}
		case "GT": {
			return this.queryComparator(query[key], this.greaterThan);
		}
		case "LT": {
			return this.queryComparator(query[key], this.lessThan);
		}
		case "NOT": {
			return this.queryNot(query[key]);
		}
		case "IS": {
			return this.querySComparator(query[key]);
		}
		default: {
			return Promise.reject("Invalid Json");
		}
		}
		return Promise.reject("Not implemented.");
	}

	private options(results: any, query: any): Promise<any> {
		let validOptions = ["COLUMNS", "ORDER"];
		let keys = Object.keys(query);

		keys.forEach(function (k) {
			if(!validOptions.includes(k)) {
				return Promise.reject("invalid query");
			}
		});
		return Promise.reject("Not implemented.");
	}

	public performQuery(query: any): Promise<any[]> {
		if(typeof query !== "object" || Object.keys(query) !== [ "WHERE", "OPTIONS" ]) {
			return Promise.reject("invalid query");
		} else {
			return this.nextQuery(query["WHERE"]).then((queryResults) => {
				return this.options(queryResults, query["OPTIONS"]);
			}).catch((err) => {
				return err;
			});
		}
		return Promise.reject("Not implemented.");
	}

	public listDatasets(): Promise<InsightDataset[]> {
		let list: InsightDataset[] = [];
		for (const [key, value] of Object.entries(this.data)){
			let arr = this.data.get(key);
			if (arr){
				for (const element of arr){
					list.push(element.mode);
				}
			}
		}
		return Promise.resolve(list);
	}

	private getDataset(dataset: any) {
		return this.data.get(dataset);
	}
	private hasDataset(dataset: string) {
		return this.data.has(dataset);
	}

	private queryNot(queryElement: any) {
		return Promise.resolve(undefined);
	}
}
