
import * as cdk from '@aws-cdk/core';
import * as ecs from '@aws-cdk/aws-ecs';
import { IVpc } from '@aws-cdk/aws-ec2';
export interface EcsClusterStackProps extends cdk.NestedStackProps {
    maxAzs: number;
    appId: number;
    vpc: IVpc;
}

export class EcsClusterStack extends cdk.NestedStack {

    constructor(scope: cdk.Construct, id: string, props: EcsClusterStackProps) {
        super(scope, id);


        const cluster = new ecs.Cluster(this, 'CoreCluster', { vpc: props.vpc });

        // const taskDefinition = new ecs.TaskDefinition(this, 'TD', {
        //     memoryMiB: '512',
        //     cpu: '256',
        //     compatibility: ecs.Compatibility.FARGATE,
        // });

        // const containerDefinition = taskDefinition.addContainer('TheContainer', {
        //     image: ecs.ContainerImage.fromRegistry('foo/bar'),
        //     memoryLimitMiB: 256,
        // });

        // const runTask = new tasks.EcsRunTask(this, 'RunFargate', {

        //     cluster,
        //     taskDefinition,
        //     assignPublicIp: true,
        //     containerOverrides: [{ containerDefinition }],
        //     launchTarget: new tasks.EcsFargateLaunchTarget(),
        // });
    }
}