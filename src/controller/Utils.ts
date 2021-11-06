import {InsightDataset, InsightDatasetKind} from "./IInsightFacade";

export class Utils {
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
		if (input === InsightDatasetKind.Courses || input === InsightDatasetKind.Rooms){
			return true;
		}
		return false;
	}

	public static listFormatChecker(list: any[], required: any[], optional: any[]) {
		required.forEach((field: any) => {
			if (!list.includes(field)) {
				return false;
			}
		});
		list.forEach((thing) =>{
			if (!required.includes(thing)) {
				if (!optional.includes(thing)) {
					return false;
				}
			}
		});
		return true;
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
		let count = 0;
		let val = Number.NaN;
		let FIELDS = ["Avg" , "Pass" , "Fail" , "Audit" , "Year"];
		for (const key in buffer.result) {
			if (FIELDS.includes(key)){
				val = parseInt(buffer.result[key], 10);
				buffer.result[key] = val;
				break;
			}
			count++;
		}
		this.data = buffer;
		this.mode = {
			id: _id,
			kind: _kind,
			numRows: count
		};
	}


	public has(element: any) {
		for (const row of this.data["result"]) {
			if(row === element) {
				return true;
			}

		}
	}
}


	// Returns true if list contains correct items
