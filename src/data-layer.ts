import cdk = require('@aws-cdk/core');
import rds = require('@aws-cdk/aws-rds');
import ec2 = require('@aws-cdk/aws-ec2');
import logs = require('@aws-cdk/aws-logs');
import db = require('./config/db.json');
import {Assembler} from "./notejam";
import {RemovalPolicy} from "@aws-cdk/core";

export class DataLayer extends cdk.Stack {

    private readonly _db: rds.DatabaseInstance;

    constructor(assembler: Assembler) {

        super(
            assembler.appRoot,
            assembler.environment.resourcesPrefix('NoteJamDataLayer'),
            assembler.stackProps
        );

        this._db = this.setupDb(assembler);

    }

    private setupDb(assembler: Assembler) {

        const securityGroup =  new ec2.SecurityGroup(this, 'DbSg', {
            vpc: assembler.network.vpc,
            securityGroupName: 'DbSg'
        });

        const parameterGroup = new rds.ParameterGroup(this, 'ParameterGroup', {
            family: 'postgres11',
            parameters: {
                shared_preload_libraries: 'auto_explain,pg_stat_statements,pg_hint_plan,pgaudit'
            }
        });

        const dbInstance = new rds.DatabaseInstance(this, 'Db', {
            instanceIdentifier: 'Db',
            engine: rds.DatabaseInstanceEngine.POSTGRES,
            engineVersion: '11.5',
            instanceClass: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE2, ec2.InstanceSize.MICRO),
            storageType: rds.StorageType.GP2,
            allocatedStorage: 20,
            storageEncrypted: false,
            masterUsername: db[assembler.environment.environmentType].dbUserName,
            masterUserPassword: cdk.SecretValue.plainText(db[assembler.environment.environmentType].dbPassword),
            databaseName: db[assembler.environment.environmentType].dbName,
            port: 5432,
            backupRetention: cdk.Duration.days(7),
            vpc: assembler.network.vpc,
            vpcPlacement: {subnets: assembler.network.databaseSubnets},
            multiAz: true,
            cloudwatchLogsRetention: logs.RetentionDays.FIVE_DAYS,
            autoMinorVersionUpgrade: true,
            allowMajorVersionUpgrade: false,
            parameterGroup: parameterGroup,
            securityGroups: [securityGroup],
            deletionProtection: false, // just for development
            deleteAutomatedBackups: true, // just for development
            removalPolicy: RemovalPolicy.DESTROY // just for development
        });

        dbInstance.connections.allowDefaultPortFrom(
            ec2.Peer.ipv4(assembler.network.vpc.vpcCidrBlock), 'Allow From VPC'
        );

        return dbInstance;

    }

    get db(): rds.DatabaseInstance {
        return this._db;
    }

}