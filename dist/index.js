#! /usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const figlet_1 = __importDefault(require("figlet"));
const commander_1 = require("commander");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
console.log(figlet_1.default.textSync("Realtimate"));
const program = new commander_1.Command();
program
    .version(process.env.npm_package_version || "")
    .description(process.env.npm_package_description || "")
    .command("init", "Init the project")
    .command("run", "The command to run dev server")
    .option("-w, --watch", "Watch for changes")
    .command("new <app>", "Create a new Realm app");
program.parse();
