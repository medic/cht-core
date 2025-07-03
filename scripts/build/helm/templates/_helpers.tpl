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
