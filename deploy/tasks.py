from invoke import task
import os
import subprocess
import yaml

@task
def prepare(c, f):
    with open(f, 'r') as stream:
        try:
            values = yaml.safe_load(stream)
        except yaml.YAMLError as exc:
            print(exc)
            exit(1)
    environment = values.get('environment', '')
    subprocess.run(["./prepare.sh", environment], check=True)

@task
def load_values(c, f):
    if not f:
        print("No values file provided. Please specify a values file using -f <file>")
        exit(1)
    with open(f, 'r') as stream:
        values = yaml.safe_load(stream)
    return values

@task
def determine_namespace(c, f, values):
    namespace = values.get('namespace', '')
    if not namespace:
        print("Namespace is not specified.")
        exit(1)
    return namespace

@task
def check_namespace_exists(c, namespace):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    namespace_exists = subprocess.run(["kubectl", "get", "namespace", namespace], capture_output=True, text=True).returncode
    if namespace_exists != 0:
        print(f"Namespace {namespace} does not exist. Creating the namespace.")
        namespace_manifest = f'''
apiVersion: v1
kind: Namespace
metadata:
  name: {namespace}
'''
        with open(os.path.join(script_dir, "helm", "namespace.yaml"), 'w') as manifest_file:
            manifest_file.write(namespace_manifest)
        subprocess.run(["kubectl", "apply", "-f", os.path.join(script_dir, "helm", "namespace.yaml")], check=True)
    else:
        print(f"Namespace {namespace} already exists.")

@task
def obtain_certificate_and_key(c):
    print("Obtaining certificate from local-ip.co...")
    subprocess.run(["curl", "http://local-ip.co/cert/server.pem", "-o", "certificate.crt"], check=True)
    subprocess.run(["curl", "http://local-ip.co/cert/server.key", "-o", "private.key"], check=True)

@task
def create_secret(c, namespace):
    print("Checking if secret api-tls-secret already exists...")
    secret_exists = subprocess.run(["kubectl", "get", "secret", "api-tls-secret", "-n", namespace], capture_output=True, text=True).returncode
    if secret_exists != 0:
        print("Secret does not exist. Creating Secret from certificate and key...")
        subprocess.run(["kubectl", "-n", namespace, "create", "secret", "tls", "api-tls-secret", "--cert=certificate.crt", "--key=private.key"], check=True)
    else:
        print("Secret api-tls-secret already exists.")

@task
def helm_install_or_upgrade(c, f, namespace, values):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    chart_filename = "cht-chart-4.x.tgz"
    project_name = values.get('project_name', '')
    release_exists = subprocess.run(["helm", "list", "-n", namespace], capture_output=True, text=True).stdout
    if project_name in release_exists:
        print("Release exists. Performing upgrade.")
        subprocess.run(["helm", "upgrade", "--install", project_name, os.path.join(script_dir, "helm", chart_filename), "--namespace", namespace, "--values", f], check=True)
    else:
        print("Release does not exist. Performing install.")
        subprocess.run(["helm", "install", project_name, os.path.join(script_dir, "helm", chart_filename), "--namespace", namespace, "--values", f], check=True)

@task
def install(c, f):
    prepare(c, f)
    values = load_values(c, f)
    namespace = determine_namespace(c, f, values)
    check_namespace_exists(c, namespace)
    if values.get('environment', '') == 'local':
        obtain_certificate_and_key(c)
        create_secret(c, namespace)
    helm_install_or_upgrade(c, f, namespace, values)
