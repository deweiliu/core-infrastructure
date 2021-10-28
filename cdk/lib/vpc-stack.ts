import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';

export class VpcStack extends cdk.NestedStack {
    public vpc: ec2.Vpc;

    constructor(scope: cdk.Construct, id: string, props?: cdk.NestedStackProps) {
        super(scope, id, props);
        this.vpc = new ec2.Vpc(this, 'VPC', {
            cidr: "10.0.0.0/16",
            subnetConfiguration: [{ cidrMask: 24, subnetType: ec2.SubnetType.PUBLIC, name: 'public-subnet-group' }]
        });
    }
}