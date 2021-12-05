
import * as cdk from '@aws-cdk/core';
import * as route53 from '@aws-cdk/aws-route53';
import * as ec2 from '@aws-cdk/aws-ec2';
import { Fn } from '@aws-cdk/core';
import { CdkStackProps } from './main-stack';

export class ImportValues extends cdk.Construct {
    public hostedZone: route53.IHostedZone;
    public igwId: string;
    public vpc: ec2.IVpc;

    public maxAzs: number;
    public appId: number;

    constructor(scope: cdk.Construct, props: CdkStackProps) {
        super(scope, 'ImportValues')

        this.maxAzs = props.maxAzs;
        this.appId = props.appId;


        this.vpc = ec2.Vpc.fromVpcAttributes(this, 'CoreVpc', {
            vpcId: Fn.importValue('Core-Vpc'),
            availabilityZones: cdk.Stack.of(this).availabilityZones,
        });

        this.igwId = Fn.importValue('Core-InternetGateway');

        this.hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
            hostedZoneId: Fn.importValue('DLIUCOMHostedZoneID'),
            zoneName: 'dliu.com',
        });
    }
}