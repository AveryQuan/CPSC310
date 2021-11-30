import Decimal from "decimal.js";
import InsightFacade from "./InsightFacade";
import {InsightError} from "./IInsightFacade";

export class C2Query{
	public static sum(rows: [any], field: string){
		let sum = new Decimal(0);
		rows.forEach((row) => {
			sum.add(new Decimal(row[field]));
		});
		return Number(sum.toFixed(2));
	}

	public static avg(rows: [any], field: string){
		let avg: number = C2Query.sum(rows,field) / rows.length;
		return Number(avg.toFixed(2));
	}

	public static max(rows: [any], field: string) {
		let maximum = Number.MIN_VALUE;
		rows.forEach((row) => {
			if (row[field] > maximum) {
				maximum = row[field];
			}
		});
		return maximum;
	}

	public static min(rows: [any], field: string) {
		let minimum = Number.MAX_VALUE;
		rows.forEach((row) => {
			if (row[field] > minimum) {
				minimum = row[field];
			}
		});
		return minimum;
	}

	public static count(rows: [any], field: string) {
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

	// takes set of rows and groups by list of keys, returns map[key values, list of rows]
	public static group(results: any, keys: any) {
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

	public static sort(array: any, sortKeys: any, direction: any){
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

	public static order(results: any, query: any, columns: any) {
		let orderField: string = query["keys"];
		let dir = query["dir"];
		if (orderField === undefined || dir === undefined){
			return Promise.reject(new InsightError("order fields missing"));
		}
		if (!columns.includes(orderField)) {
			return Promise.reject(new InsightError("order field not in columns"));
		}
		const orderConvert = new Map([["UP",C2Query.up], ["DOWN", C2Query.down]]);
		if (Object.keys(query) !== ["dir", "keys"]) {
			throw new InsightError("invalid order");
		}
		C2Query.sort(results[0], query["keys"], orderConvert.get(query["dir"]));
	}

	public static options(results: any, query: any): Promise<never> | Promise<any[]> {
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
				C2Query.order([retval, results[1]], query["ORDER"], columns) ;
				if (keys.includes("TRANSFORMATIONS")) {
					return C2Query.transformations([retval, results[1]], query["TRANSFORMATIONS"])!;
				}
			}
		} else {
			return Promise.reject(new InsightError("Columns missing from options"));
		}
		return Promise.resolve(retval);
	}

	public static transformations(results: any, query: any) {
		const APPLY = new Map([["MAX" , C2Query.max],["MIN" , C2Query.min],
			["AVG" , C2Query.avg], [ "COUNT" , C2Query.count],[ "SUM", C2Query.sum]]);
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
		results[0] = C2Query.group(results[0], groupSplit[1]); // results[0] is now a map instead of a list
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

	public static up(a: any, b: any) {
		return (a === b) ? -1 : a > b;
	}

	public static down(a: any, b: any) {
		return (a === b) ? -1 : a < b;
	}
}

