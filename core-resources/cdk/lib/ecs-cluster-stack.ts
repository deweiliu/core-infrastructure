import { Vpc } from '@aws-cdk/aws-ec2';
import * as cdk from '@aws-cdk/core';
import * as ecs from '@aws-cdk/aws-ecs';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as  autoscaling from '@aws-cdk/aws-autoscaling';
import { ISubnet, PublicSubnet, SubnetType } from '@aws-cdk/aws-ec2';
import { IVpc } from '@aws-cdk/aws-ec2';
import { IHostedZone } from '@aws-cdk/aws-route53';
import { Duration } from '@aws-cdk/core';

export interface EcsClusterStackProps extends cdk.NestedStackProps {
    maxAzs: number;
    appId: number;
    vpc: IVpc;
    igwId: string;
    hostedZone: IHostedZone;
}

export class EcsClusterStack extends cdk.NestedStack {
    public cluster: ecs.Cluster;
    public clusterSecurityGroup: ec2.ISecurityGroup;
    public capacityProvider1: ecs.AsgCapacityProvider;
    public capacityProvider2: ecs.AsgCapacityProvider;
    constructor(scope: cdk.Construct, id: string, props: EcsClusterStackProps) {
        super(scope, id);

        const subnets: ISubnet[] = [];

        [...Array(props.maxAzs).keys()].forEach(azIndex => {
            const subnet = new PublicSubnet(this, `Subnet` + azIndex, {
                vpcId: props.vpc.vpcId,
                availabilityZone: cdk.Stack.of(this).availabilityZones[azIndex],
                cidrBlock: `10.0.10.${azIndex * 16}/28`,
                mapPublicIpOnLaunch: true,
            });
            new ec2.CfnRoute(this, 'PublicRouting' + azIndex, {
                destinationCidrBlock: '0.0.0.0/0',
                routeTableId: subnet.routeTable.routeTableId,
                gatewayId: props.igwId,
            });
            subnets.push(subnet);
        });

        const vpc = Vpc.fromVpcAttributes(this, 'CoreVpc', {
            vpcId: props.vpc.vpcId,
            availabilityZones: props.vpc.availabilityZones,
            publicSubnetIds: subnets.map(subnet => subnet.subnetId)
        });

        this.cluster = new ecs.Cluster(this, 'CoreCluster', { vpc, clusterName: 'CoreCluster' });
        const ec2Role = new iam.Role(this, 'EC2Role', {
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [iam.ManagedPolicy.fromManagedPolicyArn(this, 'EC2ContainerServicePolicy', 'arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role')],
            description: 'https://docs.aws.amazon.com/AmazonECS/latest/developerguide/instance_IAM_role.html',
        });

        this.clusterSecurityGroup = new ec2.SecurityGroup(this, 'ClusterSecurityGroup', { vpc, });

        const asg1 = new autoscaling.AutoScalingGroup(this, 'CoreASG1', {
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
            machineImage: ecs.EcsOptimizedImage.amazonLinux2(),
            keyName: 'ecs-instance',
            maxInstanceLifetime: Duration.days(30),
            desiredCapacity: 1,
            maxCapacity: 2,
            vpc,
            vpcSubnets: { subnetType: SubnetType.PUBLIC },
            newInstancesProtectedFromScaleIn: false,
            role: ec2Role,
            associatePublicIpAddress: true,
            securityGroup: this.clusterSecurityGroup,
        });

        this.capacityProvider1 = new ecs.AsgCapacityProvider(this, 'AsgCapacityProvider1', {
            autoScalingGroup: asg1,
            enableManagedTerminationProtection: false,
        });
        this.cluster.addAsgCapacityProvider(this.capacityProvider1);

        const asg2 = new autoscaling.AutoScalingGroup(this, 'CoreASG2', {
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
            machineImage: ecs.EcsOptimizedImage.amazonLinux2(ecs.AmiHardwareType.ARM),
            keyName: 'ecs-instance',
            maxInstanceLifetime: Duration.days(30),
            desiredCapacity: 0,
            maxCapacity: 1,
            vpc,
            vpcSubnets: { subnetType: SubnetType.PUBLIC },
            newInstancesProtectedFromScaleIn: false,
            role: ec2Role,
            associatePublicIpAddress: true,
            securityGroup: this.clusterSecurityGroup,
        });

        this.capacityProvider2 = new ecs.AsgCapacityProvider(this, 'AsgCapacityProvider2', {
            autoScalingGroup: asg2,
            enableManagedTerminationProtection: false,
        });
        this.cluster.addAsgCapacityProvider(this.capacityProvider2);
    }
}