import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import { aws_lambda as lambda } from "aws-cdk-lib";
import * as appsync from "@aws-cdk/aws-appsync-alpha";
import { HttpLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import {
  HttpLambdaAuthorizer,
  HttpLambdaResponseType,
} from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";
import {
  CorsHttpMethod,
  HttpApi,
  HttpMethod,
} from "@aws-cdk/aws-apigatewayv2-alpha";

interface GraphQLAPIProps extends cdk.StackProps {
  apiLambda: lambda.Function;
  authorizerLambda: lambda.Function;
}
class GraphQLAPI extends Construct {
  constructor(scope: Construct, id: string, props: GraphQLAPIProps) {
    super(scope, id);

    const { apiLambda, authorizerLambda } = props;

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
      "apiDataSource",
      apiLambda
    );

    lambdaDataSource.createResolver({
      typeName: "Query",
      fieldName: "getDemos",
    });

    cdk.Stack.of(this).exportValue(api.graphqlUrl, {
      name: "GraphQLAPIURL",
    });
  }
}

interface APIGWAPIProps extends cdk.StackProps {
  apiLambda: lambda.Function;
  authorizerLambda: lambda.Function;
}
class APIGWAPI extends Construct {
  constructor(scope: Construct, id: string, props: APIGWAPIProps) {
    super(scope, id);

    const { apiLambda, authorizerLambda } = props;

    const integration = new HttpLambdaIntegration(
      "OnboardingLambdaIntegration",
      apiLambda
    );

    const authorizer = new HttpLambdaAuthorizer(
      "Authorizer",
      authorizerLambda,
      {
        responseTypes: [HttpLambdaResponseType.SIMPLE],
      }
    );

    const httpApi = new HttpApi(this, "HttpApi", {
      description: "Example API",
    });

    httpApi.addRoutes({
      path: "/getDemos",
      methods: [HttpMethod.POST],
      integration,
      authorizer,
    });

    cdk.Stack.of(this).exportValue(httpApi.url, {
      name: "APIGWAPIURL",
    });
  }
}

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

    new GraphQLAPI(this, "GraphQLAPI", {
      authorizerLambda,
      apiLambda,
    });

    new APIGWAPI(this, "APIGWAPI", {
      authorizerLambda,
      apiLambda,
    });
  }
}
