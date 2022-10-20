import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import {
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as cloudfront_origins,
} from "aws-cdk-lib";
import * as appsync from "@aws-cdk/aws-appsync-alpha";

interface GraphQLAPICFDistributionProps extends cdk.StackProps {
  api: appsync.GraphqlApi;
}
class GraphQLAPICFDistribution extends Construct {
  constructor(
    scope: Construct,
    id: string,
    props: GraphQLAPICFDistributionProps
  ) {
    super(scope, id);

    const { api } = props;

    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
      this,
      "APIResponseHeadersPolicy",
      {
        corsBehavior: {
          accessControlAllowCredentials: false,
          accessControlAllowHeaders: ["*"],
          accessControlAllowMethods: ["GET", "POST", "OPTIONS"],
          accessControlAllowOrigins: ["http://localhost:8080"],
          accessControlMaxAge: cdk.Duration.seconds(600),
          originOverride: true,
        },
      }
    );

    const apiCloudfrontDistribution = new cloudfront.Distribution(
      this,
      "apiCloudfrontDistribution",
      {
        defaultBehavior: {
          compress: true,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          origin: new cloudfront_origins.HttpOrigin(
            cdk.Fn.select(2, cdk.Fn.split("/", api.graphqlUrl))
          ),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          responseHeadersPolicy: responseHeadersPolicy,
        },
      }
    );

    // Export the new GraphQLURL as a CloudFormation export
    cdk.Stack.of(this).exportValue(
      `https://${apiCloudfrontDistribution.distributionDomainName}/graphql`,
      {
        name: "GraphQLAPICFDistributionURL",
      }
    );
    cdk.Stack.of(this).exportValue(api.graphqlUrl, {
      name: "GraphQLURLURL",
    });
  }
}

export class CfStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const api = new appsync.GraphqlApi(this, "Api", {
      name: "Api",
      schema: appsync.Schema.fromAsset(__dirname + "/schema.graphql"),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.IAM,
        },
      },
    });

    new GraphQLAPICFDistribution(this, "GraphQLAPICFDistribution", {
      api: api,
    });
  }
}
