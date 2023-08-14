# Realtimate : An Atlas Realm / App Service development tool

## Installation

### On demand

Using `npx` you can run the script without installing it first:
```shell
npx realtimate [arguments]
```

### Globally via `npm`
```
npm install -g realtimate
```

## Usage
```
  ____            _ _   _                 _       
 |  _ \ ___  __ _| | |_(_)_ __ ___   __ _| |_ ___ 
 | |_) / _ \/ _` | | __| | '_ ` _ \ / _` | __/ _ \
 |  _ <  __/ (_| | | |_| | | | | | | (_| | ||  __/
 |_| \_\___|\__,_|_|\__|_|_| |_| |_|\__,_|\__\___|


 Usage: realtimate [options] [command]

Options:
  -V, --version   output the version number
  -w, --watch     Watch for changes
  -h, --help      display help for command

Commands:
  init            Init the project
  run             The command to run dev server
  new <app>       Create a new Realm app
  help [command]  display help for command
```

### Init

This will init a new monorepo app service project. You can found an example of a new service here: <>

### Run

This will run the local development server in you app service. It will watch and build and allow you to test your endpoint, apis locally. 

### New

this will add a new app to your project


## Development

Checkout this repository locally, then
```shell
npm i
npm run watch
```