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

