FROM tomcat:8.5
USER root
RUN apt-get update \
  && apt-get install -y vim curl postgresql-client \
  && curl -L https://github.com/stedolan/jq/releases/download/jq-1.6/jq-linux64 --output /bin/jq \
  && chmod +x /bin/jq \
  && apt-get purge -y --auto-remove -o APT::AutoRemove::RecommendsImportant=false $buildDeps \
  && rm -rf /var/lib/apt/lists/* \
  && rm -rf /usr/local/tomcat/webapps/* \
  && chmod 777 /usr/local/tomcat/webapps
