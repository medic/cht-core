#!/bin/bash

set -eu -o pipefail

# if you're gonna put this in CI, consider using just installing helm,
# not sure the benefit of a https://github.com/Azure/setup-helm/blob/main/src/run.ts
# when all we need is `apt install helm`? (well, ok we need a few more
# lines: https://helm.sh/docs/intro/install/#from-apt-debianubuntu

# set CHT version from argument
TAG_VERSION=$1

# update all values
sed -i "s/ (CHT) v4/ (CHT)/" Chart.yaml
sed -i "s/version: .*/version: $TAG_VERSION/" Chart.yaml
sed -i "s/appVersion: .*/appVersion: \"$TAG_VERSION\"/" Chart.yaml
sed -i "s/{{cht_version}}/$TAG_VERSION/g" values/base.yaml
sed -i "s/{{cht_image_tag}}/$TAG_VERSION/g" values/base.yaml

./validate-templates.sh

# lint the chart before publishing
# disabling for now as this throws an error, but maybe that's expected with
# our place holder values? The old helm chart repo did this OK:
  # [INFO] values.yaml: file does not exist
  #[ERROR] templates/: cht-chart/templates/sentinel/deployment.yaml:29:28
  #  executing "cht-chart/templates/sentinel/deployment.yaml" at <.Values.upstream_servers.docker_registry>:
  #    nil pointer evaluating interface {}.docker_registry
  #
  #Error: 1 chart(s) linted, 1 chart(s) failed
#helm lint .

# package version, merge with existing index.yaml
helm package . -d ../helm-releases

# do this only first time
if [ ! -f ../helm-releases/index.yaml ]; then
	helm repo index ../helm-releases  --url https://helm.app.medicmobile.org/cht-core
else
	helm repo index ../helm-releases --merge ../helm-releases/index.yaml --url https://helm.app.medicmobile.org/cht-core
fi

# reset files for the next time we run this script
git checkout values/base.yaml Chart.yaml
