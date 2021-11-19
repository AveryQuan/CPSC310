
import Decimal from "decimal.js";

let a = new Decimal(1);
let b = new Decimal(2);
a = a.add(b);
console.log(a.add(b.toFixed(2)));
console.log(a);


