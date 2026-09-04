{{- define "platforms.persistentVolume" -}}
{{- $platform := .platform -}}
{{- $namespace := .namespace -}}
{{- $nodeNumber := .nodeNumber | default "1" -}}
{{- $isMultiNode := .isMultiNode | default false -}}

{{- $name := "" -}}
{{- if $isMultiNode -}}
{{- $name = printf "couchdb-pv-%s-%s" $namespace $nodeNumber -}}
{{- else -}}
{{- $name = printf "couchdb-pv-%s" $namespace -}}
{{- end -}}

apiVersion: v1
kind: PersistentVolume
metadata:
  name: {{ $name }}
spec:
  capacity:
    storage: {{ .storageSize }}
  volumeMode: Filesystem
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
{{- if eq $platform "gcp" }}
  gcePersistentDisk:
    pdName: {{ .diskName }}
    fsType: ext4
    partition: {{ .partition | default "0" }}
{{- else if eq $platform "aws" }}
  csi:
    driver: ebs.csi.aws.com
    volumeHandle: {{ .volumeHandle }}
    fsType: ext4
    volumeAttributes:
      partition: "{{ .partition | default "0" }}"
{{- else if eq $platform "k3s-k3d" }}
  storageClassName: local-path
  hostPath:
    path: {{ .diskPath }}
    type: DirectoryOrCreate
{{- end }}
{{- end -}}

{{- define "couchdb.basicEnv" -}}
- name: COUCHDB_LOG_LEVEL
  value: info
- name: COUCHDB_PASSWORD
  valueFrom:
    secretKeyRef:
      name: cht-couchdb-credentials
      key: COUCHDB_PASSWORD
- name: COUCHDB_SECRET
  valueFrom:
    secretKeyRef:
      name: cht-couchdb-credentials
      key: COUCHDB_SECRET
- name: COUCHDB_USER
  valueFrom:
    secretKeyRef:
      name: cht-couchdb-credentials
      key: COUCHDB_USER
- name: COUCHDB_UUID
  valueFrom:
    secretKeyRef:
      name: cht-couchdb-credentials
      key: COUCHDB_UUID
{{- end -}}

{{- define "couchdb.securityContextAndTolerations" -}}
securityContext:
  runAsUser: 0  # Run as root
  fsGroup: 0    # Set fsGroup to root
{{- if .toleration }}
tolerations:
  - key: {{ .toleration.key }}
    operator: {{ .toleration.operator }}
    value: {{ .toleration.value | quote }}
    effect: {{ .toleration.effect }}
{{- end }}
{{- end -}}

{{- define "couchdb.servicePorts" -}}
ports:
  - name: couchdb{{ if .nodeNumber }}{{ .nodeNumber }}{{ end }}-service
    port: 5984
    protocol: TCP
    targetPort: 5984
  - name: epmd
    port: 4369
    protocol: TCP
    targetPort: 4369
  - name: erlang
    port: 9100
    protocol: TCP
    targetPort: 9100
{{- end -}}

{{- define "couchdb.pvcStorageClass" -}}
{{- if .couchdb_data.preExistingDataAvailable }}
volumeName: couchdb-pv-{{ .namespace }}{{ if .nodeNumber }}-{{ .nodeNumber }}{{ end }}
storageClassName: ""
{{- else }}
{{- if eq (toString .cluster_type) "eks" }}
storageClassName: {{ .couchdb.storage_class | default "ebs-gp2" }}  # Fallback for backward compatibility
{{- else if eq (toString .cluster_type) "gke" }}
storageClassName: {{ .couchdb.storage_class | default "standard-rwo" }}  # Fallback for backward compatibility
{{- else if eq (toString .cluster_type) "k3s-k3d" }}
storageClassName: {{ .couchdb.storage_class | default "local-path" }}
{{- end }}
{{- end }}
{{- end -}}
