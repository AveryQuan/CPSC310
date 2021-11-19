let arr = [1,2,3];
const zeroConvert = new Map([[true,1], [false, -1]]);

arr.sort((a: any, b: any) => {
	let greater = b - a;

	return greater;
});

console.log(arr);


