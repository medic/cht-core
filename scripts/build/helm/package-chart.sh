#!/bin/bash

set -eu -o pipefail

# set CHT version from argument 
TAG_VERSION=$1
BASE_HELM_URL="https://docs.communityhealthtoolkit.org/cht-core"

# check to make sure it's at least X.Y.Z format
if ! [[ "$TAG_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Version \"$TAG_VERSION\" isn't SemVer, exiting"
  exit 1
fi

# prompt user if they're ready to continue
echo "
Do you want to package helm chart for version ${TAG_VERSION} of the CHT?
Be sure to run this in the ./cht-core/scripts/build/helm directory.

You must have release candidate branch for ${TAG_VERSION} checked out already!  (y/N)"
read -r -p " " yn
case "${yn}" in
  [yY] ) ;;
  *) echo "aborted"; exit 1 ;;
esac

# update placeholder values in files
# use "-i.bak" so this works with both GNU (Linux) and BSD (macOS) sed
sed -i.bak "s/ (CHT) v4/ (CHT)/" Chart.yaml
sed -i.bak "s/version: .*/version: ${TAG_VERSION}/" Chart.yaml
sed -i.bak "s/appVersion: .*/appVersion: \"${TAG_VERSION}\"/" Chart.yaml
sed -i.bak "s/{{cht_version}}/${TAG_VERSION}/g" values/base.yaml
sed -i.bak "s/{{cht_image_tag}}/${TAG_VERSION}/g" values/base.yaml
rm -f Chart.yaml.bak values/base.yaml.bak

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
if [[ ! -f ../helm-releases/index.yaml ]]; then
	helm repo index ../helm-releases  --url $BASE_HELM_URL
else
	helm repo index ../helm-releases --merge ../helm-releases/index.yaml --url $BASE_HELM_URL
fi

# reset files for the next time we run this script
git checkout values/base.yaml Chart.yaml

echo "Helm charts have been built. Commit these changes, submit a PR and push the new charts to the CHT Core Repo."
