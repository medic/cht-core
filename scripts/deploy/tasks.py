from invoke import task
import os
import subprocess
import yaml
import requests
import re
import json


@task
def prepare(c, f):
    with open(f, "r") as stream:
        try:
            values = yaml.safe_load(stream)
        except yaml.YAMLError as exc:
            print(exc)
            exit(1)
    environment = values.get("environment", "")
    subprocess.run(["./prepare.sh", environment], check=True)


@task
def load_values(c, f):
    if not f:
        print("No values file provided. Please specify a values file using -f <file>")
        exit(1)
    with open(f, "r") as stream:
        try:
            values = yaml.safe_load(stream)
        except yaml.YAMLError as exc:
            print(exc)
            exit(1)
    return values


@task
def determine_namespace(c, f, values):
    namespace = values.get("namespace", "")
    if not namespace:
        print("Namespace is not specified.")
        exit(1)
    return namespace


@task
def check_namespace_exists(c, namespace):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    namespace_exists = subprocess.run(
        ["kubectl", "get", "namespace", namespace], capture_output=True, text=True
    ).returncode
    if namespace_exists != 0:
        print(f"Namespace {namespace} does not exist. Creating the namespace.")
        namespace_manifest = f"""
apiVersion: v1
kind: Namespace
metadata:
  name: {namespace}
"""
        with open(
            os.path.join(script_dir, "helm", "namespace.yaml"), "w"
        ) as manifest_file:  # NOSONAR
            manifest_file.write(namespace_manifest)
        subprocess.run(
            [
                "kubectl",
                "apply",
                "-f",
                os.path.join(script_dir, "helm", "namespace.yaml"),
            ],
            check=True,
        )  # NOSONAR
        # Delete the namespace file after creation
        os.remove(os.path.join(script_dir, "helm", "namespace.yaml"))  # NOSONAR
    else:
        print(f"Namespace {namespace} already exists.")


@task
def obtain_certificate_and_key(c, values):  # NOSONAR
    print("Obtaining certificate...")
    if values.get("cert_source", "") == "specify-file-path":
        crt_file_path = values.get("certificate_crt_file_path", "")
        key_file_path = values.get("certificate_key_file_path", "")
        if crt_file_path and key_file_path:
            subprocess.run(
                ["cp", crt_file_path, "certificate.crt"], check=True
            )  # NOSONAR
            subprocess.run(["cp", key_file_path, "private.key"], check=True)  # NOSONAR
        else:
            raise Exception(
                "certificate_crt_file_path and certificate_key_file_path must be set in values when cert_source is 'specify-file-path'"
            )  # NOSONAR
    elif values.get("cert_source", "") == "my-ip-co":
        subprocess.run(
            [
                "curl",
                "https://local-ip.medicmobile.org/fullchain",
                "-o",
                "certificate.crt",
            ],
            check=True,
        )  # NOSONAR
        subprocess.run(
            ["curl", "https://local-ip.medicmobile.org/key", "-o", "private.key"],
            check=True,
        )  # NOSONAR
    elif values.get("cert_source", "") == "eks-medic":
        print("Moving on. Certificate provided by the eks cluster.")
    else:
        raise Exception(
            "cert_source must be either 'specify-file-path', 'my-ip-co', or 'eks-medic'"
        )  # NOSONAR


@task
def create_secret(c, namespace, values):
    print("Checking if secret api-tls-secret already exists...")
    secret_exists = subprocess.run(
        ["kubectl", "get", "secret", "api-tls-secret", "-n", namespace],
        capture_output=True,
        text=True,
    ).returncode
    if secret_exists != 0:
        print("Secret does not exist. Creating Secret from certificate and key...")
        obtain_certificate_and_key(
            c, values
        )  # Ensure the certificate and key are available before creating the secret
        subprocess.run(
            [
                "kubectl",
                "-n",
                namespace,
                "create",
                "secret",
                "tls",
                "api-tls-secret",
                "--cert=certificate.crt",
                "--key=private.key",
            ],
            check=True,
        )
        os.remove("certificate.crt")
        os.remove("private.key")
    else:
        print("Secret api-tls-secret already exists.")


@task
def get_image_tag(c, chtversion):
    response = requests.get(
        f"https://staging.dev.medicmobile.org/_couch/builds_4/medic:medic:{chtversion}"
    )
    response.raise_for_status()
    data = response.json()

    for tag in data["tags"]:
        if tag["container_name"] == "cht-api":
            image_tag = tag["image"].split(":")[-1]
            return image_tag

    raise Exception("cht image tag not found")  # NOSONAR


def setup_etc_hosts(c, values):  # NOSONAR
    # If the cluster_type is k3s-k3d and cert_source is my-ip-co, add the host to /etc/hosts
    if (
        values.get("cluster_type", "") == "k3s-k3d"
        and values.get("cert_source", "") == "my-ip-co"
    ):
        host = values.get("ingress", {}).get("host", "")
        proc = subprocess.Popen(["sudo", "cat", "/etc/hosts"], stdout=subprocess.PIPE)
        lines = [line.decode("utf-8") for line in proc.stdout.readlines()]

        # Regular expression for a host entry line
        host_re = re.compile(r"^127\.0\.0\.1\s+" + re.escape(host) + r"(\s|$)")

        # Check if the host line exists and points to 127.0.0.1
        if not any(host_re.match(line) for line in lines):
            command = ["sudo", "bash", "-c", f'echo "127.0.0.1 {host}" >> /etc/hosts']
            subprocess.run(command)
    else:
        print(
            "Cluster type is not k3s-k3d or ingress choice is not my-ip-co. Skipping /etc/hosts setup."
        )


@task
def add_route53_entry(c, f):  # NOSONAR
    values = load_values(c, f)
    host = values.get("ingress", {}).get("host", "")
    load_balancer = values.get("ingress", {}).get("load_balancer", "")
    hosted_zone_id = values.get("ingress", {}).get("hostedZoneId", "")

    if host and load_balancer and hosted_zone_id:
        # Check if the record already exists
        check_cmd = (
            f"aws route53 list-resource-record-sets --hosted-zone-id {hosted_zone_id}"
        )
        result = subprocess.run(check_cmd, shell=True, capture_output=True, text=True)
        records = json.loads(result.stdout)["ResourceRecordSets"]

        record_exists = any(
            record["Name"] == host and record["Type"] == "CNAME" for record in records
        )
        if not record_exists:
            # Add the record
            add_cmd = f'aws route53 change-resource-record-sets --hosted-zone-id {hosted_zone_id} --change-batch \'{{"Changes": [{{"Action": "CREATE", "ResourceRecordSet": {{"Name": "{host}", "Type": "CNAME", "TTL": 300, "ResourceRecords": [{{"Value": "{load_balancer}"}}]}}}}]}}\''
            subprocess.run(add_cmd, shell=True)
            print(f"Route53 entry added for {host}")
        else:
            print(f"Route53 entry for {host} already exists")


@task
def helm_install_or_upgrade(c, f, namespace, values, image_tag):  # NOSONAR
    script_dir = os.path.dirname(os.path.abspath(__file__))
    chart_filename = "cht-chart"
    project_name = values.get("project_name", "")
    release_exists = subprocess.run(
        ["helm", "list", "-n", namespace], capture_output=True, text=True
    ).stdout
    if project_name in release_exists:
        print("Release exists. Performing upgrade.")
        subprocess.run(
            [
                "helm",
                "upgrade",
                "--install",
                project_name,
                os.path.join(script_dir, "helm", chart_filename),
                "--namespace",
                namespace,
                "--values",
                f,
                "--set",
                f"cht_image_tag={image_tag}",
            ],
            check=True,
        )
    else:
        print("Release does not exist. Performing install.")
        subprocess.run(
            [
                "helm",
                "install",
                project_name,
                os.path.join(script_dir, "helm", chart_filename),
                "--namespace",
                namespace,
                "--values",
                f,
                "--set",
                f"cht_image_tag={image_tag}",
            ],
            check=True,
        )


@task
def install(c, f):
    prepare(c, f)
    values = load_values(c, f)
    namespace = determine_namespace(c, f, values)
    check_namespace_exists(c, namespace)
    if values.get("cluster_type", "") == "k3s-k3d":
        obtain_certificate_and_key(c, values)
        create_secret(c, namespace, values)
    if values.get("environment", "") == "local":
        setup_etc_hosts(c, values)
    image_tag = get_image_tag(c, values.get("chtversion", ""))
    helm_install_or_upgrade(c, f, namespace, values, image_tag)
    add_route53_entry(c, f)
