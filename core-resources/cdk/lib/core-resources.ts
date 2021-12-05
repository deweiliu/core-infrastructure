import * as cdk from '@aws-cdk/core';
import * as route53 from '@aws-cdk/aws-route53';
import { LoadBalancingStack } from './load-balancing-stack';
import { Vpc } from '@aws-cdk/aws-ec2';
import * as acm from '@aws-cdk/aws-certificatemanager';
import { EcsClusterStack } from './ecs-cluster-stack';
import { Tags } from '@aws-cdk/core';
import { ExportValues } from './export-values';
import { ImportValues } from './import-values';
export interface CdkStackProps extends cdk.StackProps {
  maxAzs: number;
  appId: number;
}

export class CdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: CdkStackProps) {
    super(scope, id, props);

    const { igwId, hostedZone, vpc, maxAzs, appId } = new ImportValues(this, props)

    const albStack = new LoadBalancingStack(this, 'LoadBalancing', { vpc, igwId, hostedZone, maxAzs, appId });

    const ecsStack = new EcsClusterStack(this, 'EcsCluster', { maxAzs, appId, vpc, igwId, hostedZone });

    new ExportValues(this, { albStack, ecsStack });
  }
}
