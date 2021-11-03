import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import JSZip = require("jszip");
import {Utils, EnumDataItem} from "./Utils";
import {checkCourseFormat, traverseRooms, matchRoomBuilding, combineBuffer} from "./UtilsFunctions";
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
	public data: Map<string, any[]>;
	public static FIELDS = ["dept" , "id" , "instructor" , "Title" , "uuid", "fullname","shortname",
		"number", "name", "address", "lat",	 "lon",	 "seats", "type", "furniture", "href"];

	public static CONVERT_FIELDS = new Map<string, string>(
		[["dept", "Subject"],["id", "Course"],["uuid", "id"],["instructor", "Professor"]]);

	constructor() {
		this.data = new Map();
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		let dataSet: any[] = [];
		let promises: any[] = [];
		let total = 0;
		let buildings: parse5.Document;
		if (!checkCourseFormat(id) || this.data.has(id) || !Utils.checkDataKind(kind)) {
			return Promise.reject(new InsightError("Error: courses - Invalid ID"));
		}
		return new Promise<string[]>((resolve, reject) => {
			JSZip.loadAsync(content, {base64: true}).then((zip: JSZip) => {

				if (kind === InsightDatasetKind.Courses){
					zip.forEach((relativePath: string, file: JSZip.JSZipObject) => {
						let path = relativePath.substr(id.length + 1);
						// eslint-disable-next-line max-nested-callbacks
						promises.push(zip.folder(id)?.file(path)?.async("string").then((result: string) => {
							let item = new EnumDataItem(result, path, kind);
							dataSet.push(item);
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
				} else {
					promises.push(zip.folder("rooms")?.file("index.htm")?.async("string").then((result: string) => {
						buildings = parse5.parse(result);
					}));
					zip.folder("rooms/campus/discover/buildings-and-classrooms")?.forEach((path, file) => {
						// eslint-disable-next-line max-nested-callbacks
						promises.push(zip.folder(path)?.file(file.name)?.async("string").then((buff: string) => {
							dataSet.push(parse5.parse(buff));
						}));
					});
					Promise.all(promises).then((value: any[]) => {
						this.data.set(id, combineBuffer(buildings, dataSet, id, kind));
						resolve([id]);
					});
				}
			}).catch((err) => {
				return Promise.reject(new InsightError("Error: Read courses failed"));
			});

		});
	}

	// eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
	removeDataset(id: string): Promise<string> {
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

	public performQuery(query: any): Promise<any[]> {
		if(typeof query !== "object" ||
			!Utils.listFormatChecker(Object.keys(query), ["WHERE", "OPTIONS"], ["TRANSFORMATIONS"])) {
			return Promise.reject(new InsightError("invalid query"));
		} else {
			return this.nextQuery(query["WHERE"], false).then((queryResults) => {
				return C2Query.options(queryResults, query["OPTIONS"]);
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

}
