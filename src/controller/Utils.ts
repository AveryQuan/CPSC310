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
}
