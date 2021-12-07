import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	NotFoundError,
	ResultTooLargeError
} from "./IInsightFacade";
import JSZip = require("jszip");
import {Utils, EnumDataItem} from "./Utils";
import {checkFormat, combineBuffer, fm} from "./UtilsFunctions";
import parse5 = require("parse5");
import {NeedsThis, checkValidZip} from "./NeedsThis";
import * as _ from "fs-extra";

export default class InsightFacade implements IInsightFacade {
	public data: Map<string, any[]> = new Map();
	public static FIELDS = ["dept" , "id" , "instructor" , "title" , "uuid", "fullname","shortname",
		"number", "name", "address", "lat",	 "lon",	 "seats", "type", "furniture", "href", "pass", "fail", "audit",
		"year"];

	public static CONVERT_FIELDS = new Map<string, string>(
		[["dept", "Subject"],["id", "Course"],["uuid", "id"],["instructor", "Professor"]]);

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		let arr: any[] = [];
		let promises: any[] = [];
		let total: number = 0;
		let buildings: parse5.Document;
		if (!checkFormat(id) || _.existsSync("./data/" + id + ".json")) {
			return Promise.reject(new InsightError(" Invalid ID"));
		}
		let zip = await JSZip.loadAsync(content, {base64: true});
		_.ensureDirSync("./data/");
		return new Promise<string[]>((resolve, reject) => {
			if (kind === InsightDatasetKind.Courses && Utils.datasetValid(zip, kind) && checkValidZip(zip)){
				zip.folder("courses")?.forEach((relativePath: string, file: JSZip.JSZipObject) => {
					promises.push(zip.folder("courses")?.file(relativePath)?.async("string").then((result: string) => {
						let item = new EnumDataItem(result);
						if (item.data){
							arr.push(item.data);
							total = total + item.numRows;
						}
					}));
				});
				Promise.all(promises).then(async (value: any[]) => {
					if (arr.length === 0){
						reject(new InsightError(" courses - No valid files"));
					} else {
						this.saveMemDisk(id, await fm(id, total, arr));
						resolve([id]);
					}
				});
			} else if (kind === InsightDatasetKind.Rooms && Utils.datasetValid(zip, kind) && checkValidZip(zip)) {
				promises.push(zip.folder("rooms")?.file("index.htm")?.async("string").then((result: string) => {
					buildings = parse5.parse(result);
				}));
				zip.folder("rooms/campus/discover/buildings-and-classrooms")?.forEach((path, file) => {
					promises.push(zip.file(file.name)?.async("string").then((buff: string) => {
						arr.push(parse5.parse(buff));
					}));
				});
				Promise.all(promises).then(async (value: any[]) => {
					this.saveMemDisk(id, await combineBuffer(buildings, arr, id));
					resolve([id]);
				});
			} else {
				reject(new InsightError(" Invalid zipfile format for dataset kind"));
			}
		}).catch(() => {
			return Promise.reject(new InsightError(" Parse failed for zipfile"));
		});
	}

	public removeDataset(id: string): Promise<string> {
		if (!checkFormat(id)) {
			return Promise.reject(new InsightError(" Invalid ID -- has dashes or spaces"));
		} else if (!_.existsSync("./data/" + id + ".json")) {
			return Promise.reject(new NotFoundError(" No dataset found with ID given"));
		}
		try {
			let files = _.readdirSync("./data/");
			files.forEach((element: any) => {
				if (element.toString().split(".")[0] === id) {
					_.removeSync("./data/" + id + ".json");
				}
			});
		} catch (e) {
			return Promise.reject(new InsightError(" Removed failed"));
		}
		return Promise.resolve(id);
	}

	private saveMemDisk(id: string, val: any){
		_.writeJSONSync("./data/" + id + ".json", val ,{flag: "w+"});
		this.data.set(id, [val.mode, val.arr]);
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
				return NeedsThis.queryLogic(this, query[keys[0]], Utils.intersection, not);
			}
			case "OR": {
				return NeedsThis.queryLogic(this, query[keys[0]], Utils.union, not);
			}
			case "EQ": {
				return NeedsThis.queryComparator(this, query[key], Utils.equals, not);
			}
			case "GT": {
				return NeedsThis.queryComparator(this, query[key], Utils.greaterThan, not);
			}
			case "LT": {
				return NeedsThis.queryComparator(this, query[key], Utils.lessThan, not);
			}
			case "NOT": {
				return NeedsThis.queryNot(query[key], not, this);
			}
			case "IS": {
				return NeedsThis.querySComparator(this, query[key], not);
			}
			default: {
				return Promise.reject(new InsightError("Invalid Json"));
			}
		}
	}

	private options(results: any, query: any): Promise<Array<{ result: any[] }>> {
		if (results[0].size > 5000) {
			return Promise.reject(new ResultTooLargeError("too many results"));
		}
		let keys = Object.keys(query);
		for(let k of keys) {
			if (!["COLUMNS", "ORDER"].includes(k)) {
				return Promise.reject(new InsightError("Invalid field in options"));
			}
		}
		let validColumns: [any] | undefined;
		let retval: any[] = [];
		if (keys.includes("COLUMNS")) {
			let columns = query["COLUMNS"];
			if (results[2] !== undefined){
				validColumns = results[2];
				if (validColumns!.length !== new Set(validColumns).size) {
					return Promise.reject(new InsightError("Apply keys need unique names"));
				}
			}
			if (!columns) {
				return Promise.reject(new InsightError("columns empty"));
			}
			for(let row of results[0]){
				let newRow: { [key: string]: any } = {};
				for(let field of columns) {
					let fieldSplit = field.split("_",2);
					if (fieldSplit[0] !== results[1] &&  !columns.includes(fieldSplit[0])) {
						return Promise.reject(new InsightError("Columns refers to wrong dataset"));
					}
					if(NeedsThis.checkValidColumns(validColumns, field)){
						return Promise.reject(new InsightError("invalid column"));
					}
					let temp = field;
					temp = NeedsThis.convertCoursesField3(results, temp, this);
					newRow[field] = row[temp];
				}
				retval.push(newRow);
			}
			if (keys.includes("ORDER")) {
				if (!NeedsThis.checkOrder(query, columns)) {
					return Promise.reject(new InsightError("order fields missing or not in columns"));
				}
				NeedsThis.order([retval, results[1]], query["ORDER"]) ;
			}
		} else {
			return Promise.reject(new InsightError("Columns missing from options"));
		}
		return Promise.resolve(retval);
	}

	public apply(keys: string[], query: any, columns: string[], results: any, APPLY: any , groupSplit: any) {
		if (keys.includes("APPLY")) {
			if (keys.length > 2) {
				return Promise.reject(new InsightError(keys + " contains an invalid key"));
			}
			let apply = query["APPLY"];
			if (Object.keys(apply).length === 0) {
				return Promise.reject(new InsightError("must have a field for apply"));
			}
			let fields = Object.keys(apply);
			let funcs: any[] = [];
			for (let fieldIndex of fields) {
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
				funcs.push([fieldName, apply[fieldIndex][fieldName][operation], APPLY.get(operation)!]);
			}
			let groups = Array.from(results[0].keys());
			let groupFields = query["GROUP"];
			let result: any[] = [];
			for (let group of groups) {
				let temp: any[any] = {};
				NeedsThis.convertCourseField2(this, groupFields, groupSplit, temp, results, group);
				for (let func of funcs) {
					if (typeof results[0].get(group)[0][func[1]] === "string" && func[2].name !== "count") {
						return Promise.reject(new InsightError("only count can be used for string fields"));
					}
					NeedsThis.convertCoursesField(this, groupSplit, func);
					temp[func[0]] = func[2](results[0].get(group), func[1]);
				}
				result.push(temp);
			}
			results[0] = result;
			results.push(columns);
			results.push(true);	// means there was apply
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
					return NeedsThis.transformations(this, queryResults, query["TRANSFORMATIONS"])
						.then((results: any) => {
							return this.options(results, query["OPTIONS"]);
						});
				} else {
					return this.options(queryResults, query["OPTIONS"]);
				}
			}).catch((err)=> {
				if (err instanceof ResultTooLargeError){
					return Promise.reject(err);
				}
				return Promise.reject(new InsightError(err["message"]));
			});
		}
	}

	public listDatasets(): Promise<InsightDataset[]> {
		let list: InsightDataset[] = [];
		try {
			let dir = _.readdirSync("./data/");
			dir.forEach((element: any) => {
				if (element.toString().split(".")[1] === "json" && checkFormat(element.toString().split(".")[0])) {
					let file = JSON.parse(_.readFileSync("./data/" + element, "utf8"));
					if(file.mode){
						let item: InsightDataset = file.mode;
						list.push(item);
					}
				}
			});
		} catch (e) {
			return Promise.resolve(list);
		}
		return Promise.resolve(list);
	}

	private getDataset(dataset: any) {
		let temp = this.data.get(dataset);
		if (temp) {
			return temp[1];
		}
		return undefined;
	}
}
