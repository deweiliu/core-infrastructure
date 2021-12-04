import * as cdk from '@aws-cdk/core';
import * as route53 from '@aws-cdk/aws-route53';
import { LoadBalancingStack } from './load-balancing-stack';
import { Vpc } from '@aws-cdk/aws-ec2';
import * as acm from '@aws-cdk/aws-certificatemanager';
import { EcsClusterStack } from './ecs-cluster-stack';
import { Tags } from '@aws-cdk/core';
import { ExportValues } from './export-values';
export interface CdkStackProps extends cdk.StackProps {
  maxAzs: number;
  appId: number;
}

export class CdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: CdkStackProps) {
    super(scope, id, props);
    Tags.of(this).add('service', 'core-infrastructure');

    const vpc = Vpc.fromVpcAttributes(this, 'CoreVpc', {
      vpcId: cdk.Fn.importValue('Core-Vpc'),
      availabilityZones: cdk.Stack.of(this).availabilityZones,
    });

    const igw = cdk.Fn.importValue('Core-InternetGateway');

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: cdk.Fn.importValue('DLIUCOMHostedZoneID'),
      zoneName: 'dliu.com',
    });

    // Create nested stacks
    const albStack = new LoadBalancingStack(this, 'LoadBalancing', { vpc, igw, hostedZone, maxAzs: props.maxAzs, appId: props.appId, });

    // TODO Create NAT instance/gateway

    const ecsStack = new EcsClusterStack(this, 'EcsCluster', {
      maxAzs: props.maxAzs,
      appId: props.appId,
      vpc, igw,
      httpsListener: albStack.httpsListener,
      albSecurityGroup: albStack.albSecurityGroup,
      hostedZone,
      loadBalancerDnsName: albStack.loadBalancer.loadBalancerDnsName
    });

    const certificate = new acm.Certificate(this, 'SSLCertificate', {
      domainName: 'test.dliu.com',
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });
    // albStack.httpsListener.addCertificates('TestCertificate', [certificate]);

    new ExportValues(this, { albStack, ecsStack });

  }
}
