#! /usr/bin/env node

import figlet from "figlet";
import { Command } from "commander";

import dotenv from "dotenv";
dotenv.config();

console.log(figlet.textSync("Realtimate"));

const program = new Command();
program
  .name("realtimate")
  .version(process.env.npm_package_version || "")
  .description(process.env.npm_package_description || "")
  .command("new", "Create a new  project")
  .command("run", "The command to run dev server")
  .command("build", "The command to build the app")
  .command("watch", "The command to watch the app")
  .command("generate <app>", "Generate a new Realm app");

program.parse();
