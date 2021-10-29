import * as cdk from '@aws-cdk/core';
import * as route53 from '@aws-cdk/aws-route53';
import { VpcStack } from './vpc-stack';
import { LoadBalancingStack } from './load-balancing-stack';

export interface CdkStackProps extends cdk.StackProps {
  maxAzs: number;
}
export class CdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: CdkStackProps) {
    super(scope, id, props);

    // Impoert values
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: cdk.Fn.importValue('DLIUCOMHostedZoneID').toString(),
      zoneName: 'dliu.com',
    });

    // Create nested stacks
    const vpcStack = new VpcStack(this, 'VPC',{maxAzs:props.maxAzs});

    const albStack = new LoadBalancingStack(this, 'LoadBalancing',
      { vpc: vpcStack.vpc, hostedZone, }
    );

    // Output stack variables
    new cdk.CfnOutput(this, 'AlbVpc', {
      value: vpcStack.vpc.vpcId,
      description: "The VPC where core Application Load Balancer is in",
      exportName: 'CoreAlbVpc',
    });
    new cdk.CfnOutput(this, 'AlbVpcCidr', {
      value: vpcStack.vpc.vpcCidrBlock,
      description: "The CIDR of the VPC where core Application Load Balancer is in",
      exportName: 'CoreAlbVpcCidr',
    });
    new cdk.CfnOutput(this, 'AlbVpcPublicSubnets', {
      value: vpcStack.vpc.publicSubnets.join(','),
      description: "The public subnets of the VPC where core Application Load Balancer is in",
      exportName: 'CoreAlbVpcPublicSubnets',
    });

    new cdk.CfnOutput(this, 'AlbVpcPublicSubnetRouteTables', {
      value: vpcStack.vpc.publicSubnets.map(subnet => subnet.routeTable.routeTableId).join(','),
      description: "The public subnets route tables of the VPC where core Application Load Balancer is in",
      exportName: 'CoreAlbVpcPublicSubnetRouteTables',
    });

    new cdk.CfnOutput(this, 'AlbListener', {
      value: albStack.httpsListener.listenerArn,
      description: "The ARN of the HTTPS port 443 listener on the core Application Load Balancer",
      exportName: 'CoreAlbListener',
    });

    new cdk.CfnOutput(this, 'AlbSecurityGroup', {
      value: albStack.albSecurityGroup.securityGroupId,
      description: "The security group for the core Application Load Balancer",
      exportName: 'CoreAlbSecurityGroup',
    });

    new cdk.CfnOutput(this, 'AlbVpcAvailabilityZones', {
      value: vpcStack.vpc.availabilityZones.join(','),
      description: "The Availability Zones of the VPC where core Application Load Balancer is in",
      exportName: 'CoreAlbVpcAvailabilityZones',
    });

    new cdk.CfnOutput(this, 'Alb', {
      value: albStack.loadBalancer.loadBalancerArn,
      description: "The Application Load Balancer ARN",
      exportName: 'CoreAlb',
    });

    new cdk.CfnOutput(this, 'AlbCanonicalHostedZone', {
      value: albStack.loadBalancer.loadBalancerCanonicalHostedZoneId,
      description: "The Application Load Balancer Canonical Hosted Zone ID",
      exportName: 'CoreAlbCanonicalHostedZone',
    });

    new cdk.CfnOutput(this, 'AlbDns', {
      value: albStack.loadBalancer.loadBalancerDnsName,
      description: "The Application Load Balancer Canonical Hosted Zone ID",
      exportName: 'CoreAlbDns',
    });

  }
}
