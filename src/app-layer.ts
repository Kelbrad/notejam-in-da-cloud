import cdk = require('@aws-cdk/core');
import ecs = require('@aws-cdk/aws-ecs');
import ec2 = require('@aws-cdk/aws-ec2');
import ecsPatterns = require('@aws-cdk/aws-ecs-patterns');
import elbv2 = require('@aws-cdk/aws-elasticloadbalancingv2');
import db = require('./config/db.json');
import autoscaling = require('@aws-cdk/aws-autoscaling');
import cf = require('@aws-cdk/aws-cloudfront');
import {Assembler} from "./notejam";
import {Network} from "./network";
import {ViewerProtocolPolicy} from "@aws-cdk/aws-cloudfront";
import {OriginProtocolPolicy} from "@aws-cdk/aws-cloudfront";
import {CloudFrontAllowedMethods} from "@aws-cdk/aws-cloudfront";

export class AppLayer extends cdk.Stack {

    private readonly _ecsCluster: ecs.Cluster;
    private readonly _ecsService: ecsPatterns.ApplicationLoadBalancedEc2Service;
    private readonly _cfDistribution: cf.CloudFrontWebDistribution;

    constructor(assembler: Assembler) {

        super(
            assembler.appRoot,
            assembler.environment.resourcesPrefix('NoteJamAppLayer'),
            assembler.stackProps
        );

        this._ecsCluster = new ecs.Cluster(this, 'NoteJamCluster', {
            vpc: assembler.network.vpc,
            clusterName: 'NoteJamCluster'
        });
        this._ecsCluster.addCapacity('DefaultCapacity', {
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
            minCapacity: 2,
            maxCapacity: 4,
            vpcSubnets: {subnetGroupName: Network.SUBNET_GROUP_PRIVATE},
            keyName: 'ECSNodes',
            updateType: autoscaling.UpdateType.ROLLING_UPDATE,
        });

        this._ecsService = new ecsPatterns.ApplicationLoadBalancedEc2Service(this, 'NoteJamService', {
            serviceName: 'NoteJamService',
            cluster: this._ecsCluster,
            memoryLimitMiB: 460,
            cpu: 1024,
            taskImageOptions: {
                containerName: 'NoteJamApplicationContainer',
                image: ecs.ContainerImage.fromEcrRepository(assembler.commons.noteJamRepo, 'latest'),
                environment: {
                    SPRING_DATASOURCE_URL:
                        `jdbc:postgresql://${assembler.dataLayer.db.dbInstanceEndpointAddress}:${assembler.dataLayer.db.dbInstanceEndpointPort}/${db[assembler.environment.environmentType].dbName}`,
                    SPRING_DATASOURCE_USERNAME: db[assembler.environment.environmentType].dbUserName,
                    SPRING_DATASOURCE_PASSWORD: db[assembler.environment.environmentType].dbPassword
                },
                containerPort: 8080
            },
            desiredCount: 2,
            protocol: elbv2.ApplicationProtocol.HTTP,
            publicLoadBalancer: true
        });
        this._ecsService.targetGroup.enableCookieStickiness(cdk.Duration.hours(24));
        this._ecsService.targetGroup.configureHealthCheck({
            protocol: elbv2.Protocol.HTTP,
            interval: cdk.Duration.seconds(10),
            timeout: cdk.Duration.seconds(5),
            healthyThresholdCount: 2,
            path: '/signin',
            healthyHttpCodes: '200'
        });

        this._cfDistribution = new cf.CloudFrontWebDistribution(this, 'NoteJam', {
            viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            defaultRootObject: '',
            originConfigs: [{
                customOriginSource: {
                    domainName: this._ecsService.loadBalancer.loadBalancerDnsName,
                    originProtocolPolicy: OriginProtocolPolicy.HTTP_ONLY,
                },
                behaviors: [{
                    compress: true,
                    defaultTtl: cdk.Duration.days(1),
                    minTtl: cdk.Duration.days(1),
                    maxTtl: cdk.Duration.days(1),
                    pathPattern: '/css/*'
                }, {
                    isDefaultBehavior: true,
                    allowedMethods: CloudFrontAllowedMethods.ALL,
                    forwardedValues: {
                        queryString: true,
                        cookies: {
                            forward: 'all'
                        },
                        headers: ['Host']
                    },
                    defaultTtl: cdk.Duration.seconds(0),
                    minTtl: cdk.Duration.seconds(0),
                    maxTtl: cdk.Duration.seconds(0)
                }],
            }],
        });

    }

    get ecsCluster(): ecs.Cluster {
        return this._ecsCluster;
    }

    get ecsService(): ecsPatterns.ApplicationLoadBalancedEc2Service {
        return this._ecsService;
    }

    get cfDistribution(): cf.CloudFrontWebDistribution {
        return this._cfDistribution;
    }

}