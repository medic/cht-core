# CHT NGINX

This folder contains the set up for the CHT Nginx Image.  It operates in 3 modes;

1. Creating a self signed certificate
2. Using a certificate that is already issued by a certification authority
3. Auto generating the ssl certificate using [ACME.sh](https://github.com/acmesh-official/acme.sh)

## Required Environment Variables

- `CERTIFICATE_MODE`: This is used to decide which ssl certificate mode to use when starting nginx. Options are
  - `OWN_CERT` used if you already have an ssl certificate that you would like to use. To use this option, the docker container should be pointed to a drive location that contains both the certificate and private key mounted at `/etc/nginx/private/cert.pem` and `/etc/nginx/private/key.pem` respectively.
  - `AUTO_GENERATE` used if you would like to generate a new ssl certificate using letsencrypt. To persist the results of this operation on container restart, you need to map a volume that stores this ssl certificate at `/root/.acme.sh/`
  - `SELF_SIGNED` used if you would like to generate a self signed certificate.
- `COMMON_NAME`: This is the domain name of the instance. This field is manadatory.
- `EMAIL`:  The registration email. This field is mandatory
- `COUNTRY`: Registartion country in [ISO-3166-1 ALPHA-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) format.
- `STATE`: State registration
- `LOCALITY`: Locatlity registration
- `ORGANISATION`: Organistaion registration
- `DEPARTMENT`: The department
