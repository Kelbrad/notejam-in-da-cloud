import { App } from "@aws-cdk/core";

var preconditions = require("preconditions").errr();

export enum EnvironmentType {
    DEV = "dev"
}

export class Environment {
    
    private static readonly S3_RESOURCE_PREFIX: string = 'sgy-notejam';

    private readonly _environmentType: EnvironmentType;
    private readonly _featureId: string;
    private readonly _profile: string;

    constructor(environmentType: EnvironmentType, featureId: string, profile: string) {
        
        preconditions.shouldBeDefined(environmentType).test();
        
        this._environmentType = environmentType;
        this._featureId = featureId;
        this._profile = profile;
        
    }

    public static from(app: App) : Environment {
        return new Environment(
            app.node.tryGetContext("environment-type"),
            app.node.tryGetContext("feature-id"),
            app.node.tryGetContext("profile")
        )
    }

    public isFeatureEnvironment(): boolean {
        return !!this._featureId;
    }

    get environmentType(): EnvironmentType {
        return this._environmentType;
    }

    get featureId(): string {
        return this._featureId;
    }

    get profile(): string {
        return this._profile;
    }

    public resourcesPrefix(resource: string): string {
        if (this.isFeatureEnvironment()) {
            return `${this._featureId}-${resource}`;
        } else {
            return resource;
        }
    }

    public s3Prefix(s3BucketName: string): string {
        if (this.isFeatureEnvironment()) {
            return `${Environment.S3_RESOURCE_PREFIX}-${this._environmentType}-${this._featureId}-${s3BucketName}`;
        } else {
            return `${Environment.S3_RESOURCE_PREFIX}-${this._environmentType}-${s3BucketName}`;
        }
    }

}
