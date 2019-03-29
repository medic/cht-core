# Process to Run Developer Builds on Mobile Devices
This process is relevant for viewing Medic services on mobile devices when Medic's services are run on a developer machine running Webapp >v3.5.0. Webapp v3.5.0 relies on service workers, which require a valid HTTPS certificate to function. Follow these steps to make your developer build accessible via a trusted url https://medic.dev from your android device.

## Preparing (do this once)
### Setup for an android devices
Perform these steps **once** for each Android device you wish to use for running developer builds:

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
If a service is running on port 53. `sudo lsof -i -n -P | grep :53` and `systemctl stop systemd-resolved`.