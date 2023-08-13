import dotenv from "dotenv";
dotenv.config();

import fs from "node:fs";
import chalk from "chalk";

import express from "express";
import { Request, Response } from "express";
import bodyParser from "body-parser";

import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, ServerApiVersion } from "mongodb";

console.log(chalk.yellowBright("[realtimate] watching for changes..."));

const run = async () => {
  const server = express();
  const port =
    process.argv.find((arg) => arg.match(/--port=(\d+)/))?.split("=")[1] ||
    3000;

  const mongod = await MongoMemoryServer.create();
  const uri = process.env.MONGODB_URI || mongod.getUri();

  const mongoClient = new MongoClient(uri || "", {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  const root = `${process.cwd()}`;

  const apps = fs.readdirSync(`${root}/apps`);

  server.use(bodyParser.json());

  // provide context to future functions
  const context = {
    services: {
      get: () => {
        return mongoClient;
      },
    },
  };

  for (const app of apps) {
    console.log(chalk.yellow(`[realtimate] ${app} detected`));
    const functionsConfigFile = fs.readFileSync(
      `${root}/apps/${app}/http_endpoints/config.json`
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
          route: `/${app}/endpoint${config.route}`,
        };
        const functionFile = fs.readFileSync(
          `${root}/apps/${app}/functions/${config.function_name}.js`
        );
        const functionToExecute = eval(functionFile.toString());
        (server as any)[config.http_method.toLowerCase()](
          `/${app}/endpoint${config.route}`,
          async (req: Request, res: Response) => {
            try {
              res.send(functionToExecute(req, res));
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
      const triggerConfigFiles = fs.readdirSync(`${root}/apps/${app}/triggers`);
      if (triggerConfigFiles.length) {
        for (const file of triggerConfigFiles) {
          const triggerFile = fs.readFileSync(
            `${root}/apps/${app}/triggers/${file}`
          );
          const triggerConfig = JSON.parse(triggerFile as unknown as string);
          switch (triggerConfig.type) {
            case "SCHEDULED":
              consoleResult.triggers[
                triggerConfig.event_processors.FUNCTION.config.function_name
              ] = {
                type: "SCHEDULED",
                testRoute: `/${app}/trigger/${triggerConfig.event_processors.FUNCTION.config.function_name}`,
              };
              server.get(
                `/${app}/trigger/${triggerConfig.event_processors.FUNCTION.config.function_name}`,
                async (req, res) => {
                  const functionFile = fs.readFileSync(
                    `${root}/apps/${app}/functions/${triggerConfig.event_processors.FUNCTION.config.function_name}.js`
                  );
                  const functionToExecute = eval(functionFile.toString());
                  try {
                    await functionToExecute();
                  } catch (err) {
                    console.error(err);
                  }
                  res.send();
                }
              );
              break;
            case "DATABASE":
              consoleResult.triggers.push(
                `${chalk.blue(
                  triggerConfig.config.collection
                )} : ${chalk.bgYellow(
                  triggerConfig.config.operation_types.join(", ")
                )} => ${chalk.yellow(
                  triggerConfig.event_processors.FUNCTION.config.function_name
                )}`
              );

              consoleResult.triggers[
                triggerConfig.event_processors.FUNCTION.config.function_name
              ] = {
                type: "DATABASE",
                collection: triggerConfig.config.collection,
                opertion_types: triggerConfig.config.operation_types.join(", "),
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
                    const functionFile = fs.readFileSync(
                      `${root}/apps/${app}/functions/${triggerConfig.event_processors.FUNCTION.config.function_name}.js`
                    );
                    const functionToExecute = eval(functionFile.toString());
                    try {
                      await functionToExecute(next);
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
        "opertion_types",
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

run();
