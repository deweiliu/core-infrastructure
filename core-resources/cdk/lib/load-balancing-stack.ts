import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as elb from '@aws-cdk/aws-elasticloadbalancingv2';
import * as route53 from '@aws-cdk/aws-route53';
import { PublicSubnet, Subnet } from '@aws-cdk/aws-ec2';

export interface LoadBalancingStackProps extends cdk.NestedStackProps {
    vpc: ec2.IVpc;
    igw: string,
    hostedZone: route53.IHostedZone;
    maxAzs: number;
    appId: number;
}

export class LoadBalancingStack extends cdk.NestedStack {
    public loadBalancer: elb.ApplicationLoadBalancer;
    public albTargetGroup: elb.ApplicationTargetGroup;
    public albSecurityGroup: ec2.ISecurityGroup;
    public httpsListener: elb.ApplicationListener;
    constructor(scope: cdk.Construct, id: string, props: LoadBalancingStackProps) {
        super(scope, id);

        const subnets: Subnet[] = [];
        [...Array(props.maxAzs).keys()].forEach(azIndex => {
            const subnet = new PublicSubnet(this, `AlbSubnet${azIndex}`, {
                vpcId: props.vpc.vpcId,
                availabilityZone: props.vpc.availabilityZones[azIndex],
                cidrBlock: `10.0.${props.appId}.${azIndex * 16}/28`,
                mapPublicIpOnLaunch: true,
            });
            new ec2.CfnRoute(this, 'PublicRouting' + azIndex, {
                destinationCidrBlock: '0.0.0.0/0',
                routeTableId: subnet.routeTable.routeTableId,
                gatewayId: props.igw,
            });
            subnets.push(subnet);
        });

        this.albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', { vpc: props.vpc, });
        this.albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
        this.albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443));


        this.loadBalancer = new elb.ApplicationLoadBalancer(this,
            'ApplicationLoadBalancer',
            {
                vpc: props.vpc,
                http2Enabled: true,
                internetFacing: true,
                vpcSubnets: { subnets },
                securityGroup: this.albSecurityGroup,
            });

        this.albTargetGroup = new elb.ApplicationTargetGroup(this, 'AlbDefaultTargetGroup', {
            port: 80,
            protocol: elb.ApplicationProtocol.HTTP,
            healthCheck: { enabled: true },
            vpc: props.vpc,
            targetType: elb.TargetType.IP,
        });

        const httpListener = this.loadBalancer.addRedirect({
            sourcePort: 80, sourceProtocol: elb.ApplicationProtocol.HTTP,
            targetPort: 443, targetProtocol: elb.ApplicationProtocol.HTTPS,
        });

        const certificate = new acm.Certificate(this, 'DefaultCertificate', {
            domainName: props.hostedZone.zoneName,
            validation: acm.CertificateValidation.fromDns(props.hostedZone),
        });

        this.httpsListener = this.loadBalancer.addListener('HttpsListner', {
            port: 443,
            protocol: elb.ApplicationProtocol.HTTPS,
            defaultTargetGroups: [this.albTargetGroup],
            certificates: [certificate],
        });
    }
}
