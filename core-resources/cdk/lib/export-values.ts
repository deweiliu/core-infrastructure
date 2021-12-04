
import { CfnOutput, Construct } from '@aws-cdk/core';
import { EcsClusterStack } from './ecs-cluster-stack';
import { LoadBalancingStack } from './load-balancing-stack';
export interface ExportValuesProps {
    albStack: LoadBalancingStack;
    ecsStack: EcsClusterStack;
}

export class ExportValues {
    constructor(scope: Construct, props: ExportValuesProps) {
        new CfnOutput(scope, 'Alb', {
            value: props.albStack.loadBalancer.loadBalancerArn,
            description: "The Application Load Balancer ARN",
            exportName: 'Core-Alb',
        });

        new CfnOutput(scope, 'AlbListener', {
            value: props.albStack.httpsListener.listenerArn,
            description: "The ARN of the HTTPS port 443 listener on the core Application Load Balancer",
            exportName: 'Core-AlbListener',
        });

        new CfnOutput(scope, 'AlbSecurityGroup', {
            value: props.albStack.albSecurityGroup.securityGroupId,
            description: "The security group for the core Application Load Balancer",
            exportName: 'Core-AlbSecurityGroup',
        });

        new CfnOutput(scope, 'AlbCanonicalHostedZone', {
            value: props.albStack.loadBalancer.loadBalancerCanonicalHostedZoneId,
            description: "The Application Load Balancer Canonical Hosted Zone ID",
            exportName: 'Core-AlbCanonicalHostedZone',
        });

        new CfnOutput(scope, 'AlbDns', {
            value: props.albStack.loadBalancer.loadBalancerDnsName,
            description: "The Application Load Balancer Canonical Hosted Zone ID",
            exportName: 'Core-AlbDns',
        });
    }
}