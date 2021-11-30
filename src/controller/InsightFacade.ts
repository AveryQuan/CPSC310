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
import {checkCourseFormat, combineBuffer} from "./UtilsFunctions";
import parse5 = require("parse5");
import {NeedsThis} from "./NeedsThis";

export default class InsightFacade implements IInsightFacade {
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
				let temp: any[] = [];
				zip.forEach((relativePath: string, file: JSZip.JSZipObject) => {
					let path = relativePath.substr(id.length + 1);
					promises.push(zip.folder(id)?.file(path)?.async("string").then((result: string) => {
						let item = new EnumDataItem(result, path, kind);
						temp.push(item.data);
						total = total + item.mode.numRows;
					}));
				});
				Promise.all(promises).then((value: any[]) => {
					if (temp.length === 0){
						reject(new InsightError("Error: courses - Read invalid"));
					} else {
						this.insertCoursesDataIThink(temp, dataSet, id, kind, total, resolve);
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

	private insertCoursesDataIThink(temp: any[], dataSet: any[], id: string, kind: any, total: number, resolve: any) {
		let temp2 = Utils.getInnerElements(temp);
		dataSet.push(temp2);
		dataSet.unshift({id: id, kind: kind, numRows: total});
		this.data.set(id, dataSet);
		resolve([id]);
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
					if(this.checkValidColumns(validColumns, field)){
						return Promise.reject(new InsightError("invalid column"));
					}
					newRow[field] = row[field];
				}
				retval.push(newRow);
			}
			if (keys.includes("ORDER")) {
				if (this.checkValidOrder(query, columns) === 1) {
					return Promise.reject(new InsightError("order fields missing"));
				} else if (this.checkValidOrder(query, columns) === 2) {
					return Promise.reject(new InsightError("order field not in columns"));
				}
				NeedsThis.order([retval, results[1]], query["ORDER"]) ;
			}
		} else {
			return Promise.reject(new InsightError("Columns missing from options"));
		}
		return Promise.resolve(retval);
	}

	public checkValidOrder(query: any, columns: any){
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

	public checkValidColumns(validColumns: any, field: any){
		if (validColumns !== undefined && !validColumns!.includes(field)) {
			let sCheck = field.split("_")[1];
			let temp1 = InsightFacade.CONVERT_FIELDS.get(sCheck);
			if(!(sCheck !== undefined && validColumns!.includes(temp1))){
				return true;	// return true if invlid columns
			}
		}
		return false;
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
}
