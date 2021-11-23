import {InsightDataset, InsightDatasetKind} from "./IInsightFacade";
import Decimal from "decimal.js";

export class Utils {
	// Returns true if list contains correct items
	public static listFormatChecker(list: any[], required: any[], optional: any[]) {
		required.forEach((field: any) => {
			if (!list.includes(field)) {
				return false;
			}
		});
		list.forEach((thing) => {
			if (!required.includes(thing)) {
				if (!optional.includes(thing)) {
					return false;
				}
			}
		});
		return true;

	}

	public static isEqual(a: any, b: any) {
		return JSON.stringify(a) === JSON.stringify(b);
	}

	public static intersection(setA: any, setB: any) {
		let intersect = new Set();
		setB[0].forEach((elem: unknown) => {
			if (setA[0].has(elem)) {
				intersect.add(elem);
			}
		});
		return Promise.resolve(intersect);
	}

	public static union(setA: any, setB: any) {
		let retval = new Set(setA[0]);

		setB[0].forEach((elem: unknown) => {
			retval.add(elem);
		});
		return Promise.resolve(retval);
	}


	public static equals(a: number, b: number) {
		return a === b;
	}

	public static greaterThan(a: number, b: number) {
		return a > b;
	}

	public static lessThan(a: number, b: number) {
		return a < b;
	}

	public static checkDataKind(input: InsightDatasetKind) {
		if (input === InsightDatasetKind.Courses || input === InsightDatasetKind.Rooms) {
			return true;
		}
		return false;
	}

	public static regexEquals(not: boolean, row: any, field: string, value: any, retval: Set<any>) {
		let regexpNumber = new RegExp(value.split("*").join(".*"));
		if (not) {
			if (!regexpNumber.test(row[field])) {
				retval.add(row);
			}
		}else if  (regexpNumber.test(row[field])) {
			retval.add(row);
		}
	}

	public static fieldEquals(not: boolean, row: any, field: string, value: any, retval: Set<any>) {
		if (not) {
			if (row[field] !== value) {
				retval.add(row);
			}
		} else if (row[field] === value) {

			retval.add(row);
		}
	}

	// made my own sort since javascript sort sucks
	public static sort(array: any, sortKeys: any, direction: any){
		for (let i = 0; i < array.length - 1; i++) {
			for (let j = i + 1; j < array.length; j++) {
				let comparator = 0;
				sortKeys.forEach((key: any)=> {	// if elements tie, for loop will keep going through sorting keys list
					let greater = direction(array[i][key], array[j][key]);
					comparator = greater;
				});
				if (comparator > 0) {
					Utils.swap(array, i, j);
				}
			}
		}

	}

	public static swap(array: any, i: number, j: number) {
		let temp = array[i];
		array[i] = array[j];
		array[j] = temp;
	}

	// public static sort(array: any, sortKeys: any, direction: any){
	// 	array.sort((a: any, b: any) => {
	// 		sortKeys.forEach((key: any)=> {	// if elements tie, for loop will keep going through sorting keys list
	// 			let greater = direction(Number(a[key]), Number(b[key]));
	// 			if (greater !== 0) {
	// 				return greater;
	// 			}
	// 		});
	// 		return 0;
	// 	});
	// }

	public static sum(rows: [any], field: string){
		let sum = new Decimal(0);
		rows.forEach((row: { [x: string]: Decimal.Value; }) => {
			sum = new Decimal(sum.add(new Decimal(row[field])));
		});
		return Number(sum.toFixed(2));
	}

	public static avg(rows: [any], field: string){
		let avg: number = Utils.sum(rows,field) / rows.length;
		return Number(avg.toFixed(2));
	}

	public static max(rows: [any], field: string) {
		let maximum = Number.MIN_VALUE;
		rows.forEach((row: { [x: string]: number; }) => {
			if (row[field] > maximum) {
				maximum = row[field];
			}
		});
		return maximum;
	}

	public static min(rows: [any], field: string) {
		let minimum = Number.MAX_VALUE;
		rows.forEach((row: { [x: string]: number; }) => {
			if (row[field] < minimum) {
				minimum = row[field];
			}
		});
		return minimum;
	}

	public static count(rows: [any], field: string) {
		const unique: any[]  = [];
		let count = 0;
		let rowValues = Array.from(rows.values());
		rowValues.forEach((row: any)=> {
			let value: any = row[field];
			if (!unique.includes(value)) {
				unique.push(value);
				count++;
			}
		});
		return count;
	}

	public static up(a: any, b: any) {
		if (typeof a === "number") {
			return a - b;
		}
		if (a > b) {
			return 1;
		}
		return -1;
	}

	public static down(a: any, b: any) {
		if (typeof a === "number") {
			return b - a;
		}
		if (a < b) {
			return 1;
		}
		return -1;

	}
}

export class RoomData {
	public rooms_fullname: string;
	public rooms_shortname: string;
	public rooms_number: string;
	public rooms_name: string;
	public rooms_address: string;
	public rooms_lat: number;
	public rooms_lon: number;
	public rooms_seats: number;
	public rooms_type: string;
	public rooms_furniture: string;
	public rooms_href: string;


	constructor(){
		this.rooms_fullname = "";
		this.rooms_shortname = "";
		this.rooms_number = "";
		this.rooms_name = "";
		this.rooms_address = "";
		this.rooms_lat = Number.NaN;
		this.rooms_lon = Number.NaN;
		this.rooms_seats = 0;
		this.rooms_type = "";
		this.rooms_furniture = "";
		this.rooms_href = "";
	}

	public print(){
		console.log("============= room data set =============");
		console.log("rooms_fullname: " + this.rooms_fullname);
		console.log("rooms_shortname: " + this.rooms_shortname);
		console.log("rooms_number: " + this.rooms_number);
		console.log("rooms_name: " + this.rooms_name);
		console.log("rooms_address: " + this.rooms_address);
		console.log("rooms_lat: " + this.rooms_lat );
		console.log("rooms_lon: " + this.rooms_lon );
		console.log("rooms_seats: " + this.rooms_seats );
		console.log("rooms_type: " + this.rooms_type);
		console.log("rooms_furniture: " + this.rooms_furniture);
		console.log("rooms_href: " + this.rooms_href);
	}
}

export class EnumDataItem {
	public mode: InsightDataset;
	public data;

	constructor(result: string, _id: string, _kind: InsightDatasetKind) {
		let buffer = JSON.parse(result);
		let output = buffer.result;
		let count = 0;


		// let FIELDS = ["Avg" , "Pass" , "Fail" , "Audit" , "Year"];
		count = output.length;
		let prefix = "courses_";
		this.mode = {
			id: _id,
			kind: _kind,
			numRows: count
		};
		this.data = output;
	}


	public has(element: any) {
		for (const row of this.data["result"]) {
			if (row === element) {
				return true;
			}

		}
	}
}

