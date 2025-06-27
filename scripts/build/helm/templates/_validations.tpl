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

{{- /* CouchDB clustering validations */ -}}
{{- if .Values.couchdb.clusteredCouchEnabled }}
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

{{- /* EKS-specific validations */ -}}
{{- if eq .Values.cluster_type "eks" }}
{{- if eq (toString .Values.couchdb_data.preExistingDataAvailable) "true" }}
{{- if not (index .Values.ebs "preExistingEBSVolumeID-1") }}
{{- fail "preExistingEBSVolumeID-1 is required when preExistingDataAvailable is true on EKS. Please set it in your values file." }}
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
