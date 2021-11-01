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

	// Returns true if list contains correct items
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
