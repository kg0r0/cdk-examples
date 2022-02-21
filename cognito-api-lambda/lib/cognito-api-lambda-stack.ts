import { LambdaRestApi, CfnAuthorizer, LambdaIntegration, AuthorizationType } from 'aws-cdk-lib/aws-apigateway';
import { AssetCode, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { App, Stack, StackProps } from 'aws-cdk-lib';
import { UserPool } from 'aws-cdk-lib/aws-cognito'

export class CognitoApiLambdaStack extends Stack {
  constructor(app: App, id: string, props?: StackProps) {
    super(app, id, props);

    // The code that defines your stack goes here
    const helloWorldFunction = new Function(this, 'helloWorldFunction', {
      code: new AssetCode('src'),
      handler: 'helloworld.handler',
      runtime: Runtime.NODEJS_12_X
    });

    const helloWorldLambdaRestApi = new LambdaRestApi(this, 'helloWorldLambdaRestApi', {
      restApiName: 'Hello World API',
      handler: helloWorldFunction,
      proxy: false,
    });

    // Cognito User Pool with Email Sign-in Type.
    const userPool = new UserPool(this, 'userPool', {
      signInAliases: {
        email: true
      }
    });

    // Authorizer for the Hello World API that uses the
    // Cognito User pool to Authorize users.
    const authorizer = new CfnAuthorizer(this, 'cfnAuth', {
      restApiId: helloWorldLambdaRestApi.restApiId,
      name: 'HelloWorldAPIAuthorizer',
      type: 'COGNITO_USER_POOLS',
      identitySource: 'method.request.header.Authorization',
      providerArns: [userPool.userPoolArn],
    });

    // Hello Resource API for the REST API. 
    const hello = helloWorldLambdaRestApi.root.addResource('HELLO');

    // GET method for the HELLO API resource. It uses Cognito for
    // authorization and the auathorizer defined above.
    hello.addMethod('GET', new LambdaIntegration(helloWorldFunction), {
      authorizationType: AuthorizationType.COGNITO,
      authorizer: {
        authorizerId: authorizer.ref
      }
    })
  }
}

const app = new App();
new CognitoApiLambdaStack(app, 'CognitoApiLambdaStack');
app.synth();