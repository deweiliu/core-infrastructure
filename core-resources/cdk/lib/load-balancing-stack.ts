import { Construct } from 'constructs';
import {
    NestedStackProps, NestedStack,
    aws_ec2 as ec2,
    aws_route53 as route53,
    aws_elasticloadbalancingv2 as elb,
    aws_certificatemanager as acm,
} from 'aws-cdk-lib';

export interface LoadBalancingStackProps extends NestedStackProps {
    vpc: ec2.IVpc;
    igwId: string,
    hostedZone: route53.IHostedZone;
    maxAzs: number;
    appId: number;
}

export class LoadBalancingStack extends NestedStack {
    public loadBalancer: elb.ApplicationLoadBalancer;

    public albSecurityGroup: ec2.ISecurityGroup;
    public httpsListener: elb.ApplicationListener;
    constructor(scope: Construct, id: string, props: LoadBalancingStackProps) {
        super(scope, id);

        const subnets: ec2.Subnet[] = [];
        [...Array(props.maxAzs).keys()].forEach(azIndex => {
            const subnet = new ec2.PublicSubnet(this, `AlbSubnet${azIndex}`, {
                vpcId: props.vpc.vpcId,
                availabilityZone: props.vpc.availabilityZones[azIndex],
                cidrBlock: `10.0.${props.appId}.${(azIndex + 2) * 16}/28`,
                mapPublicIpOnLaunch: true,
            });
            new ec2.CfnRoute(this, 'PublicRouting' + azIndex, {
                destinationCidrBlock: '0.0.0.0/0',
                routeTableId: subnet.routeTable.routeTableId,
                gatewayId: props.igwId,
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

        const httpListener = this.loadBalancer.addRedirect({
            sourcePort: 80, sourceProtocol: elb.ApplicationProtocol.HTTP,
            targetPort: 443, targetProtocol: elb.ApplicationProtocol.HTTPS,
        });

        const certificate = new acm.Certificate(this, 'DefaultSSL', {
            domainName: `*.${props.hostedZone.zoneName}`,
            validation: acm.CertificateValidation.fromDns(props.hostedZone),
        });

        this.httpsListener = this.loadBalancer.addListener('HttpsListner', {
            port: 443,
            protocol: elb.ApplicationProtocol.HTTPS,
            defaultAction: elb.ListenerAction.redirect({ host: 'dliu.com', permanent: true }),
            certificates: [certificate],
        });
    }
}
