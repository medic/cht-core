#!/bin/sh
echo '--- Outer dependencies' && \
npm ci && \
echo '--- Webapp' && \
cd webapp && npm ci && cd .. && \
echo '--- Admin' && \
cd admin && npm ci && cd .. && \
echo '--- ‍Api' && \
cd api && npm ci && cd .. && \
echo '--- Sentinel' && \
cd sentinel && npm ci && cd .. && \
echo '--- Done'
