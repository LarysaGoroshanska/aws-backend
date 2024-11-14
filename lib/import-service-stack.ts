import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3Notifications from 'aws-cdk-lib/aws-s3-notifications';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const productBucket = new s3.Bucket(this, 'products-bucket', {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN, 
    });

    const api = new apigateway.SpecRestApi(this, 'files-api', {
      apiDefinition: apigateway.ApiDefinition.fromAsset(path.join(__dirname, '../swagger.yaml')),
      restApiName: 'API Gateway for import service',
      description: 'This API serves the import lambda functions.'
    });

    const catalogItemsSQSQueue = new Queue(this, "catalog-items-sqs-queue");

    const importProductsFileLambdaFunction = new NodejsFunction(this, 'import-products-file-lambda-function', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      entry: path.join(__dirname, '../lambda/import-products-file-lambda.ts'),
      environment: {
        BUCKET_NAME: productBucket.bucketName,
        SQS_QUEUE_URL: catalogItemsSQSQueue.queueUrl,
      },
    });

    const importFileParserLambdaFunction = new NodejsFunction(this, 'import-file-parser-lambda-function', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      entry: path.join(__dirname, '../lambda/import-file-parser-lambda.ts'),
      environment: {
        BUCKET_NAME: productBucket.bucketName,
      },
    });

    productBucket.grantRead(importProductsFileLambdaFunction)
    productBucket.grantRead(importFileParserLambdaFunction)

    const s3Policy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:GetObject'],
      resources: [`${productBucket.bucketArn}/uploaded/*`],
    });

    importProductsFileLambdaFunction.addToRolePolicy(s3Policy);

    productBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3Notifications.LambdaDestination(importFileParserLambdaFunction),
      { prefix: 'uploaded/' }
    );

    const importProductsFileLambdaIntegration = new apigateway.LambdaIntegration(importProductsFileLambdaFunction, {
      requestTemplates: {
        "application/json":
          `{ "fileName": "$input.params('fileName')", "ext": "$input.params('ext')" }`
      },
      integrationResponses: [
        {
          statusCode: '200',
        }
      ],
      proxy: true,
    })

    const importsResource  = api.root.addResource('import');

    importsResource.addMethod('GET', importProductsFileLambdaIntegration, {
      methodResponses: [{ statusCode: '200' }],
    });

    importsResource.addCorsPreflight({
      allowOrigins: ['https://dw4y2wj894dn8.cloudfront.net'],
      allowMethods: ['GET'],
    });

    catalogItemsSQSQueue.grantSendMessages(importFileParserLambdaFunction);
  }
}