import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import {Assembler} from "./notejam";

export class Network extends cdk.Stack {

    public static readonly VPC_CIDR = '10.0.0.0/16';
    public static readonly SUBNET_GROUP_PUBLIC = 'Public';
    public static readonly SUBNET_GROUP_PRIVATE = 'Private';
    public static readonly SUBNET_GROUP_DATABASE = 'Database';

    private readonly _vpc: ec2.Vpc;

    private readonly _publicSubnets: ec2.ISubnet[];
    private readonly _privateSubnets: ec2.ISubnet[];
    private readonly _databaseSubnets: ec2.ISubnet[];

    private readonly _publicACL: ec2.NetworkAcl;
    private readonly _privateACL: ec2.NetworkAcl;
    private readonly _databaseACL: ec2.NetworkAcl;

    constructor(assembler: Assembler) {

        super(
            assembler.appRoot,
            assembler.environment.resourcesPrefix('NoteJamNetwork'),
            assembler.stackProps
        );

        this._vpc = new ec2.Vpc(this, 'NoteJamVpc', {
            cidr: Network.VPC_CIDR,
            maxAzs: 2,
            natGateways: 1,
            natGatewaySubnets: {
                subnetGroupName: Network.SUBNET_GROUP_PUBLIC
            },
            subnetConfiguration: [{
                subnetType: ec2.SubnetType.PUBLIC,
                name: Network.SUBNET_GROUP_PUBLIC,
                cidrMask: 24
            }, {
                subnetType: ec2.SubnetType.PRIVATE,
                name: Network.SUBNET_GROUP_PRIVATE,
                cidrMask: 24,
            }, {
                subnetType: ec2.SubnetType.ISOLATED,
                name: Network.SUBNET_GROUP_DATABASE,
                cidrMask: 24
            }]
        });
        this._publicSubnets = this._vpc.selectSubnets({subnetGroupName: Network.SUBNET_GROUP_PUBLIC}).subnets;
        this._privateSubnets = this._vpc.selectSubnets({subnetGroupName: Network.SUBNET_GROUP_PRIVATE}).subnets;
        this._databaseSubnets = this._vpc.selectSubnets({subnetGroupName: Network.SUBNET_GROUP_DATABASE}).subnets;

        this._publicACL = this.setupPublicACL();
        this._privateACL = this.setupPrivateACL();
        this._databaseACL = this.setupDatabaseACL();

    }

    private setupPrivateACL() {

        const privateACL = new ec2.NetworkAcl(this, 'PrivateACL', {
            networkAclName: 'PrivateACL',
            vpc: this._vpc,
            subnetSelection: {subnets: this._privateSubnets}
        });

        // ingress
        privateACL.addEntry('IngressSSH', {
            cidr: ec2.AclCidr.anyIpv4(),
            ruleNumber: 100,
            networkAclEntryName: 'SSH',
            ruleAction: ec2.Action.ALLOW,
            direction: ec2.TrafficDirection.INGRESS,
            traffic: ec2.AclTraffic.tcpPort(22)
        });
        privateACL.addEntry('IngressICMP', {
            cidr: ec2.AclCidr.ipv4(Network.VPC_CIDR),
            ruleNumber: 200,
            networkAclEntryName: 'ICMP',
            traffic: ec2.AclTraffic.icmp({code: -1, type: -1}),
            direction: ec2.TrafficDirection.INGRESS,
            ruleAction: ec2.Action.ALLOW
        });
        privateACL.addEntry('IngressHttp', {
            cidr: ec2.AclCidr.ipv4(Network.VPC_CIDR),
            ruleNumber: 300,
            networkAclEntryName: 'HTTP',
            traffic: ec2.AclTraffic.tcpPort(80),
            direction: ec2.TrafficDirection.INGRESS,
            ruleAction: ec2.Action.ALLOW
        });
        privateACL.addEntry('IngressHttps', {
            cidr: ec2.AclCidr.ipv4(Network.VPC_CIDR),
            ruleNumber: 400,
            networkAclEntryName: 'HTTPS',
            traffic: ec2.AclTraffic.tcpPort(443),
            direction: ec2.TrafficDirection.INGRESS,
            ruleAction: ec2.Action.ALLOW
        });
        privateACL.addEntry('IngressEphemeral', {
            cidr: ec2.AclCidr.anyIpv4(),
            ruleNumber: 500,
            networkAclEntryName: 'Ephemeral',
            ruleAction: ec2.Action.ALLOW,
            direction: ec2.TrafficDirection.INGRESS,
            traffic: ec2.AclTraffic.tcpPortRange(1024, 65535)
        });

        // egress
        privateACL.addEntry('EgressICMP', {
            cidr: ec2.AclCidr.ipv4(Network.VPC_CIDR),
            ruleNumber: 100,
            networkAclEntryName: 'ICMP',
            traffic: ec2.AclTraffic.icmp({code: -1, type: -1}),
            direction: ec2.TrafficDirection.EGRESS,
            ruleAction: ec2.Action.ALLOW
        });
        privateACL.addEntry('EgressHttp', {
            cidr: ec2.AclCidr.anyIpv4(),
            ruleNumber: 200,
            networkAclEntryName: 'HTTP',
            traffic: ec2.AclTraffic.tcpPort(80),
            direction: ec2.TrafficDirection.EGRESS,
            ruleAction: ec2.Action.ALLOW
        });
        privateACL.addEntry('EgressHttps', {
            cidr: ec2.AclCidr.anyIpv4(),
            ruleNumber: 300,
            networkAclEntryName: 'HTTPS',
            traffic: ec2.AclTraffic.tcpPort(443),
            direction: ec2.TrafficDirection.EGRESS,
            ruleAction: ec2.Action.ALLOW
        });
        privateACL.addEntry('EgressEphemeral', {
            cidr: ec2.AclCidr.anyIpv4(),
            ruleNumber: 400,
            networkAclEntryName: 'Ephemeral',
            ruleAction: ec2.Action.ALLOW,
            direction: ec2.TrafficDirection.EGRESS,
            traffic: ec2.AclTraffic.tcpPortRange(1024, 65535)
        });
        privateACL.addEntry('EgressPostgres', {
            cidr: ec2.AclCidr.ipv4(Network.VPC_CIDR),
            ruleNumber: 500,
            networkAclEntryName: 'Postgres',
            ruleAction: ec2.Action.ALLOW,
            direction: ec2.TrafficDirection.EGRESS,
            traffic: ec2.AclTraffic.tcpPort(5432)
        });

        return privateACL;

    }

    private setupDatabaseACL() {

        const databaseACL = new ec2.NetworkAcl(this, 'DatabaseACL', {
            networkAclName: 'DatabaseACL',
            vpc: this._vpc,
            subnetSelection: {subnets: this._databaseSubnets}
        });

        // ingress
        databaseACL.addEntry('IngressPostgres', {
            cidr: ec2.AclCidr.ipv4(Network.VPC_CIDR),
            ruleNumber: 100,
            networkAclEntryName: 'Posgress',
            traffic: ec2.AclTraffic.tcpPort(5432),
            direction: ec2.TrafficDirection.INGRESS,
            ruleAction: ec2.Action.ALLOW
        });
        databaseACL.addEntry('IngressICMP', {
            cidr: ec2.AclCidr.ipv4(Network.VPC_CIDR),
            ruleNumber: 200,
            networkAclEntryName: 'ICMP',
            traffic: ec2.AclTraffic.icmp({code: -1, type: -1}),
            direction: ec2.TrafficDirection.INGRESS,
            ruleAction: ec2.Action.ALLOW
        });
        databaseACL.addEntry('IngressEphemeral', {
            cidr: ec2.AclCidr.ipv4(Network.VPC_CIDR),
            ruleNumber: 300,
            networkAclEntryName: 'Ephemeral',
            ruleAction: ec2.Action.ALLOW,
            direction: ec2.TrafficDirection.INGRESS,
            traffic: ec2.AclTraffic.tcpPortRange(1024, 65535)
        });

        // egress
        databaseACL.addEntry('EgressICMP', {
            cidr: ec2.AclCidr.ipv4(Network.VPC_CIDR),
            ruleNumber: 100,
            networkAclEntryName: 'ICMP',
            traffic: ec2.AclTraffic.icmp({code: -1, type: -1}),
            direction: ec2.TrafficDirection.EGRESS,
            ruleAction: ec2.Action.ALLOW
        });
        databaseACL.addEntry('EgressEphemeral', {
            cidr: ec2.AclCidr.ipv4(Network.VPC_CIDR),
            ruleNumber: 200,
            networkAclEntryName: 'Ephemeral',
            ruleAction: ec2.Action.ALLOW,
            direction: ec2.TrafficDirection.EGRESS,
            traffic: ec2.AclTraffic.tcpPortRange(1024, 65535)
        });

        return databaseACL;

    }

    private setupPublicACL() {

        const publicACL = new ec2.NetworkAcl(this, 'PublicACL', {
            networkAclName: 'PublicACL',
            vpc: this._vpc,
            subnetSelection: {subnets: this._publicSubnets}
        });

        // ingress
        publicACL.addEntry('IngressICMP', {
            cidr: ec2.AclCidr.anyIpv4(),
            ruleNumber: 100,
            networkAclEntryName: 'ICMP',
            traffic: ec2.AclTraffic.icmp({code: -1, type: -1}),
            direction: ec2.TrafficDirection.INGRESS,
            ruleAction: ec2.Action.ALLOW
        });
        publicACL.addEntry('IngressHttp', {
            cidr: ec2.AclCidr.anyIpv4(),
            ruleNumber: 200,
            networkAclEntryName: 'HTTP',
            traffic: ec2.AclTraffic.tcpPort(80),
            direction: ec2.TrafficDirection.INGRESS,
            ruleAction: ec2.Action.ALLOW
        });
        publicACL.addEntry('IngressHttps', {
            cidr: ec2.AclCidr.anyIpv4(),
            ruleNumber: 300,
            networkAclEntryName: 'HTTPS',
            traffic: ec2.AclTraffic.tcpPort(443),
            direction: ec2.TrafficDirection.INGRESS,
            ruleAction: ec2.Action.ALLOW
        });
        publicACL.addEntry('IngressEphemeral', {
            cidr: ec2.AclCidr.anyIpv4(),
            ruleNumber: 400,
            networkAclEntryName: 'Ephemeral',
            ruleAction: ec2.Action.ALLOW,
            direction: ec2.TrafficDirection.INGRESS,
            traffic: ec2.AclTraffic.tcpPortRange(1024, 65535)
        });

        // egress
        publicACL.addEntry('EgressICMP', {
            cidr: ec2.AclCidr.anyIpv4(),
            ruleNumber: 100,
            networkAclEntryName: 'ICMP',
            traffic: ec2.AclTraffic.icmp({code: -1, type: -1}),
            direction: ec2.TrafficDirection.EGRESS,
            ruleAction: ec2.Action.ALLOW
        });
        publicACL.addEntry('EgressHttp', {
            cidr: ec2.AclCidr.anyIpv4(),
            ruleNumber: 200,
            networkAclEntryName: 'HTTP',
            traffic: ec2.AclTraffic.tcpPort(80),
            direction: ec2.TrafficDirection.EGRESS,
            ruleAction: ec2.Action.ALLOW
        });
        publicACL.addEntry('EgressHttps', {
            cidr: ec2.AclCidr.anyIpv4(),
            ruleNumber: 300,
            networkAclEntryName: 'HTTPS',
            traffic: ec2.AclTraffic.tcpPort(443),
            direction: ec2.TrafficDirection.EGRESS,
            ruleAction: ec2.Action.ALLOW
        });
        publicACL.addEntry('EgressEphemeral', {
            cidr: ec2.AclCidr.anyIpv4(),
            ruleNumber: 400,
            networkAclEntryName: 'Ephemeral',
            ruleAction: ec2.Action.ALLOW,
            direction: ec2.TrafficDirection.EGRESS,
            traffic: ec2.AclTraffic.tcpPortRange(1024, 65535)
        });
        publicACL.addEntry('EgressPostgres', {
            cidr: ec2.AclCidr.ipv4(Network.VPC_CIDR),
            ruleNumber: 500,
            networkAclEntryName: 'Postgres',
            ruleAction: ec2.Action.ALLOW,
            direction: ec2.TrafficDirection.EGRESS,
            traffic: ec2.AclTraffic.tcpPort(5432)
        });

        return publicACL;

    }

    get vpc(): ec2.Vpc {
        return this._vpc;
    }

    get publicSubnets(): ec2.ISubnet[] {
        return this._publicSubnets;
    }

    get databaseSubnets(): ec2.ISubnet[] {
        return this._databaseSubnets;
    }

    get publicACL(): ec2.NetworkAcl {
        return this._publicACL;
    }

    get databaseACL(): ec2.NetworkAcl {
        return this._databaseACL;
    }

    get privateSubnets(): ec2.ISubnet[] {
        return this._privateSubnets;
    }

    get privateACL(): ec2.NetworkAcl {
        return this._privateACL;
    }

}