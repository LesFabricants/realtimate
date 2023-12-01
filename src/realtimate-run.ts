import dotenv from "dotenv";
dotenv.config();

import { program } from "commander";

import { run } from "./utils/run";

program
  .option("-u, --uri <uri>", "mongodb URI")
  .option("-r, --realm <realm>", "realm id")
  .option(
    "-e,  --environement <environement>",
    "environement to use",
    "development"
  )
  .option("--port <port>", "port number", "3000")
  .option("--app [app...]", "app", [process.cwd()])
  .action(function() {
    //@ts-expect-error
    const options = this.opts();

    const port = parseInt(options.port);

    let uri = options.uri ?? process.env.MONGODB_URI;

    const apps = options.app;
    return run(port, uri, apps, options.environement, options.realm);
  });

program.parse(process.argv);
