import cdk = require('@aws-cdk/core');
import ecr = require('@aws-cdk/aws-ecr');
import ecs = require('@aws-cdk/aws-ecs');
import ec2 = require('@aws-cdk/aws-ec2');
import ecsPatterns = require('@aws-cdk/aws-ecs-patterns');
import {Assembler} from "./notejam";
import {Network} from "./network";
import {Protocol} from "@aws-cdk/aws-elasticloadbalancingv2";
import {ApplicationProtocol} from "@aws-cdk/aws-elasticloadbalancingv2";

export class Commons extends cdk.Stack {

    private readonly _tomcatBaseRepo: ecr.Repository;
    private readonly _noteJamRepo: ecr.Repository;

    constructor(assembler: Assembler) {

        super(
            assembler.appRoot,
            assembler.environment.resourcesPrefix('NoteJamCommons'),
            assembler.stackProps
        );

        this._tomcatBaseRepo = new ecr.Repository(this, 'TomcatBaseRepo', {
            repositoryName: 'tomcat-base'
        });
        this._noteJamRepo = new ecr.Repository(this, 'NoteJamRepo', {
            repositoryName: 'note-jam'
        })

    }

    get tomcatBaseRepo(): ecr.Repository {
        return this._tomcatBaseRepo;
    }

    get noteJamRepo(): ecr.Repository {
        return this._noteJamRepo;
    }

}