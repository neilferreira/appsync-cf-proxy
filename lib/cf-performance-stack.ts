import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import {
  aws_lambda as lambda,
} from "aws-cdk-lib";
import * as appsync from "@aws-cdk/aws-appsync-alpha";


export class CfPerformanceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const authorizerLambda = new lambda.Function(this, "authorizerLambda", {
      environment: {},
      code: lambda.Code.fromAsset(__dirname + "/lambdas/authorizer", {}),
      timeout: cdk.Duration.seconds(30),
      runtime: lambda.Runtime.PYTHON_3_8,
      memorySize: 2560,
      handler: "handler.handler",
    });

    const apiLambda = new lambda.Function(this, "apiLambda", {
      environment: {},
      code: lambda.Code.fromAsset(__dirname + "/lambdas/api", {}),
      timeout: cdk.Duration.seconds(30),
      runtime: lambda.Runtime.PYTHON_3_8,
      memorySize: 2560,
      handler: "handler.handler",
    });

    const api = new appsync.GraphqlApi(this, "Api", {
      name: "Api",
      schema: appsync.Schema.fromAsset(__dirname + "/schema.graphql"),

      xrayEnabled: true,
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.LAMBDA,
          lambdaAuthorizerConfig: {
            handler: authorizerLambda,
            // can also specify `resultsCacheTtl` and `validationRegex`.
          },
        },
        additionalAuthorizationModes: [
          {
            authorizationType: appsync.AuthorizationType.IAM,
          },
        ],
      },
    });

    const lambdaDataSource = api.addLambdaDataSource(
      'apiDataSource',
      apiLambda
    );

    lambdaDataSource.createResolver({
      typeName: 'Query',
      fieldName: 'getDemos',
    });
  }
}
