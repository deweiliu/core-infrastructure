
import * as cdk from '@aws-cdk/core';

export interface EcsClusterStackProps extends cdk.NestedStackProps {
    maxAzs: number;
    appId: number;
}

export class EcsClusterStack extends cdk.NestedStack {

    constructor(scope: cdk.Construct, id: string, props: EcsClusterStackProps) {
        super(scope, id);
    }
}