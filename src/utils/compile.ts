import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ncc = require('@vercel/ncc');

const MAX_LIMIT = 10000;

const [ fileSrc, fileName, destination, options ] = process.argv.slice(2);

async function compile() {
  const { code } = await ncc(fileSrc, JSON.parse(options));

  const finalCode: string | null = `exports=(...args)=>{__dirname='';module={};${code};return module.exports.apply(null, args)}`;
  const distfile = path.resolve(destination, `functions/${fileName}.js`);

  console.log(
    `DONE: ${chalk.green(fileSrc)} -> ${chalk.greenBright(
      distfile
    )} (length: ${chalk.gray(finalCode.length)})`
  );
  fs.writeFileSync(distfile, finalCode);

  if (finalCode.length > MAX_LIMIT) {
    console.error(chalk.redBright('Reach max function limit: ' + fileSrc));
  }
  process.exit();
}

compile();