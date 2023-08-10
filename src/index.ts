#! /usr/bin/env node

import figlet from "figlet";
import { Command } from "commander";

import dotenv from "dotenv";
dotenv.config();

console.log(figlet.textSync("Realtimate"));

const program = new Command();
program
  .version(process.env.npm_package_version || "")
  .description(process.env.npm_package_description || "")
  .command("init", "Init the project")
  .command("run", "The command to run dev server")
  .option("-w, --watch", "Watch for changes")
  .command("new <app>", "Create a new Realm app");

program.parse();
