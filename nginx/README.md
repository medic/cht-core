# CHT NGINX

This folder contains the set up for the CHT Nginx Image.  It operates in 3 modes;

1. Creating a self signed certificate
2. Using a certificate that is already issued by a certification authority
3. Auto generating the ssl certificate using [ACME.sh](https://github.com/acmesh-official/acme.sh)

## Required Environment Variables

1. CERTIFICATE_MODE: This is used to decide which ssl certificate mode to use when starting nginx. Options are:
   1. `OWN_CERT` - bring your own TLS certificate. The docker container should be pointed to a drive location that contains both the the certificate amd private key mounted at `/etc/nginx/private/cert.pem` and `/etc/nginx/private/key.pem` respectively.
   1. `AUTO_GENERATE` - generate new TLS certificate using [Let's Encrypt](https://letsencrypt.org/). To persist the results of this operation on container restart, you need  to map a volume that stores this ssl certificate at `/root/.acme.sh/`
   1. `SELF_SIGNED` - to generate a self signed certificate based on env vars below

2. COMMON_NAME: This is the domain name of the instance. This field is manadatory.
3. EMAIL:  The registration email. This field is mandatory
4. COUNTRY: Registartion country in [ISO-3166-1 ALPHA-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) format.
5. STATE: State registration
6. LOCALITY: Locatlity registration
7. ORGANISATION: Organistaion registration
8. DEPARTMENT: The department.
