import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";


/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	constructor() {
		console.trace("InsightFacadeImpl::init()");
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		return Promise.reject("Not implemented.");
	}

	public removeDataset(id: string): Promise<string> {
		return Promise.reject("Not implemented.");
	}

	private static intersection(setA: any, setB: any) {
		let intersect = new Set();
		setB.forEach((elem: unknown) => {
			// console.log(elem + " " + setA.has(elem));
			if (setA.has(elem)) {
				intersect.add(elem);
			}
		});

		return intersect;
	}

	private static union(setA: any, setB: any) {
		let retval = new Set(setA);
		setB.forEach((elem: unknown) => {
			retval.add(elem);
		});
		return retval;
	}

	private static equals(num: number, dataset: any, field: string) {
		if (!(typeof num === "number")){
			return Promise.reject("Must use a number for EQ");
		}

		let retval = new Set();
		dataset.forEach((elem: any) => {
			if (num === elem[field]) {	// THIS IS DEPENDENT ON HOW THE DATASETS ARE STORED
				retval.add(elem);
			}
		});

		return Promise.resolve([retval, dataset]);
	}

	private static greaterThan(num: number, dataset: any, field: string) {
		if (!(typeof num === "number")){
			return Promise.reject("Must use a number for GT");
		}
		dataset = InsightFacade.getDataset(dataset);

		let retval = new Set();
		dataset.forEach((elem: any) => {
			if (num < elem[field]) {	// THIS IS DEPENDENT ON HOW THE DATASETS ARE STORED
				retval.add(elem);
			}
		});

		return Promise.resolve([retval, dataset]);
	}

	private static lessThan(num: number, dataset: any, field: string) {
		if (!(typeof num === "number")){
			return Promise.reject("Must use a number for LT");
		}
		dataset = InsightFacade.getDataset(dataset);
		let retval = new Set();
		dataset.forEach((elem: any) => {
			if (num > elem[field]) {	// THIS IS DEPENDENT ON HOW THE DATASETS ARE STORED
				retval.add(elem);
			}
		});

		return Promise.resolve([retval, dataset]);
	}

	private queryComparator(query: any, logic: (num: number, dataset: any, field: string) => (Promise<any[]>)){
		let FIELDS = ["avg" , "pass" , "fail" , "audit" , "year"];
		let keys = Object.keys(query);
		if(keys.length !== 1) {
			return Promise.reject("more than one number comparator");
		}
		let value = query[keys[0]];
		let split = keys[0].split("_", 1);
		let dataset = split[0];
		let	field: string = split[1];

		if (typeof value !== "number" || InsightFacade.doesntExist(dataset) || !FIELDS.includes(field)) {
			return Promise.reject("invalid comparator field");
		}
		return Promise.resolve([logic(value, dataset, field), dataset]);
	}

	private querySComparator(query: any): Promise<any> {
		let FIELDS = ["dept" , "id" , "instructor" , "title" , "uuid"];
		let keys = Object.keys(query);
		if(keys.length !== 1) {
			return Promise.reject("more than one string comparator");
		}
		let value = query[keys[0]];
		let split = keys[0].split("_", 1);
		let dataset = split[0];
		let	field: string = split[1];

		if (typeof value !== "number" || InsightFacade.doesntExist(dataset) || !FIELDS.includes(field)) {
			return Promise.reject("invalid string comparator field");
		}
		return Promise.resolve([ dataset]);
	}

	private queryLogic(query: any, logic: (a: any, b: any) => any): Promise<any>{
		let keys = Object.keys(query);
		if(keys.length !== 2) {
			return Promise.reject("more than one logic query");
		}
		return this.nextQuery(keys[0]).then((set1) => {
			return this.nextQuery(keys[1]).then((set2) => {
				if (set1[1] !== set2[1]) {	// Checking database names
					return Promise.reject("More than one dataset referenced");
				}
				return Promise.resolve(logic(set1, set2));
			});
		});

		return Promise.reject("dasfa Json");
	}

	private nextQuery(query: any): Promise<any>{
		let keys = Object.keys(query);
		if(keys.length !== 1) {
			return Promise.reject("Invalid Json");
		}
		let key = keys[0];
		switch (key) {
		case "AND": {
			return this.queryLogic(query[key], InsightFacade.intersection);

			break;
		}
		case "OR": {
			return this.queryLogic(query[key],InsightFacade.union);
			break;
		}
		case "EQ": {
			return this.queryComparator(query[key], InsightFacade.equals);
			break;
		}
		case "GT": {
			return this.queryComparator(query[key], InsightFacade.greaterThan);
			break;
		}
		case "LT": {
			return this.queryComparator(query[key], InsightFacade.lessThan);
			break;
		}
		case "NOT": {
			return this.queryNot(query[key]);
			break;
		}
		case "IS": {
			return this.querySComparator(query[key]);
			break;
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
		return Promise.reject("Not implemented.");
	}

	private static getDataset(dataset: any) {
		return Promise.reject("Not implemented.");
	}

	private static doesntExist(dataset: string) {
		return undefined;
	}

	private queryNot(queryElement: any) {
		return Promise.resolve(undefined);
	}
}
