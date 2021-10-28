import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";

export class EnumDataItem {
	public mode: InsightDataset;
	public data: string[];

	constructor(result: string, _id: string, _kind: InsightDatasetKind) {
		let buffer = JSON.parse(result);
		let count = 0;
		for (const key in buffer.result) {
			count++;
		}
		this.data = buffer;
		this.mode = {
			id: _id,
			kind: _kind,
			numRows: count
		};
	}
}
