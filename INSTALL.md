# Local Installation

The following is instructions on how to install the Core Framework on your local machine. This will allow you to develop or edit applications for the Core Framework. These are not instructions for a production-ready deployment.

These instructions should work on Windows, MacOS and Linux.

First, install Docker by following the [docker desktop instructions](https://www.docker.com/products/docker-desktop) for your operating system. If you're on Linux you'll need to work out the right approach for your specific distribution, including install docker-compose separately.

Next, download the [docker-compose.yml](./docker-compose.yml) file from GitHub and place it in a directory of your choosing. If you are unfamilar with terminals (see below) we recommend you place it in your home directory. (`/home/USERNAME` in MacOS, usually `C:\Users\USERNAME` in Windows).

Now you need to open a terminal. This will let you start the Core Framework, see any logging output and stop it once you're done.

In **MacOS**: Open finder, click "Applications" and navigate to "Utilities" then "Terminal"

In **Windows**: Press `Windows+r`, type `cmd` then `enter`.

Now you have a terminal, type:

```sh
docker-compose up
```

And hit enter. This will do a lot of stuff. Once it's settled down, you should then be able to navigate to [https://localhost](https://localhost), and log in with the username `medic` and the password `password`.

To kill the Core Framework you can use `CTRL+C`.
