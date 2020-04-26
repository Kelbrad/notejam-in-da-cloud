#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import aws = require('aws-sdk');
import { Environment } from './config/environment';
import general = require('./config/general.json');
import {Network} from "./network";
import {DataLayer} from "./data-layer";
import {Commons} from "./commons";
import {AppLayer} from "./app-layer";
import {Monitoring} from "./monitoring";

export class Assembler {

    private readonly _environment: Environment;
    private readonly _appRoot: cdk.App;
    private readonly _stackProps: cdk.StackProps;

    private _network: Network;
    private _dataLayer: DataLayer;
    private _appLayer: AppLayer;
    private _monitoring: Monitoring;
    private _commons: Commons;

    constructor() {

        this._appRoot = new cdk.App();
        this._environment = Environment.from(this._appRoot);

        const cdkEnv = {
            region: general[this._environment.environmentType].region,
            account: general[this._environment.environmentType].account
        };
        this._stackProps = {
            env: cdkEnv
        };

        if (this._environment.profile) {
            aws.config.credentials = new aws.SharedIniFileCredentials({
                profile: this._environment.profile
            });
        }
        aws.config.update({
            region: general[this._environment.environmentType].region
        });

    }

    assemble() {

        console.log(`Assembling NoteJamInDaCloud for environment [${this._environment.environmentType}] and profile [${this._environment.profile}]...`);

        this._commons = new Commons(this);
        this._network = new Network(this);
        this._dataLayer = new DataLayer(this);
        this._appLayer = new AppLayer(this);
        this._monitoring = new Monitoring(this);

        return this._appRoot.synth();

    }

    get environment(): Environment {
        return this._environment;
    }

    get appRoot(): cdk.App {
        return this._appRoot;
    }

    get stackProps(): cdk.StackProps {
        return this._stackProps;
    }

    get network(): Network {
        return this._network;
    }

    get dataLayer(): DataLayer {
        return this._dataLayer;
    }

    get commons(): Commons {
        return this._commons;
    }

}

async function main() {
    const assembler = new Assembler();
    assembler.assemble();
}

main().catch(error => {
    console.log(error);
});
