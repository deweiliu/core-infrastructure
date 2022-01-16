import * as cdk from '@aws-cdk/core';
import * as ecs from '@aws-cdk/aws-ecs';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as  autoscaling from '@aws-cdk/aws-autoscaling';
import { ISubnet, PublicSubnet, SubnetType } from '@aws-cdk/aws-ec2';
import { IHostedZone } from '@aws-cdk/aws-route53';

export interface EcsClusterStackProps extends cdk.NestedStackProps {
    maxAzs: number;
    appId: number;
    vpc: ec2.IVpc;
    igwId: string;
    hostedZone: IHostedZone;
}

interface AwsConfig {
    instance: ec2.InstanceClass;
    size: ec2.InstanceSize;
    hardwareType: ecs.AmiHardwareType;
    minCapacity?: number;
    maxCapacity?: number;
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
                cidrBlock: `10.0.${props.appId}.${(azIndex + 4) * 16}/28`,
                mapPublicIpOnLaunch: true,
            });
            new ec2.CfnRoute(this, 'PublicRouting' + azIndex, {
                destinationCidrBlock: '0.0.0.0/0',
                routeTableId: subnet.routeTable.routeTableId,
                gatewayId: props.igwId,
            });
            subnets.push(subnet);
        });

        const vpc = ec2.Vpc.fromVpcAttributes(this, 'CoreVpc', {
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

        const asgConfigs: AwsConfig[] = [
            // {
            //     instance: ec2.InstanceClass.T2,
            //     size: ec2.InstanceSize.MICRO,
            //     hardwareType: ecs.AmiHardwareType.STANDARD,
            //     minCapacity: 1,
            //     maxCapacity: 1,
            // },
            {
                instance: ec2.InstanceClass.T4G,
                size: ec2.InstanceSize.MICRO,
                hardwareType: ecs.AmiHardwareType.ARM,
                minCapacity: 1,
                maxCapacity: 1,
            },
            {
                instance: ec2.InstanceClass.T4G,
                size: ec2.InstanceSize.NANO,
                hardwareType: ecs.AmiHardwareType.ARM,
                minCapacity: 1,
                maxCapacity: 2,
            },
        ];

        asgConfigs.forEach((config, index) => {

            const asg = new autoscaling.AutoScalingGroup(this, 'CoreASG' + index, {
                instanceType: ec2.InstanceType.of(config.instance, config.size),
                machineImage: ecs.EcsOptimizedImage.amazonLinux2(config.hardwareType),
                keyName: 'ecs-instance',
                maxInstanceLifetime: cdk.Duration.days(7),
                minCapacity: config.minCapacity,
                maxCapacity: config.maxCapacity,
                vpc,
                vpcSubnets: { subnetType: SubnetType.PUBLIC },
                newInstancesProtectedFromScaleIn: false,
                role: ec2Role,
                associatePublicIpAddress: true,
                securityGroup: this.clusterSecurityGroup,
            });

            const capacityProvider = new ecs.AsgCapacityProvider(this, 'AsgCapacityProvider' + index, {
                autoScalingGroup: asg,
                enableManagedTerminationProtection: false,
            });
            this.cluster.addAsgCapacityProvider(capacityProvider);

        })
    }
}