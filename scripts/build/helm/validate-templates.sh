#!/bin/bash

set -e

echo "Starting Helm template validation..."

run_validation() {
    local test_name="$1"
    local values_files="$2"

    echo "Testing: $test_name"

    if eval "helm template test . $values_files" > /dev/null 2>&1; then
        echo "PASS: $test_name"
        return 0
    else
        echo "FAIL: $test_name"
        echo "Command that failed: helm template test . $values_files"
        return 1
    fi
}

overall_success=true

echo ""
echo "Running New Instance Validations..."

if ! run_validation "Single Node (new instance) - GKE" \
    "-f values/base.yaml -f values/deployment-single.yaml -f values/platform-gke.yaml -f tests/single-new.yaml"; then
    overall_success=false
fi

if ! run_validation "Single Node (new instance) - EKS" \
    "-f values/base.yaml -f values/deployment-single.yaml -f values/platform-eks.yaml -f tests/single-new.yaml"; then
    overall_success=false
fi

if ! run_validation "Single Node (new instance) - K3s-K3d" \
    "-f values/base.yaml -f values/deployment-single.yaml -f values/platform-k3s-k3d.yaml -f tests/single-new.yaml"; then
    overall_success=false
fi

if ! run_validation "Multi Node (new instance) - GKE" \
    "-f values/base.yaml -f values/deployment-multi.yaml -f values/platform-gke.yaml -f tests/multi-new.yaml"; then
    overall_success=false
fi

if ! run_validation "Multi Node (new instance) - EKS" \
    "-f values/base.yaml -f values/deployment-multi.yaml -f values/platform-eks.yaml -f tests/multi-new.yaml"; then
    overall_success=false
fi

if ! run_validation "Multi Node (new instance) - K3s-K3d" \
    "-f values/base.yaml -f values/deployment-multi.yaml -f values/platform-k3s-k3d.yaml -f tests/multi-new.yaml"; then
    overall_success=false
fi

echo ""
echo "Running Pre-existing Data Validations..."

if ! run_validation "GKE Single Node (pre-existing data)" \
    "-f values/base.yaml -f values/deployment-single.yaml -f values/platform-gke.yaml -f tests/pre-existing.yaml --set couchdb.persistent_disk.size=100Gi --set couchdb.persistent_disk.diskName=disk1"; then
    overall_success=false
fi

if ! run_validation "GKE Multi Node (pre-existing data)" \
    "-f values/base.yaml -f values/deployment-multi.yaml -f values/platform-gke.yaml -f tests/pre-existing.yaml --set couchdb.persistent_disk.size=100Gi --set couchdb.persistent_disk.diskName-1=disk1 --set couchdb.persistent_disk.diskName-2=disk2 --set couchdb.persistent_disk.diskName-3=disk3"; then
    overall_success=false
fi

if ! run_validation "EKS Single Node (pre-existing data)" \
    "-f values/base.yaml -f values/deployment-single.yaml -f values/platform-eks.yaml -f tests/pre-existing.yaml --set ebs.preExistingEBSVolumeSize=100Gi --set ebs.preExistingEBSVolumeID-1=vol-12345678"; then
    overall_success=false
fi

if ! run_validation "EKS Multi Node (pre-existing data)" \
    "-f values/base.yaml -f values/deployment-multi.yaml -f values/platform-eks.yaml -f tests/pre-existing.yaml --set ebs.preExistingEBSVolumeSize=100Gi --set ebs.preExistingEBSVolumeID-1=vol-12345678 --set ebs.preExistingEBSVolumeID-2=vol-87654321 --set ebs.preExistingEBSVolumeID-3=vol-11223344"; then
    overall_success=false
fi

if ! run_validation "K3s-K3d Single Node (pre-existing data)" \
    "-f values/base.yaml -f values/deployment-single.yaml -f values/platform-k3s-k3d.yaml -f tests/pre-existing.yaml --set local_storage.preExistingDiskPath-1=/var/lib/couchdb1"; then
    overall_success=false
fi

if ! run_validation "K3s-K3d Multi Node (pre-existing data)" \
    "-f values/base.yaml -f values/deployment-multi.yaml -f values/platform-k3s-k3d.yaml -f tests/pre-existing.yaml --set local_storage.preExistingDiskPath-1=/var/lib/couchdb1 --set local_storage.preExistingDiskPath-2=/var/lib/couchdb2 --set local_storage.preExistingDiskPath-3=/var/lib/couchdb3"; then
    overall_success=false
fi

echo ""
if [ "$overall_success" = true ]; then
    echo "All validations passed!"
    exit 0
else
    echo "Some validations failed!"
    exit 1
fi
