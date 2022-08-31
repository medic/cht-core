setup() {
    load '/opt/bats-support/load'
    load '/opt/bats-assert/load'
    load '/app/bash-shellmock/shellmock'
    # get the containing directory of this file
    # use $BATS_TEST_FILENAME instead of ${BASH_SOURCE[0]} or $0,
    # as those will point to the bats executable's location or the preprocessed file respectively
    DIR="$( cd "$( dirname "$BATS_TEST_FILENAME" )" >/dev/null 2>&1 && pwd )"

     #shellcheck
    . shellmock

    #create temp cert files
    base_temp_path="$TEST_TEMP_DIR/tmp/bats/etc/nginx/private"
    mkdir -p $base_temp_path
    export SSL_CERT_FILE_PATH="$base_temp_path/cert.pem"
    export SSL_KEY_FILE_PATH="$base_temp_path/key.pem"


}

teardown()
{
    if [ -z "$TEST_FUNCTION" ]; then
        shellmock_clean
    fi
    if [ -d "$TEST_TEMP_DIR" ]; then
        rm -rf "$TEST_TEMP_DIR"
    fi

    rm -rf $base_temp_path
}


@test "ssl selection script can run" {
    run ssl-install.sh  welcome_message
    assert_output --partial "Running SSL certificate checks"
}


@test "if CERTIFICATE_MODE environment variable is not set we return an error message" {
    run ssl-install.sh  select_ssl_certificate_mode
    assert_output --partial "ssl certificate mode unknown or not set. Please set a proper ssl sertificate mode in the CERTIFICATE_MODE variable"
}

@test "Bring your own cert mode but certificates not provided returns an appropriate error message" {
    export CERTIFICATE_MODE="OWN_CERT"
    run ssl-install.sh  select_ssl_certificate_mode
    assert_output --partial "Please provide add your certificate"
}

@test "Bring your own cert mode with certificates set succeeds" {
    export CERTIFICATE_MODE="OWN_CERT"
    touch $SSL_CERT_FILE_PATH
    touch $SSL_KEY_FILE_PATH
    run ssl-install.sh  main
    rm -rf $SSL_CERT_FILE_PATH
    rm -rf $SSL_CERT_FILE_PATH
    assert_output --partial "Running SSL certificate checks"
    assert_output --partial "SSL certificate exists."
    assert_output --partial "Launching Nginx"
}

@test "SSL cert generation works if the CERTIFICATE_MODE is set to SELF_SIGNED  " {
    export CERTIFICATE_MODE="SELF_SIGNED"
    export COMMON_NAME="test.dev.medic.org"
    run ssl-install.sh  main
    assert_output  --partial "RSA private key"
    assert_output  --partial "Launching Nginx"
}

@test "If self signed certificate exists we do not create a new one" {
    export CERTIFICATE_MODE="SELF_SIGNED"
    touch $SSL_CERT_FILE_PATH
    touch $SSL_KEY_FILE_PATH
    run ssl-install.sh  main
    rm -rf $SSL_CERT_FILE_PATH
    rm -rf $SSL_CERT_FILE_PATH
    assert_output  --partial "self signed SSL cert already exists"
    assert_output  --partial "Launching Nginx"
}

@test "SSL certificate auto generation fails if common name is not set" {
    export CERTIFICATE_MODE="AUTO_GENERATE"
    run ssl-install.sh  main
    assert_output --partial "Mandatory COMMON_NAME variable not set. Please provide the domain for which to generate the ssl certificate from let's encrypt"
}

@test "SSL certificate auto generation fails if email is not set" {
    export CERTIFICATE_MODE="AUTO_GENERATE"
    export COMMON_NAME="test.dev.medic.org"
    run ssl-install.sh  main
    assert_output --partial "Mandatory EMAIL variable not set. Please provide the domain for which to generate the ssl certificate from let's encrypt"
}

@test "SSL certificate auto generation does not generate a new certificate if one exists" {
    export CERTIFICATE_MODE="AUTO_GENERATE"
    export COMMON_NAME="test.dev.medic.org"
    export EMAIL="test@medic.org"
    touch $SSL_CERT_FILE_PATH
    touch $SSL_KEY_FILE_PATH
    run ssl-install.sh  main
    rm -rf $SSL_CERT_FILE_PATH
    rm -rf $SSL_CERT_FILE_PATH
    assert_output  --partial "SSL cert already exists."
    assert_output  --partial "Launching Nginx"
}
