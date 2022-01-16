import { Construct } from 'constructs';
import {
    aws_route53 as route53,
    aws_ec2 as ec2,
    Fn,
    Stack,
} from 'aws-cdk-lib';
import { CdkStackProps } from './main-stack';

export class ImportValues extends Construct {
    public hostedZone: route53.IHostedZone;
    public igwId: string;
    public vpc: ec2.IVpc;

    public maxAzs: number;
    public appId: number;

    constructor(scope: Construct, props: CdkStackProps) {
        super(scope, 'ImportValues')

        this.maxAzs = props.maxAzs;
        this.appId = props.appId;


        this.vpc = ec2.Vpc.fromVpcAttributes(this, 'CoreVpc', {
            vpcId: Fn.importValue('Core-Vpc'),
            availabilityZones: Stack.of(this).availabilityZones,
        });

        this.igwId = Fn.importValue('Core-InternetGateway');

        this.hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
            hostedZoneId: Fn.importValue('DLIUCOMHostedZoneID'),
            zoneName: 'dliu.com',
        });
    }
}