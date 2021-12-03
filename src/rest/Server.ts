import express, {Application, Request, Response} from "express";
import * as http from "http";
import cors from "cors";
import InsightFacade from "../controller/InsightFacade";
import fs from "fs";
import {InsightDatasetKind, InsightError} from "../controller/IInsightFacade";

export default class Server {
	private readonly port: number;
	private express: Application;
	private server: http.Server | undefined;
	private insight: InsightFacade;

	constructor(port: number) {
		console.info(`Server::<init>( ${port} )`);
		this.port = port;
		this.express = express();
		this.registerMiddleware();
		this.registerRoutes();
		this.insight = new InsightFacade();


		// NOTE: you can serve static frontend files in from your express server
		// by uncommenting the line below. This makes files in ./frontend/public
		// accessible at http://localhost:<port>/
		this.express.use(express.static("./frontend/public"));
	}

	/**
	 * Starts the server. Returns a promise that resolves if success. Promises are used
	 * here because starting the server takes some time and we want to know when it
	 * is done (and if it worked).
	 *
	 * @returns {Promise<void>}
	 */
	public start(): Promise<void> {
		return new Promise((resolve, reject) => {
			console.info("Server::start() - start");
			if (this.server !== undefined) {
				console.error("Server::start() - server already listening");
				reject();
			} else {
				this.server = this.express.listen(this.port, () => {
					console.info(`Server::start() - server listening on port: ${this.port}`);
					return this.addDatasets().then(()=> {
						console.info("Datasets added ");
					});
					// resolve();
				}).on("error", (err: Error) => {
					// catches errors in server start
					console.error(`Server::start() - server ERROR: ${err.message}`);
					reject(err);
				});
			}
		});
	}

	/**
	 * Stops the server. Again returns a promise so we know when the connections have
	 * actually been fully closed and the port has been released.
	 *
	 * @returns {Promise<void>}
	 */
	public stop(): Promise<void> {
		console.info("Server::stop()");
		return new Promise((resolve, reject) => {
			if (this.server === undefined) {
				console.error("Server::stop() - ERROR: server not started");
				reject();
			} else {
				this.server.close(() => {
					console.info("Server::stop() - server closed");
					resolve();
				});
			}
		});
	}

	// Registers middleware to parse request before passing them to request handlers
	private registerMiddleware() {
		// JSON parser must be place before raw parser because of wildcard matching done by raw parser below
		this.express.use(express.json());
		this.express.use(express.raw({type: "application/*", limit: "10mb"}));

		// enable cors in request headers to allow cross-origin HTTP requests
		this.express.use(cors());
	}

	// Registers all request handlers to routes
	private registerRoutes() {
		// This is an example endpoint this you can invoke by accessing this URL in your browser:
		// http://localhost:4321/echo/hello
		// this.express.get("/echo/:msg", Server.echo);
		this.express.put("/", this.put.bind(this));
		this.express.delete("/", this.delete.bind(this));
		this.express.post("/query", this.post.bind(this));
		this.express.get("/dataset", this.get.bind(this));

		// TODO: your other endpoints should go here

	}

	private addDatasets(){
		let courses: string;
		let rooms: string;

		let filepath = "test/resources/archives/rooms.zip";
		let fileBuffer = fs.readFileSync(filepath);
		rooms = fileBuffer.toString("base64");

		filepath = "test/resources/archives/courses.zip";
		fileBuffer = fs.readFileSync(filepath);
		courses = fileBuffer.toString("base64");
		return this.insight.addDataset("courses1", courses, InsightDatasetKind.Courses).then(()=> {
			return this.insight.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
		});
	}

	private put(req: Request, res: Response) {
		try {
			console.log(`Server::put(..) - params: ${JSON.stringify(req.params)}`);
			let kind = InsightDatasetKind.Courses;
			if (req.params.kind === "rooms") {
				kind = InsightDatasetKind.Rooms;
			}
			return this.insight.addDataset(req.params.id, req.params.dataset,kind).then((response)=> {
				res.status(200).json({result: response});
			});
		} catch (err) {
			res.status(400).json({error: err});
		}
	}

	private post(req: Request, res: Response) {
		try {
			// console.log(req);
			// console.log(res);
			console.log(`Server::post(..) - body: ${JSON.stringify(req.body)}`);
			return this.insight.performQuery(req.body).then((response)=> {
				res.status(200).json({result: response});
			}).catch((err)=> {
				res.status(400).json({error: err});
				console.log(err);
			}
			);
		} catch (err) {
			res.status(400).json({error: err});
			console.log("try" + err);
		}
	}

	private get(req: Request, res: Response) {
		try {
			console.log(`Server::get(..) - params: ${JSON.stringify(req.params)}`);
			return this.insight.listDatasets().then((response)=> {
				res.status(200).json({result: response});
			});
		} catch (err) {
			console.log(err);
			res.status(400).json({error: err});
		}
	}

	private delete(req: Request, res: Response) {
		try {
			console.log(`Server::delete(..) - params: ${JSON.stringify(req.params)}`);
			return this.insight.removeDataset(req.params.id).then((response)=> {
				res.status(200).json({result: response});
			});
		} catch (err) {
			if ( err instanceof InsightError) {
				res.status(400).json({error: err});
			} else {	// else it is a notfounderror
				res.status(404).json({error: err});
			}
		}
	}

	// The next two methods handle the echo service.
	// These are almost certainly not the best place to put these, but are here for your reference.
	// By updating the Server.echo function pointer above, these methods can be easily moved.
	private static echo(req: Request, res: Response) {
		try {
			console.log(`Server::echo(..) - params: ${JSON.stringify(req.params)}`);
			const response = Server.performEcho(req.params.msg);
			res.status(200).json({result: response});
		} catch (err) {
			res.status(400).json({error: err});
		}
	}

	private static performEcho(msg: string): string {
		if (typeof msg !== "undefined" && msg !== null) {
			return `${msg}...${msg}`;
		} else {
			return "Message not provided";
		}
	}


}
