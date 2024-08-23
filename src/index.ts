import type { Application, RequestHandler } from "express";

const httpMethods: HTTPMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

const setupRouter = (app: Application, specs: RouteSpec, baseRoute = "/") => {

	const {
		routes,
		middlewares,
		methods
	} = Object
		.keys(specs)
		.reduce<SpecKeyGroup>((obj, key) => {
			if (key === "/") {
				const message = `Empty routes ("/") not allowed. Place the handlers in the root object.`;
				throw new Error(message);
			}

			if (key.startsWith("/")) {
				obj.routes.push(key as PathDefinition);
			} else if (key === "use" || key === "pre") {
				obj.middlewares.push(key);
			} else if (httpMethods.includes(key as HTTPMethod)) {
				obj.methods.push(key as HTTPMethod);
			} else {
				throw new Error(`Invalid key: ${key}`);
			}

			return obj;
		}, {
			routes: [],
			middlewares: [],
			methods: [],
		});

	for (const mid of middlewares) {
		const type = getTypeOf(specs[mid]!);
		switch (type) {
			case "array":
			case "function":
				if (baseRoute === "/") {
					app.use(specs[mid]!);
				} else {
					app.use(baseRoute, specs[mid]!);
				}
				break;
			default:
				throw new Error(`Invalid handler: ${specs[mid]}`);
		}
	}

	for (const method of methods) {
		const type = getTypeOf(specs[method]!);
		switch (type) {
			case "array":
			case "function":
				const expressMethod = method.toLowerCase() as ExpressMethod;
				app[expressMethod](baseRoute, specs[method]!);
				break;
			default:
				throw new Error(`Invalid handler: ${specs[method]}`);
		}
	}

	for (const route of routes) {
		const type = getTypeOf(specs[route]!);
		const compositeRoute = (baseRoute + route).replace("\/\/", "\/");
		switch (type) {
			case "array":
			case "function":
				app.get(compositeRoute, specs[route] as HandlerOptions);
				break;
			case "object":
				setupRouter(app, specs[route] as RouteSpec, compositeRoute);
				break;
			default:
				throw new Error(`Invalid handler: ${compositeRoute}`);
		}
	}

};

function getTypeOf(spec: HandlerOptions | RouteSpec) {
	if (Array.isArray(spec)) {
		return "array";
	}
	if (typeof spec === "function") {
		return "function";
	}
	return "object";
}

export { setupRouter };

export type RouteSpec = {
	use?: HandlerOptions;
	pre?: HandlerOptions;
	GET?: HandlerOptions;
	POST?: HandlerOptions;
	PUT?: HandlerOptions;
	PATCH?: HandlerOptions;
	DELETE?: HandlerOptions;
	[path: PathDefinition]: HandlerOptions | RouteSpec;
};

type PathDefinition = `/${string}`;
type MiddlewareKey = "pre" | "use";
type HTTPMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type ExpressMethod = "get" | "post" | "put" | "patch" | "delete";
type SpecKeyGroup = {
	routes: PathDefinition[],
	middlewares: MiddlewareKey[],
	methods: HTTPMethod[],
};
type HandlerOptions = RequestHandler | RequestHandler[];