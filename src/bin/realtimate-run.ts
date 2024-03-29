import dotenv from 'dotenv';
dotenv.config();

import { program } from 'commander';

import { run } from './utils/run';

program
  .option('-u, --uri <uri>', 'mongodb URI')
  .option(
    '-e,  --environement <environement>',
    'environement to use',
    'development'
  )
  .option('--port <port>', 'port number', '3000')
  .option('-a, --app [app...]', 'app', [process.cwd()])
  .action(function () {
    // @ts-expect-error commander use this
    const options = this.opts();

    const port = parseInt(options.port);

    const uri: string = options.uri ?? process.env.MONGODB_URI;

    const apps: string[] = options.app;
    return run(port, uri, apps, options.environement);
  });

program.parse(process.argv);
