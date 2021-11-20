import * as cdk from '@aws-cdk/core';
import * as route53 from '@aws-cdk/aws-route53';
import { LoadBalancingStack } from './load-balancing-stack';
import { Vpc } from '@aws-cdk/aws-ec2';
export interface CdkStackProps extends cdk.StackProps {
  maxAzs: number;
  appId: number;
}

export class CdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: CdkStackProps) {
    super(scope, id, props);

    const vpc = Vpc.fromVpcAttributes(this, 'CoreVpc', {
      vpcId: cdk.Fn.importValue('Core-Vpc'),
      availabilityZones: cdk.Stack.of(this).availabilityZones,
    }) as Vpc;

    const igw = cdk.Fn.importValue('Core-InternetGateway');

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: cdk.Fn.importValue('DLIUCOMHostedZoneID'),
      zoneName: 'dliu.com',
    });

    // Create nested stacks
    const albStack = new LoadBalancingStack(this, 'LoadBalancing', {
      vpc,
      igw,
      hostedZone,
      maxAzs: props.maxAzs,
      appId: props.appId,
    });

    // TODO Create NAT instance/gateway

    // Output stack variables
    new cdk.CfnOutput(this, 'Alb', {
      value: albStack.loadBalancer.loadBalancerArn,
      description: "The Application Load Balancer ARN",
      exportName: 'Core-Alb',
    });
    new cdk.CfnOutput(this, 'AlbListener', {
      value: albStack.httpsListener.listenerArn,
      description: "The ARN of the HTTPS port 443 listener on the core Application Load Balancer",
      exportName: 'Core-AlbListener',
    });

    new cdk.CfnOutput(this, 'AlbSecurityGroup', {
      value: albStack.albSecurityGroup.securityGroupId,
      description: "The security group for the core Application Load Balancer",
      exportName: 'Core-AlbSecurityGroup',
    });

    new cdk.CfnOutput(this, 'AlbCanonicalHostedZone', {
      value: albStack.loadBalancer.loadBalancerCanonicalHostedZoneId,
      description: "The Application Load Balancer Canonical Hosted Zone ID",
      exportName: 'Core-AlbCanonicalHostedZone',
    });

    new cdk.CfnOutput(this, 'AlbDns', {
      value: albStack.loadBalancer.loadBalancerDnsName,
      description: "The Application Load Balancer Canonical Hosted Zone ID",
      exportName: 'Core-AlbDns',
    });
  }
}
