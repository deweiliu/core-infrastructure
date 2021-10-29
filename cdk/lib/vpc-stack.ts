import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';

export interface VpcStackProps extends cdk.NestedStackProps {
    maxAzs: number;
}
export class VpcStack extends cdk.NestedStack {
    public vpc: ec2.Vpc;

    constructor(scope: cdk.Construct, id: string, props: VpcStackProps) {
        super(scope, id, props);
        this.vpc = new ec2.Vpc(this, 'VPC', {
            cidr: "10.0.0.0/16",
            subnetConfiguration: [{ cidrMask: 24, subnetType: ec2.SubnetType.PUBLIC, name: 'public-subnet-group' }],
            maxAzs: props.maxAzs,
        });
    }
}