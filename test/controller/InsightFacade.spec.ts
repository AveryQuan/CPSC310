import { expect } from "chai";
import InsightFacade from "../../src/controller/InsightFacade";
import {
	InsightDatasetKind,
	InsightError,
	NotFoundError,
	ResultTooLargeError
} from "../../src/controller/IInsightFacade";
import * as fs from "fs";
import * as extra from "fs-extra";

import {testFolder} from "@ubccpsc310/folder-test";


describe("InsightFacade", function () {
	// describe("list dataset", function () {
	//
	// })
	describe("Add Dataset", function () {

		let insight: InsightFacade;
		beforeEach(function () {
			extra.removeSync("./data");
			insight = new InsightFacade();
		});

		let courses2: string;
		let courses: string;
		let invalid: string;
		let courseCopy: string;
		let rooms: string;
		before(function () {
			let filepath = "test/resources/archives/rooms.zip";
			let fileBuffer = fs.readFileSync(filepath);
			// encode contents into base64
			rooms = fileBuffer.toString("base64");

			filepath = "test/resources/archives/courses2.zip";
			fileBuffer = fs.readFileSync(filepath);
			// encode contents into base64
			courses2 = fileBuffer.toString("base64");

			filepath = "test/resources/archives/courses.zip";
			fileBuffer = fs.readFileSync(filepath);
			// encode contents into base64
			courses = fileBuffer.toString("base64");

			filepath = "test/resources/archives/invalid.zip";
			fileBuffer = fs.readFileSync(filepath);
			// encode contents into base64
			invalid = fileBuffer.toString("base64");


			filepath = "test/resources/archives/coursesCopy.zip";
			fileBuffer = fs.readFileSync(filepath);
			// encode contents into base64
			courseCopy = fileBuffer.toString("base64");

		});

		it("tester", function () {
			return insight.addDataset("courses", courses, InsightDatasetKind.Courses).then((retval) => {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				console.log(insight.data.get("courses")[1][1].data["result"]);
			});
		});

		it("list no dataset", function () {
			return insight.listDatasets().then((x) => {
				expect(x).to.be.instanceof(Array);
				expect(x).to.have.length(0);
			});
		});

		it("add invalid dataset", function () {
			return insight.addDataset("invalid", invalid, InsightDatasetKind.Courses).then((msg) => {
				throw new Error(`Resolved with: ${msg}`);
			}).catch((err) => {
				expect(err).to.be.instanceof(InsightError);
				return insight.listDatasets().then((result) => {
					expect(result).to.have.length(0);
				});
			});
		});

		it("add 1 good courses dataset ", function () {
			return insight.addDataset("courses", courses, InsightDatasetKind.Courses)
				.then((x) => {
					expect(x).to.deep.equal(["courses"]);
					return insight.listDatasets().then((dataset) => {
						expect(dataset).to.deep.equal([{
							id: "courses",
							kind: InsightDatasetKind.Courses,
							numRows: 64612,
						}]);
						// return insight.performQuery(
						// 	{
						// 		WHERE: {
						// 			GT: {
						// 				courses_avg: 99
						// 			}
						// 		},
						// 		OPTIONS: {
						// 			COLUMNS: [
						// 				"courses_avg"
						// 			],
						// 			ORDER: "courses_avg"
						// 		}
						// 	}
						// ).then((result) => {
						// 	// eslint-disable-next-line max-len
						// 	expect(result).to.deep.equals([{courses_avg: 99.19}, {courses_avg: 99.78}, {courses_avg: 99.78}]);
						// });
					});
				});


		});

		it("add 2 good courses dataset ", function () {
			return insight.addDataset("courses", courses, InsightDatasetKind.Courses).then(() => {
				return insight.addDataset("coursesCopy", courseCopy, InsightDatasetKind.Courses).then(() => {
					return insight.listDatasets().then((x) => {
						expect(x).to.have.length(2);
						expect(x).to.have.deep.members([{
							id: "courses",
							kind: InsightDatasetKind.Courses,
							numRows: 64612,
						},
						{
							id: "coursesCopy",
							kind: InsightDatasetKind.Courses,
							numRows: 64612,
						}]);
					});
				});
			});

		});


		it("add 2 good courses same id should fail ", function () {
			return insight.addDataset("courses", courses, InsightDatasetKind.Courses).then(() => {
				return insight.addDataset("courses", courses, InsightDatasetKind.Courses).then((err) => {
					throw new Error(`Resolved with: ${err}`);
				}
				).catch((err) => {
					expect(err).to.be.instanceof(InsightError);
				});
			});
		});

		it("add 1 rooms dataset", function () {
			return insight.addDataset("rooms", rooms, InsightDatasetKind.Rooms)
				.then((x) => {
					expect(x).to.deep.equal(["rooms"]);
					return insight.listDatasets().then((dataset) => {
						expect(dataset).to.deep.equal([{
							id: "rooms",
							kind: InsightDatasetKind.Rooms,
						}]);
					});
				});
		});


		it("add dataset with invalid id", function () {
			return insight.addDataset("_fasfd", courses, InsightDatasetKind.Courses)
				.then((err) => {
					throw new Error(`Resolved with: ${err}`);
				})
				.catch((x) => {
					expect(x).to.be.instanceof(InsightError);
				});

		});


		// // load data
		// it("Show data", function () {
		// 	const id: string = "courses";
		// 	const content: string = datasetContents.get("courses") ?? "";
		// 	const expected: string = "courses";
		// 	insightFacade.listDatasets();
		// });


		it("add dataset and remove", function () {
			return insight.addDataset("courses", courses, InsightDatasetKind.Courses).then(() => {
				return insight.removeDataset("courses").then((x) => {
					expect(x).to.equal("courses");
					return insight.listDatasets().then((dataset) => {
						expect(dataset).to.have.length(0);
					});
				});

			});
		});

		it("remove dataset invalid id -- all spaces", function () {
			return insight.removeDataset("      ").then((err) => {
				throw new Error(`Resolved with: ${err}`);
			}
			).catch((err) => {
				expect(err).to.be.instanceof(InsightError);
				return insight.listDatasets().then((x) => {
					expect(x).to.have.length(0);
				});
			});
		});


		it("remove dataset invalid id", function () {
			return insight.removeDataset("      ").then((err) => {
				throw new Error(`Resolved with: ${err}`);
			}
			).catch((err) => {
				expect(err).to.be.instanceof(InsightError);
				return insight.listDatasets().then((x) => {
					expect(x).to.have.length(0);
				});
			});
		});

		it("remove non existent dataset", function () {
			return insight.addDataset("courses", courses, InsightDatasetKind.Courses).then(() => {
				return insight.removeDataset("1").then(
					(err) => {
						throw new Error(`Resolved with: ${err}`);
					}
				).catch((x) => {
					expect(x).to.be.instanceof(NotFoundError);

				});

			});


		});

		it("add 2 dataset and remove 1", function () {
			return insight.addDataset("courses", courses, InsightDatasetKind.Courses).then(() => {
				return insight.addDataset("coursesCopy", courseCopy, InsightDatasetKind.Courses).then(() => {
					return insight.removeDataset("courses").then(() => {

						return insight.listDatasets().then((dataset) => {
							// expect(dataset).to.deep.equal([
							//     {
							//         id: "small",
							//         kind: InsightDatasetKind.Courses,
							//         numRows: 4,
							//     }])

							// return insight.performQuery(
							// 	{
							// 		WHERE: {
							// 			OR: [
							// 				{
							// 					AND: [
							// 						{
							// 							GT: {
							// 								small_avg: 89
							// 							}
							// 						},
							// 						{
							// 							IS: {
							// 								small_dept: "anat"
							// 							}
							// 						},
							// 						{
							// 							EQ: {
							// 								small_year: 2015
							// 							}
							// 						}
							// 					]
							// 				},
							// 				{
							// 					EQ: {
							// 						small_avg: 95
							// 					}
							// 				}
							// 			]
							// 		},
							// 		OPTIONS: {
							// 			COLUMNS: [
							// 				"small_avg"
							// 			]
							// 		}
							// 	}).then((result) => {
							// 	return expect(result).to.deep.equals([
							// 		{
							// 			small_avg: 89.6

							// 		}]);


							// });
						});

					});
				});

			});
		});
	});

	describe("query Dataset", function () {
		let insight: InsightFacade;
		beforeEach(function () {
			// insight = new InsightFacade();
		});

		let courses: string;
		before(function () {
			extra.removeSync("./data");
			let filepath = "test/resources/archives/courses.zip";
			let fileBuffer = fs.readFileSync(filepath);

		// encode contents into base64
			courses = fileBuffer.toString("base64");
			insight = new InsightFacade();
			return insight.addDataset("courses", courses, InsightDatasetKind.Courses);
		});

		interface Input {
			"WHERE": JSON,
			"OPTIONS": JSON,
			"errorExpected": string,
			"with": JSON[]
		}

		type Output = any[];
		type Error = "InsightError" | "ResultTooLargeError";

		// Assert value equals expected
		function assertResult(expected: Output, actual: any): void {
			expect(actual).to.have.deep.members(expected);
		}

		// Assert actual error is of expected type
		function assertError(expected: Error, actual: any): void {
			if (expected === "InsightError") {
				expect(actual).to.be.an.instanceOf(InsightError);
			} else {
				expect(actual).to.be.an.instanceOf(ResultTooLargeError);
			}
		}

		testFolder<Input, Output, Error>(
			"query tests",             	                  // suiteName
			(input: Input): Promise<Output> => insight.performQuery(input),      // target
			"./test/resources/queries",                   // path
			{
				errorValidator(error: any): error is Error {
					return error === "InsightError" || error === "ResultTooLargeError";
				},
				assertOnError: assertError,                 // options
				assertOnResult: assertResult,
			}
		);

		testFolder<Input, Output, Error>(
			"query tests",             	                  // suiteName
			(input: Input): Promise<Output> => insight.performQuery(input),      // target
			"./test/resources/queries",                   // path
			{
				errorValidator(error: any): error is Error {
					return error === "InsightError" || error === "ResultTooLargeError";
				},
				assertOnError: assertError,                 // options
				assertOnResult: assertResult,
			}
		);

		it ("test", function (){
			return insight.performQuery({

				WHERE: {

					AND: [{

						IS: {

							rooms_furniture: "*Tables*"

						}

					}, {

						GT: {

							rooms_seats: 300

						}

					}]

				},

				OPTIONS: {

					COLUMNS: [

						"rooms_shortname",

						"maxSeats"

					],

					ORDER: {

						dir: "DOWN",

						keys: ["maxSeats"]

					}

				},

				TRANSFORMATIONS: {

					GROUP: ["rooms_shortname"],

					APPLY: [{

						maxSeats: {

							MAX: "rooms_seats"

						}

					}]

				}

			}).then((a: any) => {
				// eslint-disable-next-line max-len
				expect(a).to.deep.equal({result:[{rooms_shortname:"OSBO",maxSeats:442},{rooms_shortname:"HEBB",maxSeats:375},{rooms_shortname:"LSC",maxSeats:350}]});
			});
		});

		it("check order", function () {
			return insight.performQuery(
				{
					WHERE: {
						OR: [
							{
								AND: [
									{
										LT: {
											courses_avg: 90
										}
									},
									{
										IS: {
											courses_dept: "adhe"
										}
									}
								]
							},
							{
								EQ: {
									courses_avg: 95
								}
							}
						]
					},
					OPTIONS: {
						COLUMNS: [
							"courses_dept",
							"courses_id",
							"courses_avg"
						],
						ORDER: "courses_avg"
					}
				}
			).then((result) => {
				expect(result).to.deep.equal(
					// eslint-disable-next-line max-len
					[{courses_dept: "adhe", courses_id: "329", courses_avg: 67.5}, {
						courses_dept: "adhe",
						courses_id: "329",
						courses_avg: 67.95
					}, {courses_dept: "adhe", courses_id: "412", courses_avg: 68.29}, {
						courses_dept: "adhe",
						courses_id: "412",
						courses_avg: 68.89
					}, {courses_dept: "adhe", courses_id: "412", courses_avg: 69.96}, {
						courses_dept: "adhe",
						courses_id: "412",
						courses_avg: 70.53
					}, {courses_dept: "adhe", courses_id: "412", courses_avg: 70.53}, {
						courses_dept: "adhe",
						courses_id: "329",
						courses_avg: 70.56
					}, {courses_dept: "adhe", courses_id: "329", courses_avg: 72.29}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 72.55
					}, {courses_dept: "adhe", courses_id: "412", courses_avg: 72.63}, {
						courses_dept: "adhe",
						courses_id: "329",
						courses_avg: 72.93
					}, {courses_dept: "adhe", courses_id: "412", courses_avg: 72.96}, {
						courses_dept: "adhe",
						courses_id: "329",
						courses_avg: 73.79
					}, {courses_dept: "adhe", courses_id: "412", courses_avg: 75.43}, {
						courses_dept: "adhe",
						courses_id: "329",
						courses_avg: 75.67
					}, {courses_dept: "adhe", courses_id: "412", courses_avg: 75.68}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 75.71
					}, {courses_dept: "adhe", courses_id: "329", courses_avg: 75.91}, {
						courses_dept: "adhe",
						courses_id: "412",
						courses_avg: 76.05
					}, {courses_dept: "adhe", courses_id: "412", courses_avg: 76.17}, {
						courses_dept: "adhe",
						courses_id: "412",
						courses_avg: 76.22
					}, {courses_dept: "adhe", courses_id: "412", courses_avg: 76.35}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 76.54
					}, {courses_dept: "adhe", courses_id: "327", courses_avg: 76.59}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 76.63
					}, {courses_dept: "adhe", courses_id: "412", courses_avg: 76.74}, {
						courses_dept: "adhe",
						courses_id: "330",
						courses_avg: 77
					}, {courses_dept: "adhe", courses_id: "329", courses_avg: 77}, {
						courses_dept: "adhe",
						courses_id: "330",
						courses_avg: 77.04
					}, {courses_dept: "adhe", courses_id: "330", courses_avg: 77.07}, {
						courses_dept: "adhe",
						courses_id: "412",
						courses_avg: 77.28
					}, {courses_dept: "adhe", courses_id: "327", courses_avg: 77.42}, {
						courses_dept: "adhe",
						courses_id: "329",
						courses_avg: 77.5
					}, {courses_dept: "adhe", courses_id: "412", courses_avg: 77.54}, {
						courses_dept: "adhe",
						courses_id: "412",
						courses_avg: 77.58
					}, {courses_dept: "adhe", courses_id: "412", courses_avg: 77.58}, {
						courses_dept: "adhe",
						courses_id: "329",
						courses_avg: 77.59
					}, {courses_dept: "adhe", courses_id: "327", courses_avg: 77.74}, {
						courses_dept: "adhe",
						courses_id: "329",
						courses_avg: 77.77
					}, {courses_dept: "adhe", courses_id: "412", courses_avg: 78}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 78
					}, {courses_dept: "adhe", courses_id: "328", courses_avg: 78.09}, {
						courses_dept: "adhe",
						courses_id: "412",
						courses_avg: 78.2
					}, {courses_dept: "adhe", courses_id: "327", courses_avg: 78.21}, {
						courses_dept: "adhe",
						courses_id: "329",
						courses_avg: 78.24
					}, {courses_dept: "adhe", courses_id: "327", courses_avg: 78.41}, {
						courses_dept: "adhe",
						courses_id: "412",
						courses_avg: 78.57
					}, {courses_dept: "adhe", courses_id: "412", courses_avg: 78.77}, {
						courses_dept: "adhe",
						courses_id: "412",
						courses_avg: 78.81
					}, {courses_dept: "adhe", courses_id: "412", courses_avg: 78.81}, {
						courses_dept: "adhe",
						courses_id: "330",
						courses_avg: 78.85
					}, {courses_dept: "adhe", courses_id: "412", courses_avg: 78.9}, {
						courses_dept: "adhe",
						courses_id: "328",
						courses_avg: 78.91
					}, {courses_dept: "adhe", courses_id: "328", courses_avg: 78.91}, {
						courses_dept: "adhe",
						courses_id: "330",
						courses_avg: 78.94
					}, {courses_dept: "adhe", courses_id: "329", courses_avg: 79}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 79.04
					}, {courses_dept: "adhe", courses_id: "327", courses_avg: 79.19}, {
						courses_dept: "adhe",
						courses_id: "328",
						courses_avg: 79.33
					}, {courses_dept: "adhe", courses_id: "328", courses_avg: 79.33}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 79.47
					}, {courses_dept: "adhe", courses_id: "330", courses_avg: 79.5}, {
						courses_dept: "adhe",
						courses_id: "329",
						courses_avg: 79.83
					}, {courses_dept: "adhe", courses_id: "329", courses_avg: 79.84}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 79.88
					}, {courses_dept: "adhe", courses_id: "412", courses_avg: 80.25}, {
						courses_dept: "adhe",
						courses_id: "329",
						courses_avg: 80.33
					}, {courses_dept: "adhe", courses_id: "329", courses_avg: 80.35}, {
						courses_dept: "adhe",
						courses_id: "330",
						courses_avg: 80.4
					}, {courses_dept: "adhe", courses_id: "329", courses_avg: 80.44}, {
						courses_dept: "adhe",
						courses_id: "412",
						courses_avg: 80.55
					}, {courses_dept: "adhe", courses_id: "327", courses_avg: 80.76}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 80.86
					}, {courses_dept: "adhe", courses_id: "412", courses_avg: 81.2}, {
						courses_dept: "adhe",
						courses_id: "330",
						courses_avg: 81.4
					}, {courses_dept: "adhe", courses_id: "327", courses_avg: 81.45}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 81.45
					}, {courses_dept: "adhe", courses_id: "327", courses_avg: 81.62}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 81.67
					}, {courses_dept: "adhe", courses_id: "329", courses_avg: 81.71}, {
						courses_dept: "adhe",
						courses_id: "329",
						courses_avg: 81.71
					}, {courses_dept: "adhe", courses_id: "329", courses_avg: 81.75}, {
						courses_dept: "adhe",
						courses_id: "329",
						courses_avg: 81.85
					}, {courses_dept: "adhe", courses_id: "327", courses_avg: 81.89}, {
						courses_dept: "adhe",
						courses_id: "330",
						courses_avg: 82
					}, {courses_dept: "adhe", courses_id: "330", courses_avg: 82}, {
						courses_dept: "adhe",
						courses_id: "330",
						courses_avg: 82.25
					}, {courses_dept: "adhe", courses_id: "330", courses_avg: 82.25}, {
						courses_dept: "adhe",
						courses_id: "329",
						courses_avg: 82.49
					}, {courses_dept: "adhe", courses_id: "327", courses_avg: 82.73}, {
						courses_dept: "adhe",
						courses_id: "329",
						courses_avg: 82.76
					}, {courses_dept: "adhe", courses_id: "329", courses_avg: 82.78}, {
						courses_dept: "adhe",
						courses_id: "330",
						courses_avg: 82.79
					}, {courses_dept: "adhe", courses_id: "330", courses_avg: 82.81}, {
						courses_dept: "adhe",
						courses_id: "328",
						courses_avg: 82.82
					}, {courses_dept: "adhe", courses_id: "329", courses_avg: 82.84}, {
						courses_dept: "adhe",
						courses_id: "412",
						courses_avg: 82.9
					}, {courses_dept: "adhe", courses_id: "327", courses_avg: 82.96}, {
						courses_dept: "adhe",
						courses_id: "330",
						courses_avg: 83
					}, {courses_dept: "adhe", courses_id: "412", courses_avg: 83.02}, {
						courses_dept: "adhe",
						courses_id: "412",
						courses_avg: 83.05
					}, {courses_dept: "adhe", courses_id: "327", courses_avg: 83.07}, {
						courses_dept: "adhe",
						courses_id: "330",
						courses_avg: 83.16
					}, {courses_dept: "adhe", courses_id: "330", courses_avg: 83.29}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 83.33
					}, {courses_dept: "adhe", courses_id: "329", courses_avg: 83.34}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 83.41
					}, {courses_dept: "adhe", courses_id: "330", courses_avg: 83.45}, {
						courses_dept: "adhe",
						courses_id: "329",
						courses_avg: 83.45
					}, {courses_dept: "adhe", courses_id: "327", courses_avg: 83.47}, {
						courses_dept: "adhe",
						courses_id: "329",
						courses_avg: 83.48
					}, {courses_dept: "adhe", courses_id: "327", courses_avg: 83.57}, {
						courses_dept: "adhe",
						courses_id: "330",
						courses_avg: 83.64
					}, {courses_dept: "adhe", courses_id: "327", courses_avg: 83.66}, {
						courses_dept: "adhe",
						courses_id: "330",
						courses_avg: 83.68
					}, {courses_dept: "adhe", courses_id: "329", courses_avg: 83.69}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 83.71
					}, {courses_dept: "adhe", courses_id: "330", courses_avg: 83.74}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 83.83
					}, {courses_dept: "adhe", courses_id: "330", courses_avg: 83.87}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 83.9
					}, {courses_dept: "adhe", courses_id: "327", courses_avg: 83.91}, {
						courses_dept: "adhe",
						courses_id: "330",
						courses_avg: 83.96
					}, {courses_dept: "adhe", courses_id: "327", courses_avg: 84}, {
						courses_dept: "adhe",
						courses_id: "412",
						courses_avg: 84.04
					}, {courses_dept: "adhe", courses_id: "412", courses_avg: 84.07}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 84.14
					}, {courses_dept: "adhe", courses_id: "327", courses_avg: 84.3}, {
						courses_dept: "adhe",
						courses_id: "330",
						courses_avg: 84.42
					}, {courses_dept: "adhe", courses_id: "412", courses_avg: 84.45}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 84.52
					}, {courses_dept: "adhe", courses_id: "329", courses_avg: 84.57}, {
						courses_dept: "adhe",
						courses_id: "330",
						courses_avg: 84.71
					}, {courses_dept: "adhe", courses_id: "329", courses_avg: 84.78}, {
						courses_dept: "adhe",
						courses_id: "329",
						courses_avg: 84.83
					}, {courses_dept: "adhe", courses_id: "327", courses_avg: 84.87}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 84.9
					}, {courses_dept: "adhe", courses_id: "330", courses_avg: 85}, {
						courses_dept: "adhe",
						courses_id: "329",
						courses_avg: 85.03
					}, {courses_dept: "adhe", courses_id: "330", courses_avg: 85.04}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 85.04
					}, {courses_dept: "adhe", courses_id: "330", courses_avg: 85.06}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 85.12
					}, {courses_dept: "adhe", courses_id: "330", courses_avg: 85.14}, {
						courses_dept: "adhe",
						courses_id: "412",
						courses_avg: 85.2
					}, {courses_dept: "adhe", courses_id: "412", courses_avg: 85.2}, {
						courses_dept: "adhe",
						courses_id: "330",
						courses_avg: 85.2
					}, {courses_dept: "adhe", courses_id: "412", courses_avg: 85.29}, {
						courses_dept: "adhe",
						courses_id: "329",
						courses_avg: 85.39
					}, {courses_dept: "adhe", courses_id: "330", courses_avg: 85.41}, {
						courses_dept: "adhe",
						courses_id: "329",
						courses_avg: 85.58
					}, {courses_dept: "adhe", courses_id: "327", courses_avg: 85.6}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 85.64
					}, {courses_dept: "adhe", courses_id: "329", courses_avg: 85.7}, {
						courses_dept: "adhe",
						courses_id: "330",
						courses_avg: 85.72
					}, {courses_dept: "adhe", courses_id: "330", courses_avg: 85.78}, {
						courses_dept: "adhe",
						courses_id: "330",
						courses_avg: 85.78
					}, {courses_dept: "adhe", courses_id: "330", courses_avg: 85.8}, {
						courses_dept: "adhe",
						courses_id: "330",
						courses_avg: 85.8
					}, {courses_dept: "adhe", courses_id: "327", courses_avg: 85.81}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 85.81
					}, {courses_dept: "adhe", courses_id: "329", courses_avg: 85.86}, {
						courses_dept: "adhe",
						courses_id: "329",
						courses_avg: 86
					}, {courses_dept: "adhe", courses_id: "329", courses_avg: 86.04}, {
						courses_dept: "adhe",
						courses_id: "330",
						courses_avg: 86.13
					}, {courses_dept: "adhe", courses_id: "327", courses_avg: 86.16}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 86.17
					}, {courses_dept: "adhe", courses_id: "329", courses_avg: 86.19}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 86.2
					}, {courses_dept: "adhe", courses_id: "330", courses_avg: 86.22}, {
						courses_dept: "adhe",
						courses_id: "329",
						courses_avg: 86.24
					}, {courses_dept: "adhe", courses_id: "329", courses_avg: 86.26}, {
						courses_dept: "adhe",
						courses_id: "329",
						courses_avg: 86.26
					}, {courses_dept: "adhe", courses_id: "412", courses_avg: 86.33}, {
						courses_dept: "adhe",
						courses_id: "329",
						courses_avg: 86.44
					}, {courses_dept: "adhe", courses_id: "412", courses_avg: 86.45}, {
						courses_dept: "adhe",
						courses_id: "330",
						courses_avg: 86.5
					}, {courses_dept: "adhe", courses_id: "329", courses_avg: 86.59}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 86.59
					}, {courses_dept: "adhe", courses_id: "327", courses_avg: 86.59}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 86.59
					}, {courses_dept: "adhe", courses_id: "329", courses_avg: 86.64}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 86.65
					}, {courses_dept: "adhe", courses_id: "330", courses_avg: 86.72}, {
						courses_dept: "adhe",
						courses_id: "330",
						courses_avg: 86.78
					}, {courses_dept: "adhe", courses_id: "328", courses_avg: 87.14}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 87.15
					}, {courses_dept: "adhe", courses_id: "330", courses_avg: 87.17}, {
						courses_dept: "adhe",
						courses_id: "330",
						courses_avg: 87.37
					}, {courses_dept: "adhe", courses_id: "330", courses_avg: 87.47}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 87.5
					}, {courses_dept: "adhe", courses_id: "330", courses_avg: 87.68}, {
						courses_dept: "adhe",
						courses_id: "329",
						courses_avg: 87.71
					}, {courses_dept: "adhe", courses_id: "412", courses_avg: 87.88}, {
						courses_dept: "adhe",
						courses_id: "330",
						courses_avg: 88
					}, {courses_dept: "adhe", courses_id: "330", courses_avg: 88.03}, {
						courses_dept: "adhe",
						courses_id: "330",
						courses_avg: 88.03
					}, {courses_dept: "adhe", courses_id: "327", courses_avg: 88.23}, {
						courses_dept: "adhe",
						courses_id: "412",
						courses_avg: 88.25
					}, {courses_dept: "adhe", courses_id: "412", courses_avg: 88.25}, {
						courses_dept: "adhe",
						courses_id: "330",
						courses_avg: 88.27
					}, {courses_dept: "adhe", courses_id: "327", courses_avg: 88.53}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 88.53
					}, {courses_dept: "adhe", courses_id: "330", courses_avg: 88.56}, {
						courses_dept: "adhe",
						courses_id: "412",
						courses_avg: 88.91
					}, {courses_dept: "adhe", courses_id: "329", courses_avg: 89}, {
						courses_dept: "adhe",
						courses_id: "329",
						courses_avg: 89
					}, {courses_dept: "adhe", courses_id: "412", courses_avg: 89.08}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 89.28
					}, {courses_dept: "adhe", courses_id: "329", courses_avg: 89.3}, {
						courses_dept: "adhe",
						courses_id: "329",
						courses_avg: 89.38
					}, {courses_dept: "adhe", courses_id: "329", courses_avg: 89.38}, {
						courses_dept: "adhe",
						courses_id: "327",
						courses_avg: 89.51
					}, {courses_dept: "adhe", courses_id: "412", courses_avg: 89.55}, {
						courses_dept: "adhe",
						courses_id: "330",
						courses_avg: 89.55
					}, {courses_dept: "adhe", courses_id: "330", courses_avg: 89.74}, {
						courses_dept: "sowk",
						courses_id: "570",
						courses_avg: 95
					}, {courses_dept: "rhsc", courses_id: "501", courses_avg: 95}, {
						courses_dept: "psyc",
						courses_id: "501",
						courses_avg: 95
					}, {courses_dept: "psyc", courses_id: "501", courses_avg: 95}, {
						courses_dept: "obst",
						courses_id: "549",
						courses_avg: 95
					}, {courses_dept: "nurs", courses_id: "424", courses_avg: 95}, {
						courses_dept: "nurs",
						courses_id: "424",
						courses_avg: 95
					}, {courses_dept: "musc", courses_id: "553", courses_avg: 95}, {
						courses_dept: "musc",
						courses_id: "553",
						courses_avg: 95
					}, {courses_dept: "musc", courses_id: "553", courses_avg: 95}, {
						courses_dept: "musc",
						courses_id: "553",
						courses_avg: 95
					}, {courses_dept: "musc", courses_id: "553", courses_avg: 95}, {
						courses_dept: "musc",
						courses_id: "553",
						courses_avg: 95
					}, {courses_dept: "mtrl", courses_id: "599", courses_avg: 95}, {
						courses_dept: "mtrl",
						courses_id: "564",
						courses_avg: 95
					}, {courses_dept: "mtrl", courses_id: "564", courses_avg: 95}, {
						courses_dept: "math",
						courses_id: "532",
						courses_avg: 95
					}, {courses_dept: "math", courses_id: "532", courses_avg: 95}, {
						courses_dept: "kin",
						courses_id: "500",
						courses_avg: 95
					}, {courses_dept: "kin", courses_id: "500", courses_avg: 95}, {
						courses_dept: "kin",
						courses_id: "499",
						courses_avg: 95
					}, {courses_dept: "epse", courses_id: "682", courses_avg: 95}, {
						courses_dept: "epse",
						courses_id: "682",
						courses_avg: 95
					}, {courses_dept: "epse", courses_id: "606", courses_avg: 95}, {
						courses_dept: "edcp",
						courses_id: "473",
						courses_avg: 95
					}, {courses_dept: "edcp", courses_id: "473", courses_avg: 95}, {
						courses_dept: "econ",
						courses_id: "516",
						courses_avg: 95
					}, {courses_dept: "econ", courses_id: "516", courses_avg: 95}, {
						courses_dept: "crwr",
						courses_id: "599",
						courses_avg: 95
					}, {courses_dept: "crwr", courses_id: "599", courses_avg: 95}, {
						courses_dept: "crwr",
						courses_id: "599",
						courses_avg: 95
					}, {courses_dept: "crwr", courses_id: "599", courses_avg: 95}, {
						courses_dept: "crwr",
						courses_id: "599",
						courses_avg: 95
					}, {courses_dept: "crwr", courses_id: "599", courses_avg: 95}, {
						courses_dept: "crwr",
						courses_id: "599",
						courses_avg: 95
					}, {courses_dept: "cpsc", courses_id: "589", courses_avg: 95}, {
						courses_dept: "cpsc",
						courses_id: "589",
						courses_avg: 95
					}, {courses_dept: "cnps", courses_id: "535", courses_avg: 95}, {
						courses_dept: "cnps",
						courses_id: "535",
						courses_avg: 95
					}, {courses_dept: "bmeg", courses_id: "597", courses_avg: 95}, {
						courses_dept: "bmeg",
						courses_id: "597",
						courses_avg: 95
					}]
				);
			});


		});
	});


});


