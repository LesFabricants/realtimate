import bodyParser from 'body-parser';
import chalk from 'chalk';
import express, { Request, Response } from 'express';
import { MongoClient, ServerApiVersion } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fs from 'node:fs';
import { dirname } from 'node:path';
import querystring from 'node:querystring';
import { createContext, runInContext } from 'node:vm';
import { builtins } from '../builtins';

export async function run(
  port: number,
  uri: string,
  apps: string[],
  environement: string
) {
  const server = express();

  if (!uri) {
    console.warn(
      'Using memory mongo server, if you want to use another mongo server, add MONGODB_URI as an env variable in your .env file'
    );
    const mongod = await MongoMemoryServer.create();
    ['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((signal) =>
      process.on(signal, async () => {
        console.log('Stopping memory server');
        await mongod.stop({ doCleanup: true });
        process.exit(0);
      })
    );
    // await mongod.start();
    uri = mongod.getUri();
  }

  const mongoClient = new MongoClient(uri || '', {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  server.use(bodyParser.json());
  server.use(bodyParser.text());
  server.use(bodyParser.urlencoded());

  for (const app of apps) {
    const appName = app.split('/').pop();
    console.log(chalk.yellow(`[realtimate] ${app} => ${appName} detected`));

    // eslint-disable-next-line no-inner-declarations
    function runFunction(
      fnPath: string,
      request: express.Request | undefined = undefined,
      res: express.Response | undefined = undefined,
      ...args: unknown[]
    ) {
      const envValues = JSON.parse(
        fs.readFileSync(`${app}/environments/${environement}.json`).toString()
      );

      // provide context to future functions
      const context: Realm['context'] = {
        services: {
          get: (name: string) => {
            // TODO: better scheming
            switch (name) {
            case 'mongodb-atlas':
              return mongoClient;
            default:
              return undefined as any;
            }
          },
        },
        environment: {
          tag: environement,
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
                  ...args
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
            httpUserAgent: request.headers['user-agent'],
            service: '',
            action: '',
          }
          : undefined,
        user: {
          id: '',
          type: 'system',
          data: {},
          custom_data: {},
          identities: [],
        },
        values: {
          get(name: any) {
            return envValues[name];
          },
        },
        http: {
          get(options: any) {
            return fetch(options.url, {
              headers: options.headers,
              method: 'GET',
            });
          },
          post(options: any) {
            return fetch(options.url, { body: options.body, method: 'POST' });
          },
        },
      };

      if (request && Object.keys(request.query).length === 0) {
        request.query = request.body;
      }

      if (request && request.body && !request.body.text)
        request.body.text = () => JSON.stringify(request.body);

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
        ? Promise.resolve(fn(request, response)).then(
          (functionResult: unknown) => functionResult ?? result
        )
        : fn.call(null, ...args);
    }

    const getFunctionConfigFile = () => {
      const hasHttpsEndpointsFolder = fs.existsSync(`${app}/https_endpoints`);
      const hasHttpEndpointsFolder = fs.existsSync(`${app}/http_endpoints`);
      if(!hasHttpEndpointsFolder && !hasHttpsEndpointsFolder) {
        console.error(chalk.red.bold('ERROR: ') +
          chalk.yellow('Endpoints config not found.\n') +
          chalk.white('Please check your app folder and make sure a folder named "http_endpoints" or "https_endpoints" is present. \n') +
          chalk.cyan('You can refer to the example at ') +
          chalk.cyan.underline('https://github.com/LesFabricants/realtimate-sample-atlas-app-service/tree/120b3faf0daafb60d65936106c43439a438bd771') +
          chalk.white(' for more information.'));
        process.exit(1);
      }
      const configFolder = hasHttpsEndpointsFolder ? 'https_endpoints' : 'http_endpoints';
      const configFilePath = `${app}/${configFolder}/config.json`;

      if (!fs.existsSync(configFilePath)) {
        console.error(
          chalk.red.bold('ERROR: ') +
          chalk.yellow('Configuration file not found.\n') +
          chalk.white(`The file "config.json" in the folder "${configFolder}" is missing. Please make sure this file is present in your application directory and it is not corrupted.\n`) +
          chalk.cyan('You can refer to the example at ') +
          chalk.cyan.underline('https://github.com/LesFabricants/realtimate-sample-atlas-app-service/tree/120b3faf0daafb60d65936106c43439a438bd771') +
          chalk.white(' for more information.')
        );
      }
      return fs.readFileSync(configFilePath, {encoding: 'utf8'});
    };

    const functionsConfig = JSON.parse(
      getFunctionConfigFile() as unknown as string
    );

    const consoleResult: any = {
      endpoints: {},
      functions: {},
      triggers: {},
    };
    if (functionsConfig && functionsConfig.length) {
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
      console.table(consoleResult.endpoints, ['method', 'route']);
    } else {
      console.log(`${chalk.red('no endpoints')}`);
    }

    try {
      const triggerConfigFiles = fs.readdirSync(`${app}/triggers`);
      if (triggerConfigFiles.length) {
        for (const file of triggerConfigFiles) {
          const triggerFile = fs.readFileSync(`${app}/triggers/${file}`);
          const triggerConfig = JSON.parse(triggerFile as unknown as string);
          switch (triggerConfig.type) {
          case 'SCHEDULED':{
            consoleResult.triggers[
              triggerConfig.event_processors.FUNCTION.config.function_name
            ] = {
              type: 'SCHEDULED',
              testRoute: `http://localhost:${port}/${appName}/trigger/${triggerConfig.event_processors.FUNCTION.config.function_name}`,
            };
            server.get(
              `/${appName}/trigger/${triggerConfig.event_processors.FUNCTION.config.function_name}`,
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
          }
          case 'DATABASE':{
            consoleResult.triggers[
              triggerConfig.event_processors.FUNCTION.config.function_name
            ] = {
              type: 'DATABASE',
              collection: triggerConfig.config.collection,
              operation_types:
                  triggerConfig.config.operation_types.join(', '),
            };

            const changeStream = mongoClient
              .db(triggerConfig.config.database)
              .collection(triggerConfig.config.collection)
              .watch([{ $match: triggerConfig.config.match }]);

            changeStream
              .on('change', async (next) => {
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
              .on('error', (err) => {
                console.log(
                  `${chalk.redBright(
                    'error'
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
      }
      console.table(consoleResult.triggers, [
        'type',
        'testRoute',
        'collection',
        'operation_types',
      ]);
    } catch (e) {
      console.log(`no triggers on ${app}`);
    }
    console.log('------------------------------------------------------');
  }

  server.listen(port, () => {
    console.log(`apps listening on port ${port}`);
  });
}

