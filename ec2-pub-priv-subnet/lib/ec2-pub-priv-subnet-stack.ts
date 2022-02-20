import * as cdk from 'aws-cdk-lib';
import { Tags } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { AmazonLinuxImage } from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';



// Create my own Ec2 resource and Ec2 props as these are not yet defined in CDK
class Ec2InstanceProps {
  readonly image: ec2.IMachineImage;
  readonly instanceType: ec2.InstanceType;
  readonly userData: ec2.UserData;
  readonly subnet: ec2.ISubnet;
  readonly role: iam.Role;
}

class Ec2 extends cdk.Resource {
  constructor(scope: Construct, id: string, props?: Ec2InstanceProps) {
    super(scope, id);

    if (props) {
      // create a profile to attch the role to the instance
      const profile = new iam.CfnInstanceProfile(this, `${id}Profile`, {
        roles: [props.role.roleName]
      });

      // create the instance
      const instance = new ec2.CfnInstance(this, id, {
        imageId: props.image.getImage(this).imageId,
        instanceType: props.instanceType.toString(),
        networkInterfaces: [
          {
            deviceIndex: "0",
            subnetId: props.subnet.subnetId
          }
        ]
        , userData: cdk.Fn.base64(props.userData.render())
        , iamInstanceProfile: profile.ref
      });

      // tag the instance
      Tags.of(instance).add('Name', `${Ec2PubPrivSubnetStack.name}/${id}`, {
      });
    }
  }
}

export class Ec2PubPrivSubnetStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // create VPC w/ public and private subnets in 1 AZ
    // this also creates a NAT Gateway 
    // I am using 1 AZ because it's a demo.  In real life always use >=2
    const vpc = new ec2.Vpc(this, 'my-cdk-vpc', {
      maxAzs: 1
    });
    const privateSubnet0 = vpc.privateSubnets[0];

    // define the IAM role that will allow the EC2 instance to communicate with SSM
    const role = new iam.Role(this, 'ec2Role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    });
    role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
    );

    // define a user data script to install & launch our web server 
    const userData = ec2.UserData.forLinux();
    // make sure the latest SSM Agent is installed.
    const SSM_AGENT_RPM = 'https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm';
    userData.addCommands(
      `sudo yum install -y ${SSM_AGENT_RPM}`,
      'restart amazon-ssm-agent'
    )
    // install and start Nginx
    userData.addCommands('yum install -y nginx',
      'chkconfig nginx on',
      'service nginx start'
    );

    // launch an EC2 instance in the private subnet
    new Ec2(this, 'my-cdk-instance', {
      image: new AmazonLinuxImage(),
      instanceType : ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
      subnet : privateSubnet0,
      role: role,
      userData : userData 
    })
  }
}
