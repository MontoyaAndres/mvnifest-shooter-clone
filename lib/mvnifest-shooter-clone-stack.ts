import * as path from "path";
import { CfnOutput, Fn, Stack, StackProps } from "aws-cdk-lib";
import {
  AccountRecovery,
  UserPool,
  UserPoolClient,
  UserPoolOperation,
  VerificationEmailStyle,
} from "aws-cdk-lib/aws-cognito";
import { Code, Function, LayerVersion, Runtime } from "aws-cdk-lib/aws-lambda";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import {
  AuthorizationType,
  FieldLogLevel,
  GraphqlApi,
  MappingTemplate,
  Schema,
  UserPoolDefaultAction,
} from "@aws-cdk/aws-appsync-alpha";
import { Construct } from "constructs";

const NODE_ENV = process.env.NODE_ENV!;

export class MvnifestShooterCloneStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const userPool = new UserPool(
      this,
      `mvnifest-shooter-app-user-pool-${NODE_ENV}`,
      {
        selfSignUpEnabled: true,
        accountRecovery: AccountRecovery.PHONE_AND_EMAIL,
        userVerification: {
          emailStyle: VerificationEmailStyle.CODE,
        },
        autoVerify: {
          email: true,
        },
        standardAttributes: {
          email: {
            required: true,
            mutable: true,
          },
        },
      }
    );

    const userPoolClient = new UserPoolClient(
      this,
      `UserPoolClient-${NODE_ENV}`,
      {
        userPool,
      }
    );

    const api = new GraphqlApi(this, `mvnifest-shooter-api-${NODE_ENV}`, {
      name: `mvnifest-shooter-api-${NODE_ENV}`,
      logConfig: {
        fieldLogLevel: FieldLogLevel.ALL,
      },
      schema: Schema.fromAsset(
        path.join(__dirname, "../graphql/schema.graphql")
      ),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool: userPool,
            defaultAction: UserPoolDefaultAction.ALLOW,
          },
        },
      },
    });

    const generalLayer = new LayerVersion(this, "GeneralLayer", {
      code: Code.fromAsset(path.join(__dirname, "../functions/general-layer")),
      compatibleRuntimes: [Runtime.NODEJS_14_X],
      license: "Apache-2.0",
      description: "General layer for lambdas",
    });

    const ssmIAMPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["ssm:GetParameters"],
      resources: [
        Fn.sub(
          "arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/NODE_ENV/mvnifest-shooter/neo4j_connection_uri".replace(
            "NODE_ENV",
            NODE_ENV
          )
        ),
        Fn.sub(
          "arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/NODE_ENV/mvnifest-shooter/neo4j_username".replace(
            "NODE_ENV",
            NODE_ENV
          )
        ),
        Fn.sub(
          "arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/NODE_ENV/mvnifest-shooter/neo4j_password".replace(
            "NODE_ENV",
            NODE_ENV
          )
        ),
      ],
    });

    // User Post Confirmation Trigger - Cognito Post Confirmation Trigger implementation
    const MvnifestShooterUserCognitoTriggerPostConfirmation = new Function(
      this,
      `mvnifest-shooter-user-cognito-trigger-post-confirmation-${NODE_ENV}`,
      {
        runtime: Runtime.NODEJS_14_X,
        code: Code.fromAsset(
          path.join(__dirname, "../functions/postConfirmation")
        ),
        handler: "index.handler",
        environment: {
          NODE_ENV,
        },
        layers: [generalLayer],
      }
    );
    MvnifestShooterUserCognitoTriggerPostConfirmation.addToRolePolicy(
      ssmIAMPolicy
    );
    userPool.addTrigger(
      UserPoolOperation.POST_CONFIRMATION,
      MvnifestShooterUserCognitoTriggerPostConfirmation
    );

    // User handler - AppSync DataSource implementation
    const MvnifestShooterUsersHandler = new Function(
      this,
      `mvnifest-shooter-users-handler-${NODE_ENV}`,
      {
        runtime: Runtime.NODEJS_14_X,
        code: Code.fromAsset(path.join(__dirname, "../functions/users")),
        handler: "index.handler",
        environment: {
          NODE_ENV,
        },
        layers: [generalLayer],
      }
    );
    MvnifestShooterUsersHandler.addToRolePolicy(ssmIAMPolicy);

    const shooterUserFunctionDS = api.addLambdaDataSource(
      "ShooterUserFunctionDataSource",
      MvnifestShooterUsersHandler
    );
    shooterUserFunctionDS.createResolver({
      typeName: "Query",
      fieldName: "getUser",
      requestMappingTemplate: MappingTemplate.lambdaRequest(),
      responseMappingTemplate: MappingTemplate.lambdaResult(),
    });

    // Section handler - AppSync DataSource implementation
    const MvnifestShooterSectionHandler = new Function(
      this,
      `mvnifest-shooter-sections-handler-${NODE_ENV}`,
      {
        runtime: Runtime.NODEJS_14_X,
        code: Code.fromAsset(path.join(__dirname, "../functions/sections")),
        handler: "index.handler",
        environment: {
          NODE_ENV,
        },
        layers: [generalLayer],
      }
    );
    MvnifestShooterSectionHandler.addToRolePolicy(ssmIAMPolicy);

    const shooterSectionFunctionDS = api.addLambdaDataSource(
      "ShooterSectionFunctionDataSource",
      MvnifestShooterSectionHandler
    );
    shooterSectionFunctionDS.createResolver({
      typeName: "Query",
      fieldName: "getSection",
      requestMappingTemplate: MappingTemplate.lambdaRequest(),
      responseMappingTemplate: MappingTemplate.lambdaResult(),
    });
    shooterSectionFunctionDS.createResolver({
      typeName: "Query",
      fieldName: "listSections",
      requestMappingTemplate: MappingTemplate.lambdaRequest(),
      responseMappingTemplate: MappingTemplate.lambdaResult(),
    });
    shooterSectionFunctionDS.createResolver({
      typeName: "Mutation",
      fieldName: "createSection",
      requestMappingTemplate: MappingTemplate.lambdaRequest(),
      responseMappingTemplate: MappingTemplate.lambdaResult(),
    });
    shooterSectionFunctionDS.createResolver({
      typeName: "Mutation",
      fieldName: "updateSection",
      requestMappingTemplate: MappingTemplate.lambdaRequest(),
      responseMappingTemplate: MappingTemplate.lambdaResult(),
    });
    shooterSectionFunctionDS.createResolver({
      typeName: "Mutation",
      fieldName: "deleteSection",
      requestMappingTemplate: MappingTemplate.lambdaRequest(),
      responseMappingTemplate: MappingTemplate.lambdaResult(),
    });
    shooterSectionFunctionDS.createResolver({
      typeName: "Section",
      fieldName: "user",
      requestMappingTemplate: MappingTemplate.lambdaRequest(),
      responseMappingTemplate: MappingTemplate.lambdaResult(),
    });
    shooterSectionFunctionDS.createResolver({
      typeName: "Section",
      fieldName: "publications",
      requestMappingTemplate: MappingTemplate.lambdaRequest(),
      responseMappingTemplate: MappingTemplate.lambdaResult(),
    });

    // Publication handler - AppSync DataSource implementation
    const MvnifestShooterPublicationsHandler = new Function(
      this,
      `mvnifest-shooter-publications-handler-${NODE_ENV}`,
      {
        runtime: Runtime.NODEJS_14_X,
        code: Code.fromAsset(path.join(__dirname, "../functions/publications")),
        handler: "index.handler",
        environment: {
          NODE_ENV,
        },
        layers: [generalLayer],
      }
    );
    MvnifestShooterPublicationsHandler.addToRolePolicy(ssmIAMPolicy);

    const shooterPublicationFunctionDS = api.addLambdaDataSource(
      "ShooterPublicationFunctionDataSource",
      MvnifestShooterPublicationsHandler
    );
    shooterPublicationFunctionDS.createResolver({
      typeName: "Query",
      fieldName: "getPublication",
      requestMappingTemplate: MappingTemplate.lambdaRequest(),
      responseMappingTemplate: MappingTemplate.lambdaResult(),
    });
    shooterPublicationFunctionDS.createResolver({
      typeName: "Query",
      fieldName: "listPublications",
      requestMappingTemplate: MappingTemplate.lambdaRequest(),
      responseMappingTemplate: MappingTemplate.lambdaResult(),
    });
    shooterPublicationFunctionDS.createResolver({
      typeName: "Mutation",
      fieldName: "createPublication",
      requestMappingTemplate: MappingTemplate.lambdaRequest(),
      responseMappingTemplate: MappingTemplate.lambdaResult(),
    });
    shooterPublicationFunctionDS.createResolver({
      typeName: "Mutation",
      fieldName: "updatePublication",
      requestMappingTemplate: MappingTemplate.lambdaRequest(),
      responseMappingTemplate: MappingTemplate.lambdaResult(),
    });
    shooterPublicationFunctionDS.createResolver({
      typeName: "Mutation",
      fieldName: "deletePublication",
      requestMappingTemplate: MappingTemplate.lambdaRequest(),
      responseMappingTemplate: MappingTemplate.lambdaResult(),
    });

    new CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId,
    });

    new CfnOutput(this, "UserPoolClientId", {
      value: userPoolClient.userPoolClientId,
    });

    new CfnOutput(this, "GraphQLAPIURL", {
      value: api.graphqlUrl,
    });
  }
}
