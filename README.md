![Realtimate](misc/realtimate.svg?raw=true "Realtimate")

# Realtimate - Local Realm Atlas Environment Simulator

Realtimate is a command-line tool designed to facilitate the simulation of a local environment for MongoDB Realm on Atlas. This tool enables developers to test and debug their applications that utilize MongoDB Realm services without the need to interact with a live Atlas cluster. By creating a localized simulation of the Realm environment, developers can iterate faster, identify issues earlier, and ensure the reliability of their applications.

you can found examples in the `/examples` folder

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

Once installed, you can use the `realtimate` command to manage and simulate your local Realm Atlas environment.

### Init your project

To start initialization, run :

```
realtimate init
```

This command initializes the project with minimum requirements and allows future deployments to realm atlas

### Create a local realm app

```bash
realtimate new <appName>
```

This will create a local realm app with the good tree. and a `src/<appName>` folder with the .ts files of your functions.

### Run

Finally, to simulate your app, just run

```bash
realtimate run
```

## Feedback and Contributions

We welcome feedback and contributions from the community. If you encounter issues, have suggestions, or want to contribute to Realtimate, please check out our [GitHub repository](https://github.com/your-username/realtimate) and open issues or pull requests.

## Development

Checkout this repository locally, then

```shell
npm i
npm run watch
```

## License

Realtimate is released under the [GNU GPL3](LICENSE).

---

Happy simulating with Realtimate! If you have any questions or need assistance, don't hesitate to reach out to us.
