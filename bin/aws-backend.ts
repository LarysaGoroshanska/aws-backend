#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AwsBackendStack } from '../lib/aws-backend-stack';
import { HelloLambdaStack } from '../lib/hello-lambda/hello-lambda-stack';
import { ProductServiceStack } from '../lib/product-service-stack';
import { HelloS3Stack } from '../lib/hello-s3/hello-s3-stack';
import { ProductSqsStack } from '../lib/product-sqs/product-sqs-stack';
import { ProductSnsStack } from '../lib/product-sns/product-sns-stack';

const app = new cdk.App();
new AwsBackendStack(app, 'AwsBackendStack', {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});
new HelloLambdaStack(app, 'HelloLambdaStack', {});
new ProductServiceStack(app, 'ProductServiceStack', {});
new HelloS3Stack(app, 'HelloS3Stack', {});
new ProductSqsStack(app, 'ProductSqsStack');
new ProductSnsStack(app, 'ProductSnsStack');
