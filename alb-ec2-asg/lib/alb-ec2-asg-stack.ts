import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';

export class AlbEc2AsgStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const vpc = new ec2.Vpc(this, 'vpc');

    const alb = new elbv2.ApplicationLoadBalancer(this, 'alb', {
      vpc,
      internetFacing: true
    });

    const listerner = alb.addListener('listener', {
      port: 80,
      open: true
    });

    // create user data script
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      'sudo su',
      'yum install -y httpd',
      'systemctl start httpd',
      'systemctl enable httpd',
      'echo "<h1>Hello World from $(hostname -f)</h1>" > /var/www/html/index.html'
    )

    const asg = new autoscaling.AutoScalingGroup(this, 'asg', {
      vpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MICRO,
      ),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      userData,
      minCapacity: 2,
      maxCapacity: 3,
    })

    // add target to the ALB listener
    listerner.addTargets('default-target', {
      port: 80,
      targets: [asg],
      healthCheck: {
        path: '/',
        unhealthyThresholdCount: 2,
        healthyThresholdCount: 5,
        interval: cdk.Duration.seconds(30),
      }
    });

    // add an action to the ALB listener
    listerner.addAction('/static', {
      priority: 5,
      conditions: [elbv2.ListenerCondition.pathPatterns(['/static'])],
      action: elbv2.ListenerAction.fixedResponse(200, {
        contentType: 'text/html',
        messageBody: '<h1>Static ALB Response</h1>',
      }),
    });

    // add scaling policy for the the Auto Scaling Group
    asg.scaleOnRequestCount('requests-per-minute', {
      targetRequestsPerMinute: 60,
    });

    // add scaling policy for the Auto Scaling Group
    asg.scaleOnCpuUtilization('cpu-util-scaling', {
      targetUtilizationPercent: 75,
    });

    // add the ALB DNS as an Output
    new cdk.CfnOutput(this, 'albDNS', {
      value: alb.loadBalancerDnsName
    })
  }
}
