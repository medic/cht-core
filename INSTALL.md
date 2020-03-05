# Local Installation

The following are instructions on how to install the Core Framework on your local machine, allowing you to develop or edit applications using the Core Framework. These are not instructions for a production-ready deployment.

These instructions should work on Windows, MacOS and Linux.

First, install Docker by following the [docker desktop instructions](https://www.docker.com/products/docker-desktop) for your operating system. If you're on Linux you'll need to work out the right approach for your specific distribution, including installing docker-compose separately.

Next, download the [docker-compose.yml](./docker-compose.yml) file from GitHub and place it in a directory of your choosing. If you are unfamilar with terminals we recommend you place it in your home directory. (`/home/USERNAME` in MacOS, usually `C:\Users\USERNAME` in Windows).

Now you need to open a terminal. This will let you start the Core Framework, see any logging output and stop it once you're done.

In **MacOS**: Open finder, click "Applications" and navigate to "Utilities" then "Terminal"

In **Windows**: Press `Windows+r`, type `cmd` then `enter`.

Now that you have a terminal, navigate to the directory with the `docker-compose.yml` file, and type:

```sh
docker-compose up
```

And hit enter. This will do a lot of stuff. Once it's settled down, you should then be able to navigate to [https://localhost](https://localhost), and log in with the username `medic` and the password `password`.

You may encounter issues with your browser not trusting localhost. To solve this in Chrome, type `thisisunsafe` when presented with the warning. In Firefox you can click advanced and then bypass the warning.

To stop the Core Framework you can use `CTRL+C`.

## Any problems?

If, after docker-compose has started, you are unable to access the page, try stopping and restarting the service. If that doesn't work, you can delete the containers it generates and start again:

```sh
docker containers rm -v medic-os haproxy
docker-compose up
```

## Uploading test data

By default the Core Framework will have the reference application installed. If you want to also upload some demo data you can do so using `medic-conf`:
 - Install [medic-conf](https://github.com/medic/medic-conf)
 - Check out the [cht-core](https://github.com/medic/cht-core) respository to your local machine, either by using the [Github Desktop app](https://desktop.github.com/) or by running the following command in the directory you want to check the code out into: `git clone https://github.com/medic/cht-core.git`. This will create a `cht-core` directory.
 - Navigate your terminal to the `config/default` directory of the `cht-core` directory. This is where the reference application is stored.
 - Run the following `medic-conf` command: `medic-conf --url=https://medic:password@localhost --accept-self-signed-certs csv-to-docs upload-docs`. This first compiles and then uploads the shipped default test data to your local instance
