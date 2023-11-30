import dotenv from "dotenv";
dotenv.config();

import { program } from "commander";

import { run } from "./utils/run";

program
  .option("-u, --uri <uri>", "mongodb URI")
  .option(
    "-e,  --environement <environement>",
    "environement to use",
    "development"
  )
  .option("--port <port>", "port number", "3000")
  .option("--app [app...]", "app", [process.cwd()])
  .action(() => {
    //@ts-ignore
    const options = this.opts();

    const port = parseInt(options.port);

    let uri = options.uri ?? process.env.MONGODB_URI;

    const apps = options.app;
    return run(port, uri, apps, options.environement);
  });

program.parse(process.argv);
