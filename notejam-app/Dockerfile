FROM 738869333860.dkr.ecr.eu-west-1.amazonaws.com/tomcat-base:latest
# We are using tomcat base image with deleted webapps folder 
# as this is a problem if you build as non-root user
# magnolia development mode switch
ARG VERSION

ENV CATALINA_BASE=${CATALINA_BASE:-$CATALINA_HOME}

ENV SPRING_DATASOURCE_URL=""\
  SPRING_DATASOURCE_USERNAME="" \
  SPRING_DATASOURCE_PASSWORD="" \
  SPRING_JPA_DATABASE-PLATFORM="org.hibernate.dialect.PostgreSQL9Dialect"

RUN chown -R 5000.5000 /usr/local/tomcat/conf \
  && chown -R 5000.5000 /usr/local/tomcat/temp \
  && useradd -U -d /usr/local/tomcat -M -s /bin/false tomcat -u 5000 \
  && echo ${VERSION} > /var/docker_version_file

# Copy tomcat environment configuration file
#COPY target/tomcatconf/setenv.sh ${CATALINA_BASE}/bin/setenv.sh

# Install magnolia webapp in root context
COPY target/spring-*.war ${CATALINA_BASE}/webapps/ROOT.war
#Override startup script
#COPY usr/local/tomcat/bin/catalina.sh /usr/local/tomcat/bin/catalina.sh
#COPY usr/local/tomcat/conf/server.xml /usr/local/tomcat/conf/server.xml

RUN echo {\"version\":\"$VERSION\"} > /version

#Switch user to tomcat
USER tomcat

# Run tomcat container
CMD ["catalina.sh", "run"]

EXPOSE 8080 8009
