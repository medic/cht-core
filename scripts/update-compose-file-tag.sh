#!/usr/bin/env bash

#
#       ********* ABOUT ***********
# Helper script to easily replace a given CHT Core compose files with a new tag.
# Ideal for deploying Feature Releases or testing branches on development docker instances
# hosted in the CHT Docker Helper 4.x.  Feature Releases are not currently available in the
# admin web GUI.
#
# Feature Releases: https://docs.communityhealthtoolkit.org/core/releases/feature_releases/
# Docker Helper: https://docs.communityhealthtoolkit.org/apps/guides/hosting/4.x/app-developer/#cht-docker-helper-for-4x
#
#       ********* USAGE ***********
#
#   ./update-compose-file-tag.sh TAG COMPOSE_FILE
#
#       ********* EXAMPLE ***********
#
# Here is the "4.0.1-4.0.1" tag in the compose file before
#
#  $ grep image ~/.medic/cht-docker/supervisor-chw/compose/cht-core.yml
#
#    image: public.ecr.aws/s5s3h4s7/cht-haproxy:4.0.1-4.0.1
#    image: public.ecr.aws/s5s3h4s7/cht-haproxy-healthcheck:4.0.1-4.0.1
#    image: public.ecr.aws/s5s3h4s7/cht-api:4.0.1-4.0.1
#    image: public.ecr.aws/s5s3h4s7/cht-sentinel:4.0.1-4.0.1
#    image: public.ecr.aws/s5s3h4s7/cht-nginx:4.0.1-4.0.1
#
# then we run the update script
#
# $ ./update-compose-file-tag.sh 4.1.0-FR-supervisor-chw-beta.4  ~/.medic/cht-docker/supervisor-chw/compose/cht-core.yml
#
# and the tags are all updated now:
#
#  $ grep image ~/.medic/cht-docker/supervisor-chw/compose/cht-core.yml
#
#    image: public.ecr.aws/s5s3h4s7/cht-haproxy:4.1.0-FR-supervisor-chw-beta.4
#    image: public.ecr.aws/s5s3h4s7/cht-haproxy-healthcheck:4.1.0-FR-supervisor-chw-beta.4
#    image: public.ecr.aws/s5s3h4s7/cht-api:4.1.0-FR-supervisor-chw-beta.4
#    image: public.ecr.aws/s5s3h4s7/cht-sentinel:4.1.0-FR-supervisor-chw-beta.4
#    image: public.ecr.aws/s5s3h4s7/cht-nginx:4.1.0-FR-supervisor-chw-beta.4
#
# After running this stop and then start your docker containers to upgrade to the new version of CHT

tag="${1}"
compose_file="${2}"

sed -ri "s/(image: public.ecr.aws\/s5s3h4s7\/[a-zA-Z0-9\.-]+):(.+)/\1\:${tag}/g" "${compose_file}"
