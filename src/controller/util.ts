
// Returns false if input is invalid
export function checkCourseFormat(input: string): boolean {
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

export function checkRoomFormat(input: string): boolean {
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

export function intersection(setA: any, setB: any) {
	let intersect = new Set();
	setB.forEach((elem: unknown) => {
		if (setA.has(elem)) {
			intersect.add(elem);
		}
	});

	return intersect;
}

export function union(setA: any, setB: any) {
	let retval = new Set(setA);
	setB.forEach((elem: unknown) => {
		retval.add(elem);
	});
	return retval;
}
