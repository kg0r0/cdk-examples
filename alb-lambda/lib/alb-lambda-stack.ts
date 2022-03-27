import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as targetv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class AlbLambdaStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const prefix: string = 'alb-lambda';

    const vpc = new ec2.Vpc(this, 'Vpc', {
      cidr: '10.0.0.0/16',
      enableDnsHostnames: true,
      enableDnsSupport: true,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'PublicSubnet',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'PrivateSubnet',
          subnetType: ec2.SubnetType.PRIVATE,
        },
      ],
      natGateways: 2,
      maxAzs: 2,
    });

    const securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      securityGroupName: `${prefix}-sg`,
      vpc,
    });
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));

    const alb = new elbv2.ApplicationLoadBalancer(this, 'Alb', {
      vpc,
      vpcSubnets: vpc.selectSubnets({ subnetGroupName: 'PublicSubnet' }),
      loadBalancerName: `${prefix}-alb`,
      internetFacing: true,
      securityGroup,
    });

    const helloWorldFunction = new lambda.Function(this, 'HelloWorldFunction', {
      code: lambda.Code.fromAsset('src'),
      functionName: `${prefix}-hello-world`,
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_12_X,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      vpc,
    });

    const albTargetGroup = new elbv2.ApplicationTargetGroup(
      this,
      'AlbTargetGroup',
      {
        vpc,
        targetGroupName: `${prefix}-tg`,
        targetType: elbv2.TargetType.LAMBDA,
        targets: [new targetv2.LambdaTarget(helloWorldFunction)],
      }
    );

    alb.addListener('AlbListener', {
      protocol: elbv2.ApplicationProtocol.HTTP,
      port: 80,
      defaultTargetGroups: [albTargetGroup],
    });
  }

}
