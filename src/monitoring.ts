import cdk = require('@aws-cdk/core');
import cw = require('@aws-cdk/aws-cloudwatch');
import cwActions = require('@aws-cdk/aws-cloudwatch-actions');
import sns = require('@aws-cdk/aws-sns');
import general = require('./config/general.json');

import {Assembler} from "./notejam";

export class Monitoring extends cdk.Stack {

    private readonly _dbCpuMetric: cw.Metric;
    private readonly _dbCpuAlarm: cw.Alarm;
    private readonly _alertTopic: sns.Topic;

    constructor(assembler: Assembler) {

        super(
            assembler.appRoot,
            assembler.environment.resourcesPrefix('NoteJamMonitoring'),
            assembler.stackProps
        );

        this._alertTopic = new sns.Topic(this, 'AlertTopic', {
            topicName: 'NoteJamAlertTopic',
            displayName: 'NoteJamAlertTopic'
        });

        this._dbCpuMetric = new cw.Metric({
            namespace: 'AWS/RDS',
            metricName: 'CPUUtilization',
            dimensions: {
                DBInstanceIdentifier: assembler.dataLayer.db.instanceIdentifier
            },
            region: general[assembler.environment.environmentType].region
        });

        this._dbCpuAlarm = new cw.Alarm(this, 'DbCpuAlarm', {
            alarmName: 'DbCpuAlarm',
            metric: this._dbCpuMetric,
            evaluationPeriods: 2,
            threshold: 70
        });
        this._dbCpuAlarm.addAlarmAction(
            new cwActions.SnsAction(
                this._alertTopic
            )
        );
    }

    get dbCpuMetric(): cw.Metric {
        return this._dbCpuMetric;
    }

    get dbCpuAlarm(): cw.Alarm {
        return this._dbCpuAlarm;
    }

    get alertTopic(): sns.Topic {
        return this._alertTopic;
    }

}