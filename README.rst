***************
Notejam: In Da Cloud
***************

Notejam application deployement to AWS environment with:
- VPC consistent of 6 subnets (2 public for ELB, 2 private for ECS cluster, 2 isolation for databases) in 2 AZs
- PostgreSQL database deployed in multi AZ
- Autoscaling ECS cluster with initially 2 EC2 instances (up to 4) and 2 tasks running (each containing single Notejam spring application deployed on tomcat) + ALB
- Cloudfront for static assets caching

Application & infrastructure provision is done via CDK (https://github.com/aws/aws-cdk)

==========================
Installation and launching
==========================

-------------
Configuration
-------------

- configure your AWS account (modify /docker/tomcat-base/build.sh, /notejam-app/build.sh and /src/config/general.json files include appropriate Account ID and Region)

-------
Install
-------

Installation scripts require Linux bash shell!

Install JDK (https://openjdk.java.net/).
Install Node.js 12+ (https://nodejs.org/en/).
Install Maven2 (https://maven.apache.org/).
Install Docker (https://www.docker.com/).
Install & configure AWS CLI (https://aws.amazon.com/cli/).

Install npm dependencies:
```
npm install
```

Deploy Commons stack (ECR repository):
```
npm run deploy:common:dev
```

Build & deploy to ECR Tomcat container:
```
npm run tomcat:base:build -- <container_version>
```
<container_version> should be normally provided by CI tool, you can pass here any string, this will be image tag

Build & deploy to ECR Notejam container:
```
npm run notejam:build -- <container_version>
```
<container_version> should be normally provided by CI tool, you can pass here any string, this will be image tag

Deploy AWS infrastructure:
```
npm run deploy:notejam:dev
```

To deploy new version of container run:
```
npm run notejam:build -- <container_version>
npm run update:notejam:dev
```
First command will build new version of container, second will deploy new version of container to ECS cluster