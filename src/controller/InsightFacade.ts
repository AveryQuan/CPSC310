import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import fs = require("fs");
import JSZip = require("jszip");
import { relative } from "path";
import { rejects } from "assert";
import { KeyObject } from "crypto";

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

	public performQuery(query: any): Promise<any[]> {
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

}
