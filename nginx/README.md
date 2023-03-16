# CHT NGINX

This folder contains the set up for the CHT Nginx Image.  It operates in 3 modes based on the value of `CERTIFICATE_MODE`:

1. Creating a self signed certificate
2. Using a certificate that is already issued by a certification authority.
3. Auto generating the TLS certificate using [ACME.sh](https://github.com/acmesh-official/acme.sh)

## Environment Variables

- `CERTIFICATE_MODE` - TLS mode to use when starting nginx. Options are:
   1. `OWN_CERT` - bring your own TLS certificate. The docker container should be pointed to a drive location that contains both the the certificate amd private key mounted at `/etc/nginx/private/cert.pem` and `/etc/nginx/private/key.pem` respectively. This must be mounted to `/etc/nginx/private`, eg: `docker run -v /mycerts:/etc/nginx/private`.
   1. `AUTO_GENERATE` - generate new TLS certificate using [Let's Encrypt](https://letsencrypt.org/). To persist the results of this operation on container restart, you need  to map a volume that stores this certificate at `/root/.acme.sh/`
   1. `SELF_SIGNED` - to generate a self signed certificate based on env vars below
- `COMMON_NAME` -  Domain name.  manadatory
- `EMAIL` - The registration email.  mandatory
- `COUNTRY` - Registartion country in [ISO-3166-1 ALPHA-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) format (eg `US` for United States).
- `STATE` - State registration
- `LOCALITY` - Locatlity registration
- `ORGANISATION` - Organistaion registration
- `DEPARTMENT` - The department.
- `SSL_CERT_FILE_PATH` - The path to the certificate file in OWN_CERT mode from the mounted volume. Defaults to `cert.pem`
- `SSL_KEY_FILE_PATH` - The name of the key file in OWN_CERT mode from the mounted volume. Defaults to `key.pem`
