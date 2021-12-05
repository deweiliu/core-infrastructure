import * as cdk from '@aws-cdk/core';
import { LoadBalancingStack } from './load-balancing-stack';
import { EcsClusterStack } from './ecs-cluster-stack';
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
