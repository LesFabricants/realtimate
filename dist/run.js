"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const node_fs_1 = __importDefault(require("node:fs"));
const chalk_1 = __importDefault(require("chalk"));
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const mongodb_memory_server_1 = require("mongodb-memory-server");
const mongodb_1 = require("mongodb");
console.log(chalk_1.default.yellowBright("[realtimate] watching for changes..."));
const run = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const server = (0, express_1.default)();
    const port = ((_a = process.argv.find((arg) => arg.match(/--port=(\d+)/))) === null || _a === void 0 ? void 0 : _a.split("=")[1]) ||
        3000;
    const mongod = yield mongodb_memory_server_1.MongoMemoryServer.create();
    const uri = process.env.MONGODB_URI || mongod.getUri();
    const mongoClient = new mongodb_1.MongoClient(uri || "", {
        serverApi: {
            version: mongodb_1.ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        },
    });
    const root = `${process.cwd()}`;
    const apps = node_fs_1.default.readdirSync(`${root}/apps`);
    server.use(body_parser_1.default.json());
    // provide context to future functions
    const context = {
        services: {
            get: () => {
                return mongoClient;
            },
        },
    };
    for (const app of apps) {
        console.log(chalk_1.default.yellow(`[realtimate] ${app} detected`));
        const functionsConfigFile = node_fs_1.default.readFileSync(`${root}/apps/${app}/http_endpoints/config.json`);
        const functionsConfig = JSON.parse(functionsConfigFile);
        let consoleResult = {
            endpoints: {},
            functions: {},
            triggers: {},
        };
        if (functionsConfig.length) {
            for (const config of functionsConfig) {
                consoleResult.endpoints[config.route] = {
                    method: config.http_method,
                    route: `/${app}/endpoint${config.route}`,
                };
                const functionFile = node_fs_1.default.readFileSync(`${root}/apps/${app}/functions/${config.function_name}.js`);
                const functionToExecute = eval(functionFile.toString());
                server[config.http_method.toLowerCase()](`/${app}/endpoint${config.route}`, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
                    try {
                        res.send(functionToExecute(req, res));
                    }
                    catch (err) {
                        console.error(err);
                        res.send();
                    }
                }));
            }
            console.table(consoleResult.endpoints, ["method", "route"]);
        }
        else {
            console.log(`${chalk_1.default.red("no endpoints")}`);
        }
        try {
            const triggerConfigFiles = node_fs_1.default.readdirSync(`${root}/apps/${app}/triggers`);
            if (triggerConfigFiles.length) {
                for (const file of triggerConfigFiles) {
                    const triggerFile = node_fs_1.default.readFileSync(`${root}/apps/${app}/triggers/${file}`);
                    const triggerConfig = JSON.parse(triggerFile);
                    switch (triggerConfig.type) {
                        case "SCHEDULED":
                            consoleResult.triggers[triggerConfig.event_processors.FUNCTION.config.function_name] = {
                                type: "SCHEDULED",
                                testRoute: `/${app}/trigger/${triggerConfig.event_processors.FUNCTION.config.function_name}`,
                            };
                            server.get(`/${app}/trigger/${triggerConfig.event_processors.FUNCTION.config.function_name}`, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
                                const functionFile = node_fs_1.default.readFileSync(`${root}/apps/${app}/functions/${triggerConfig.event_processors.FUNCTION.config.function_name}.js`);
                                const functionToExecute = eval(functionFile.toString());
                                try {
                                    yield functionToExecute();
                                }
                                catch (err) {
                                    console.error(err);
                                }
                                res.send();
                            }));
                            break;
                        case "DATABASE":
                            consoleResult.triggers.push(`${chalk_1.default.blue(triggerConfig.config.collection)} : ${chalk_1.default.bgYellow(triggerConfig.config.operation_types.join(", "))} => ${chalk_1.default.yellow(triggerConfig.event_processors.FUNCTION.config.function_name)}`);
                            consoleResult.triggers[triggerConfig.event_processors.FUNCTION.config.function_name] = {
                                type: "DATABASE",
                                collection: triggerConfig.config.collection,
                                opertion_types: triggerConfig.config.operation_types.join(", "),
                            };
                            const changeStream = mongoClient
                                .db(triggerConfig.config.database)
                                .collection(triggerConfig.config.collection)
                                .watch([{ $match: triggerConfig.config.match }]);
                            changeStream
                                .on("change", (next) => __awaiter(void 0, void 0, void 0, function* () {
                                console.log(next);
                                if (triggerConfig.config.operation_types.find((i) => i == next.operationType.toUpperCase())) {
                                    console.log(`${chalk_1.default.red(triggerConfig.name)} triggered!`);
                                    const functionFile = node_fs_1.default.readFileSync(`${root}/apps/${app}/functions/${triggerConfig.event_processors.FUNCTION.config.function_name}.js`);
                                    const functionToExecute = eval(functionFile.toString());
                                    try {
                                        yield functionToExecute(next);
                                    }
                                    catch (err) {
                                        console.error(err);
                                    }
                                }
                            }))
                                .on("error", (err) => {
                                console.log(`${chalk_1.default.redBright("error")} occurs whil watching on ${chalk_1.default.blue(triggerConfig.config.collection)}`, err.stack);
                            });
                            break;
                    }
                }
            }
            console.table(consoleResult.triggers, [
                "type",
                "testRoute",
                "collection",
                "opertion_types",
            ]);
        }
        catch (e) {
            console.log(`no triggers on ${app}`);
        }
        console.log("------------------------------------------------------");
    }
    server.listen(port, () => {
        console.log(`apps listening on port ${port}`);
    });
});
run();
//# sourceMappingURL=run.js.map