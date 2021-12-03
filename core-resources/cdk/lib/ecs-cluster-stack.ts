
import * as cdk from '@aws-cdk/core';
import * as ecs from '@aws-cdk/aws-ecs';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as  autoscaling from '@aws-cdk/aws-autoscaling';
import { ISubnet, PublicSubnet } from '@aws-cdk/aws-ec2';


import * as elb from '@aws-cdk/aws-elasticloadbalancingv2';
import { IVpc } from '@aws-cdk/aws-ec2';
import { Protocol } from '@aws-cdk/aws-ecs';
import { ApplicationListener } from '@aws-cdk/aws-elasticloadbalancingv2';

export interface EcsClusterStackProps extends cdk.NestedStackProps {
    maxAzs: number;
    appId: number;
    vpc: IVpc;
    igw: string;
    httpsListener: elb.IApplicationListener;
}

export class EcsClusterStack extends cdk.NestedStack {

    constructor(scope: cdk.Construct, id: string, props: EcsClusterStackProps) {
        super(scope, id);

        const subnets: ISubnet[] = [];

        [...Array(props.maxAzs).keys()].forEach(azIndex => {
            const subnet = new PublicSubnet(this, `Subnet` + azIndex, {
                vpcId: props.vpc.vpcId,
                availabilityZone: cdk.Stack.of(this).availabilityZones[azIndex],
                cidrBlock: `10.0.10.${azIndex * 16}/28`,
            });
            new ec2.CfnRoute(this, 'PublicRouting' + azIndex, {
                destinationCidrBlock: '0.0.0.0/0',
                routeTableId: subnet.routeTable.routeTableId,
                gatewayId: props.igw,
            });

            subnets.push(subnet);
        });

        const cluster = new ecs.Cluster(this, 'CoreCluster', { vpc: props.vpc });
        const asg = new autoscaling.AutoScalingGroup(this, 'MyFleet', {
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
            machineImage: ecs.EcsOptimizedImage.amazonLinux2(),
            desiredCapacity: 1,
            maxCapacity: 2,
            vpc: props.vpc, //new ec2.Vpc(this, 'Vpc', { maxAzs: 2 }),
            vpcSubnets: { subnets },
        });
        const capacityProvider = new ecs.AsgCapacityProvider(this, 'AsgCapacityProvider', { autoScalingGroup: asg });
        cluster.addAsgCapacityProvider(capacityProvider);

        const taskDefinition = new ecs.Ec2TaskDefinition(this, 'TaskDefinition');

        const containerName = 'home-site-container';

        taskDefinition.addContainer('Container', {
            image: ecs.ContainerImage.fromRegistry('deweiliu/home-site'),
            containerName,
            memoryReservationMiB: 256,
            portMappings: [{ containerPort: 80, hostPort: 80, protocol: Protocol.TCP }],
            logging: new ecs.AwsLogDriver({ streamPrefix: "home-site" }),
        });
        const service = new ecs.Ec2Service(this, 'Service', { cluster, taskDefinition });


        const albTargetGroup = new elb.ApplicationTargetGroup(this, 'TargetGroup', {
            port: 80,
            protocol: elb.ApplicationProtocol.HTTP,
            healthCheck: { enabled: true },
            vpc: props.vpc,
            targetType: elb.TargetType.INSTANCE,
            targets: [service.loadBalancerTarget({ containerName, containerPort: 80, protocol: Protocol.TCP })],
            // targets:[service],
        });

        new elb.ApplicationListenerRule(this, "ListenerRule", {
            listener: props.httpsListener,
            priority: 3,
            targetGroups: [albTargetGroup],
            conditions: [elb.ListenerCondition.hostHeaders(['test.dliu.com'])],
        });

        // const securityGroup = new ec2.SecurityGroup(this, 'ServiceSecurityGroup', { vpc: props.vpc, });

        // securityGroup.connections.allowFrom(props.albSecurityGroup, ec2.Port.tcp(80), 'Allow traffic from ELB');


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