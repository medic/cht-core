{{- /* Global validation template for required values */ -}}
{{- define "cht-chart-4x.validations" -}}

{{- /* Required global values */ -}}
{{- if not .Values.project_name }}
{{- fail "project_name is required. Please set it in your values file." }}
{{- end }}

{{- if not .Values.namespace }}
{{- fail "namespace is required. Please set it in your values file." }}
{{- end }}

{{- /* Required CouchDB values */ -}}
{{- if not .Values.couchdb.password }}
{{- fail "couchdb.password is required. Please set it in your values file." }}
{{- end }}

{{- if not .Values.couchdb.secret }}
{{- fail "couchdb.secret is required. Please set it in your values file." }}
{{- end }}

{{- if not .Values.couchdb.uuid }}
{{- fail "couchdb.uuid is required. Please set it in your values file." }}
{{- end }}

{{- /* Required storage values */ -}}
{{- if not .Values.couchdb.couchdb_node_storage_size }}
{{- fail "couchdb.couchdb_node_storage_size is required. Please set it in your values file." }}
{{- end }}

{{- /* CouchDB clustering validations */ -}}
{{- if .Values.couchdb.clusteredCouchEnabled }}
{{- /* Skip node validation for k3d testing - allow all pods to run on same node */ -}}
{{- if and (ne .Values.cluster_type "k3s-k3d") (ne .Values.environment "local") }}
{{- if not (index .Values.nodes "node-1") }}
{{- fail "node-1 is required when clusteredCouchEnabled is true. Please set it in your values file." }}
{{- end }}
{{- if not (index .Values.nodes "node-2") }}
{{- fail "node-2 is required when clusteredCouchEnabled is true. Please set it in your values file." }}
{{- end }}
{{- if not (index .Values.nodes "node-3") }}
{{- fail "node-3 is required when clusteredCouchEnabled is true. Please set it in your values file." }}
{{- end }}
{{- end }}
{{- end }}

{{- /* EKS-specific validations */ -}}
{{- if eq .Values.cluster_type "eks" }}
{{- if eq (toString .Values.couchdb_data.preExistingDataAvailable) "true" }}
{{- if not (index .Values.ebs "preExistingEBSVolumeID-1") }}
{{- fail "preExistingEBSVolumeID-1 is required when preExistingDataAvailable is true on EKS. Please set it in your values file." }}
{{- end }}
{{- if not .Values.ebs.preExistingEBSVolumeSize }}
{{- fail "ebs.preExistingEBSVolumeSize is required when preExistingDataAvailable is true on EKS. Please set it in your values file." }}
{{- end }}
{{- end }}
{{- end }}

{{- /* GKE-specific validations */ -}}
{{- if eq .Values.cluster_type "gke" }}
{{- if eq (toString .Values.couchdb_data.preExistingDataAvailable) "true" }}
{{- if not .Values.couchdb.persistent_disk.size }}
{{- fail "couchdb.persistent_disk.size is required when preExistingDataAvailable is true on GKE. Please set it in your values file." }}
{{- end }}
{{- if .Values.couchdb.clusteredCouchEnabled }}
{{- range $i, $e := until (int .Values.clusteredCouch.noOfCouchDBNodes) }}
{{- $nodeNumber := add $i 1 }}
{{- if not (index $.Values.couchdb.persistent_disk (printf "diskName-%d" $nodeNumber)) }}
{{- fail (printf "couchdb.persistent_disk.diskName-%d is required when clusteredCouchEnabled is true and preExistingDataAvailable is true on GKE. Please set it in your values file." $nodeNumber) }}
{{- end }}
{{- end }}
{{- else }}
{{- if not .Values.couchdb.persistent_disk.diskName }}
{{- fail "couchdb.persistent_disk.diskName is required when preExistingDataAvailable is true on GKE. Please set it in your values file." }}
{{- end }}
{{- end }}
{{- end }}
{{- end }}

{{- /* K3s vSphere validations */ -}}
{{- if eq .Values.cluster_type "k3s-k3d" }}
{{- if eq (toString .Values.k3s_use_vSphere_storage_class) "true" }}
{{- if not .Values.vSphere.datastoreName }}
{{- fail "vSphere.datastoreName is required when k3s_use_vSphere_storage_class is true. Please set it in your values file." }}
{{- end }}
{{- if not .Values.vSphere.diskPath }}
{{- fail "vSphere.diskPath is required when k3s_use_vSphere_storage_class is true. Please set it in your values file." }}
{{- end }}
{{- end }}
{{- end }}

{{- end -}}
