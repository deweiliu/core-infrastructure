import { Construct } from 'constructs';
import { StackProps, Stack } from 'aws-cdk-lib';

import { LoadBalancingStack } from './load-balancing-stack';
import { EcsClusterStack } from './ecs-cluster-stack';
import { ExportValues } from './export-values';
import { ImportValues } from './import-values';
export interface CdkStackProps extends StackProps {
  maxAzs: number;
  appId: number;
}

export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props: CdkStackProps) {
    super(scope, id, props);

    const { igwId, hostedZone, vpc, maxAzs, appId, mysqlSecurityGroup } = new ImportValues(this, props)

    const albStack = new LoadBalancingStack(this, 'LoadBalancing', { vpc, igwId, hostedZone, maxAzs, appId });

    const ecsStack = new EcsClusterStack(this, 'EcsCluster', { maxAzs, appId, vpc, igwId, hostedZone, mysqlSecurityGroup });

    new ExportValues(this, { albStack, ecsStack });
  }
}
