import dotenv from "dotenv";
dotenv.config();

import fs from "node:fs";
import chalk from "chalk";

import express from "express";
import { Request, Response } from "express";
import bodyParser from "body-parser";

const server = express();
const port =
  process.argv.find((arg) => arg.match(/--port=(\d+)/))?.split("=")[1] || 3000;

const consoleResult: { [key: string]: any } = {};

import { MongoClient, ServerApiVersion } from "mongodb";
const uri = process.env.MONGODB_URI;
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
  const functionsConfigFile = fs.readFileSync(
    `${root}/apps/${app}/http_endpoints/config.json`
  );
  const functionsConfig = JSON.parse(functionsConfigFile as unknown as string);
  if (functionsConfig.length) {
    console.log(`${chalk.red(app)} Endpoints available`);
    consoleResult[app] = {
      endpoints: [],
    };
    for (const config of functionsConfig) {
      console.log(
        chalk.green(config.http_method),
        `${chalk.blue(app)}/endpoint${chalk.blue(config.route)}`
      );
      consoleResult[app].endpoints.push({
        http_method: config.http_method,
        route: config.route,
      });
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
  } else {
    console.log(`no endpoint on ${app}`);
    consoleResult[app] = {
      endpoints: [],
    };
  }

  try {
    const triggerConfigFiles = fs.readdirSync(`${root}/apps/${app}/triggers`);
    if (triggerConfigFiles.length) {
      console.log(`${chalk.red(app)} Triggers available`);

      for (const file of triggerConfigFiles) {
        const triggerFile = fs.readFileSync(
          `${root}/apps/${app}/triggers/${file}`
        );
        const triggerConfig = JSON.parse(triggerFile as unknown as string);
        switch (triggerConfig.type) {
          case "SCHEDULED":
            console.log(
              chalk.green("GET"),
              `${chalk.blue(app)}/trigger/${chalk.blue(
                triggerConfig.event_processors.FUNCTION.config.function_name
              )}`
            );
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
            console.log(
              `Trigger on ${chalk.blue(
                triggerConfig.config.collection
              )} collection events : ${chalk.bgYellow(
                triggerConfig.config.operation_types.join(", ")
              )} -> runs ${chalk.yellow(
                triggerConfig.event_processors.FUNCTION.config.function_name
              )}`
            );

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
  } catch (e) {
    console.log(`no triggers on ${app}`);
  }
  console.log("------------------------------------------------------");
}

console.table(consoleResult, ["endpoints", "triggers"]);

server.listen(port, () => {
  console.log(`apps listening on port ${port}`);
});
