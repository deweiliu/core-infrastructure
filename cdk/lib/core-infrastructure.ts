import * as cdk from '@aws-cdk/core';
import * as route53 from '@aws-cdk/aws-route53';
import { VpcStack } from './vpc-stack';
import { LoadBalancingStack } from './load-balancing-stack';

export class CdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: cdk.Fn.importValue('DLIUCOMHostedZoneID').toString(),
      zoneName: 'dliu.com',
    });


    const vpcStack = new VpcStack(this, 'VPC');

    const elbStack = new LoadBalancingStack(this, 'LoadBalancing',
      { vpc: vpcStack.vpc, hostedZone, }
    );


  }
}
