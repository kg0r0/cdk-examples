import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class LambdaStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const lambdaFunction = new lambda.Function(this, 'LambdaFunction', {
      code: new lambda.AssetCode('src'),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_14_X,
    });
  }
}
