FROM ubuntu:16.04
MAINTAINER DevOps "devops@medicmobile.org"


RUN echo "==> Installing Python dependencies" && \
    apt-get update -y   && \
    apt-get install --no-install-recommends -y -q \
            build-essential python-setuptools     \
            python python-pip python-dev          \
            libffi-dev  libssl-dev                \
            libxml2-dev libxslt1-dev zlib1g-dev   \
            git wget python-wheel curl

RUN echo "====> Installing medic-conf python stuff"    &&\
    python -m pip install git+https://github.com/medic/pyxform.git@medic-conf-1.17#egg=pyxform-medic

RUN curl -sL https://deb.nodesource.com/setup_6.x -o nodesource_setup.sh
RUN bash nodesource_setup.sh
RUN apt-get install -y nodejs

RUN npm install -g medic-conf

CMD ["tail", "-f", "/dev/null"]