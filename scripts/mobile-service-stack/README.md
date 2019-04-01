# Process to Run Developer Builds on Mobile Devices
This process is relevant for viewing the Medic webapp on mobile devices when the api service is run on a developer machine running Webapp >v3.5.0. Webapp v3.5.0 relies on service workers, which require a valid HTTPS certificate to function. Follow these steps to make your developer build accessible from your android device at the trusted url https://medic.dev.

## Preparing (do this once)
### Setup for an android devices
Perform these steps **once** for each Android device you wish to use:

1. Install the Medic Mobile Android App by following [these installation steps](https://github.com/medic/medic-android#installation) or downloading it from the app store.
1. Install Medic's developer certificate as a trusted authority.
  a. Download [this certificate](https://raw.githubusercontent.com/medic/medic/tree/master/scripts/mobile-service-stack/https/root-ca.crt).
  b. Open the file. 
  c. Follow the prompts. Select to use it for "VPN or Apps".
1. Install your favourite app for custom DNS. [DNS Changer](https://play.google.com/store/apps/details?id=com.burakgon.dnschanger) is recommended.

### Setup for a development machine
Perform these steps **once** on the development machine which will be hosting Medic's service stack:

1. Install [Docker CE](https://download.docker.com/).
1. Install [Docker Compose](https://docs.docker.com/compose/install/#install-compose).

## Running (do this every time)
Perform these steps **each time** you want to connect your mobile device to your developer machine. These steps should only be run on [prepared devices](#Prepared).

### On the developer machine
1. Launch Medic's service stack. By either completing Medic's [build process](https://github.com/medic/medic#deploy-all-the-apps), or [via docker]().
1. Then run `grunt exec:mobile-service-stack`
1. Obtain the IP address of your developer machine.

### On the android device
1. Launch your DNS app (probably [DNS Changer](https://play.google.com/store/apps/details?id=com.burakgon.dnschanger)), and use the IP address of your developer machine as your DNS server.
1. Launch the Medic's android app.
  

## Notes
**Port in Use**
    ERROR: for medic-dns  Cannot start service dns: .... 0.0.0.0:53: bind: address already in use

You may see an error about port 53 already being in use. This means your machine is already running a DNS server of some variety. You can either configure your existing server to be an authority for medic.dev, or you can stop running that server (sorry).

* To find out what service is running on port 53 `sudo lsof -i -n -P | grep :53`.
* On Ubuntu >18.04, `systemd-resolved` runs by default and cannot be used as a DNS authority. Follow [these steps](https://askubuntu.com/a/907249/608846).
