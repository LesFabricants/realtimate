import dotenv from "dotenv";
dotenv.config();

import fs from "node:fs";
import chalk from "chalk";

import express from "express";
import { Request, Response } from "express";
import bodyParser from "body-parser";

import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, ServerApiVersion } from "mongodb";

import { program } from "commander";
import { createContext, runInContext } from "node:vm";
import { dirname } from "node:path";
import { builtins } from "./builtins";

import querystring from "node:querystring";

const run = async function () {
  //@ts-ignore
  const options = this.opts();
  const server = express();
  const port = parseInt(options.port);

  let uri = options.uri ?? process.env.MONGODB_URI;
  if (!uri) {
    console.warn(
      "Using memory mongo server, if you want to use another mongo server, add MONGODB_URI as an env variable in your .env file"
    );
    const mongod = await MongoMemoryServer.create();
    ["SIGINT", "SIGTERM", "SIGQUIT"].forEach((signal) =>
      process.on(signal, async () => {
        console.log("Stopping memory server");
        await mongod.stop({ doCleanup: true });
        process.exit(0);
      })
    );
    // await mongod.start();
    uri = mongod.getUri();
  }

  const mongoClient = new MongoClient(uri || "", {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  const apps = options.app;

  server.use(bodyParser.json());
  server.use(bodyParser.text());

  for (const app of apps) {
    const appName = app.split("/").pop();
    console.log(chalk.yellow(`[realtimate] ${app} => ${appName} detected`));

    function runFunction(
      fnPath: string,
      request: express.Request | undefined = undefined,
      res: express.Response | undefined = undefined,
      ...args: any[]
    ) {
      const envValues = JSON.parse(
        fs
          .readFileSync(`${app}/environments/${options.environement}.json`)
          .toString()
      );

      // provide context to future functions
      const context: typeof global.context = {
        services: {
          get: (name: string) => {
            // TODO: better scheming
            switch (name) {
              case "mongodb-client":
                return mongoClient;
              default:
                return undefined as any;
            }
          },
        },
        environment: {
          tag: options.environement,
          ...envValues,
        },

        functions: {
          execute: (name: string, ...args: any[]) => {
            const functionsConfigFile = JSON.parse(
              fs.readFileSync(`${app}/functions/config.json`).toString()
            );
            for (const config of functionsConfigFile) {
              if (config.name === name)
                return runFunction(
                  `${app}/functions/${config.name}.js`,
                  undefined,
                  undefined,
                  args
                );
            }
          },
        },
        request: request
          ? {
              remoteIPAddress: request.ip,
              requestHeaders: request.headers,
              webhookUrl: request.url,
              httpMethod: request.method,
              rawQueryString: querystring.stringify(request.query as any),
              httpReferrer: request.headers.referer,
              httpUserAgent: request.headers["user-agent"],
              service: "",
              action: "",
            }
          : undefined,
        user: {
          id: "",
          type: "system",
          data: {},
          custom_data: {},
          identities: [],
        },
        values: {
          get(name) {
            return envValues[name];
          },
        },
        http: {
          get(options) {
            return fetch(options.url, {
              headers: options.headers,
              method: "GET",
            });
          },
          post(options) {
            return fetch(options.url, { body: options.body, method: "POST" });
          },
        },
      };

      let response = undefined;
      let result: string | undefined = undefined;
      if (res) {
        response = {
          setStatusCode: (status: number) => res.status(status),
          addHeader: (header: string, value: string) =>
            res.setHeader(header, value),
          setBody: (body: string) => (result = body),
        };
      }

      const vmContext = createContext({
        context,
        request,
        response,
        ...builtins,
        __filename: fnPath,
        __dirname: dirname(fnPath),
      });

      const fnString = fs.readFileSync(fnPath).toString();
      const fn = runInContext(fnString, vmContext);
      return request && response
        ? fn(request, response).then(
            (functionResult: any) => functionResult ?? result
          )
        : fn(...args);
    }

    const functionsConfigFile = fs.readFileSync(
      `${app}/http_endpoints/config.json`
    );
    const functionsConfig = JSON.parse(
      functionsConfigFile as unknown as string
    );
    let consoleResult: any = {
      endpoints: {},
      functions: {},
      triggers: {},
    };
    if (functionsConfig.length) {
      for (const config of functionsConfig) {
        consoleResult.endpoints[config.route] = {
          method: config.http_method,
          route: `http://localhost:${port}/${appName}/endpoint${config.route}`,
        };

        (server as any)[config.http_method.toLowerCase()](
          `/${appName}/endpoint${config.route}`,
          async (req: Request, res: Response) => {
            try {
              res.send(
                await runFunction(
                  `${app}/functions/${config.function_name}.js`,
                  req,
                  res
                )
              );
            } catch (err) {
              console.error(err);
              res.send();
            }
          }
        );
      }
      console.table(consoleResult.endpoints, ["method", "route"]);
    } else {
      console.log(`${chalk.red("no endpoints")}`);
    }

    try {
      const triggerConfigFiles = fs.readdirSync(`${app}/triggers`);
      if (triggerConfigFiles.length) {
        for (const file of triggerConfigFiles) {
          const triggerFile = fs.readFileSync(`${app}/triggers/${file}`);
          const triggerConfig = JSON.parse(triggerFile as unknown as string);
          switch (triggerConfig.type) {
            case "SCHEDULED":
              consoleResult.triggers[
                triggerConfig.event_processors.FUNCTION.config.function_name
              ] = {
                type: "SCHEDULED",
                testRoute: `http://localhost:${port}/${appName}/trigger/${triggerConfig.event_processors.FUNCTION.config.function_name}`,
              };
              server.get(
                `/${app}/trigger/${triggerConfig.event_processors.FUNCTION.config.function_name}`,
                async (req, res) => {
                  try {
                    await runFunction(
                      `${app}/functions/${triggerConfig.event_processors.FUNCTION.config.function_name}.js`
                    );
                  } catch (err) {
                    console.error(err);
                  }
                  res.send();
                }
              );
              break;
            case "DATABASE":
              consoleResult.triggers[
                triggerConfig.event_processors.FUNCTION.config.function_name
              ] = {
                type: "DATABASE",
                collection: triggerConfig.config.collection,
                operation_types:
                  triggerConfig.config.operation_types.join(", "),
              };

              const changeStream = mongoClient
                .db(triggerConfig.config.database)
                .collection(triggerConfig.config.collection)
                .watch([{ $match: triggerConfig.config.match }]);
              changeStream
                .on("change", async (next) => {
                  console.log(next);
                  if (
                    triggerConfig.config.operation_types.find(
                      (i: any) => i == next.operationType.toUpperCase()
                    )
                  ) {
                    console.log(`${chalk.red(triggerConfig.name)} triggered!`);

                    try {
                      await runFunction(
                        `${app}/functions/${triggerConfig.event_processors.FUNCTION.config.function_name}.js`,
                        undefined,
                        undefined,
                        next
                      );
                    } catch (err) {
                      console.error(err);
                    }
                  }
                })
                .on("error", (err) => {
                  console.log(
                    `${chalk.redBright(
                      "error"
                    )} occurs whil watching on ${chalk.blue(
                      triggerConfig.config.collection
                    )}`,
                    err.stack
                  );
                });
              break;
          }
        }
      }
      console.table(consoleResult.triggers, [
        "type",
        "testRoute",
        "collection",
        "operation_types",
      ]);
    } catch (e) {
      console.log(`no triggers on ${app}`);
    }
    console.log("------------------------------------------------------");
  }

  server.listen(port, () => {
    console.log(`apps listening on port ${port}`);
  });
};

program
  .option("-u, --uri <uri>", "mongodb URI")
  .option(
    "-e,  --environement <environement>",
    "environement to use",
    "development"
  )
  .option("--port <port>", "port number", "3000")
  .option("--app [app...]", "app", [process.cwd()])
  .action(run);

program.parse(process.argv);
