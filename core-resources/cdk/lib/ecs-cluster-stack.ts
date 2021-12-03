import * as route53 from '@aws-cdk/aws-route53';
import * as acm from '@aws-cdk/aws-certificatemanager';

import * as cdk from '@aws-cdk/core';
import * as ecs from '@aws-cdk/aws-ecs';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as  autoscaling from '@aws-cdk/aws-autoscaling';
import { ISecurityGroup, ISubnet, PublicSubnet } from '@aws-cdk/aws-ec2';


import * as elb from '@aws-cdk/aws-elasticloadbalancingv2';
import { IVpc } from '@aws-cdk/aws-ec2';
import { NetworkMode, Protocol } from '@aws-cdk/aws-ecs';
import { ApplicationListener } from '@aws-cdk/aws-elasticloadbalancingv2';
import { IHostedZone } from '@aws-cdk/aws-route53';
import { Duration } from '@aws-cdk/core';

export interface EcsClusterStackProps extends cdk.NestedStackProps {
    maxAzs: number;
    appId: number;
    vpc: IVpc;
    igw: string;
    httpsListener: elb.IApplicationListener;
    albSecurityGroup: ISecurityGroup;
    hostedZone: IHostedZone;
    loadBalancerDnsName: string;
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

        const cluster = new ecs.Cluster(this, 'CoreCluster', { vpc: props.vpc, clusterName: 'CoreCluster' });


        const ec2Role = new iam.Role(this, 'EC2Role', {
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerServiceforEC2Role')],
            description: 'https://docs.aws.amazon.com/AmazonECS/latest/developerguide/instance_IAM_role.html',
        });
        const asg = new autoscaling.AutoScalingGroup(this, 'MyFleet', {
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
            machineImage: ecs.EcsOptimizedImage.amazonLinux2(),
            desiredCapacity: 1,
            maxCapacity: 2,
            vpc: props.vpc,
            vpcSubnets: { subnets },
            newInstancesProtectedFromScaleIn: false,
            role: ec2Role,
        });


        const capacityProvider = new ecs.AsgCapacityProvider(this, 'AsgCapacityProvider', {
            autoScalingGroup: asg,
            enableManagedTerminationProtection: false,
        });
        cluster.addAsgCapacityProvider(capacityProvider);

        const taskDefinition = new ecs.Ec2TaskDefinition(this, 'TaskDefinition', { networkMode: NetworkMode.AWS_VPC });

        const containerName = 'home-site-container';

        taskDefinition.addContainer('Container', {
            image: ecs.ContainerImage.fromRegistry('deweiliu/home-site'),
            containerName,
            memoryReservationMiB: 256,
            portMappings: [{ containerPort: 80, hostPort: 80, protocol: Protocol.TCP }],
            logging: new ecs.AwsLogDriver({ streamPrefix: "home-site" }),
        });

        const securityGroup = new ec2.SecurityGroup(this, 'ServiceSecurityGroup', { vpc: props.vpc, });
        securityGroup.connections.allowFrom(props.albSecurityGroup, ec2.Port.tcp(80), 'Allow traffic from ELB');
        const service = new ecs.Ec2Service(this, 'Service', {
            cluster,
            taskDefinition,
            securityGroups: [securityGroup],
            vpcSubnets: { subnets },
        });

        const albTargetGroup = new elb.ApplicationTargetGroup(this, 'TargetGroup', {
            port: 80,
            protocol: elb.ApplicationProtocol.HTTP,
            healthCheck: { enabled: true },
            vpc: props.vpc,
            targetType: elb.TargetType.IP,
            targets: [service.loadBalancerTarget({ containerName, containerPort: 80, protocol: Protocol.TCP })],
            // targets:[service],
        });

        new elb.ApplicationListenerRule(this, "ListenerRule", {
            listener: props.httpsListener,
            priority: 3,
            targetGroups: [albTargetGroup],
            conditions: [elb.ListenerCondition.hostHeaders(['test.dliu.com'])],
        });

        const certificate = new acm.Certificate(this, 'SSLCertificate', {
            domainName: 'test.dliu.com',
            validation: acm.CertificateValidation.fromDns(props.hostedZone),
        });
        props.httpsListener.addCertificates('TestCertificate', [certificate]);


        const record = new route53.CnameRecord(this, "CnameRecord", {
            zone: props.hostedZone,
            domainName: props.loadBalancerDnsName,
            ttl: Duration.hours(1),
            recordName: 'test',
        });


    }
}