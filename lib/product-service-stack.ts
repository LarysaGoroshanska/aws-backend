import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const api = new apigateway.RestApi(this, 'products-api', {
      restApiName: 'Products API Gateway',
      description: 'This API serves the Products Lambda functions.'
    });

    const productsTable = new dynamodb.Table(this, 'Products', {
      tableName: 'Products',
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
    });

    const getProducstLambdaFunction = new NodejsFunction(this, 'get-products-lambda-function', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      environment: {
        TABLE_NAME: 'Products'
      },
      entry: path.join(__dirname, '../lambda/get-products-list-lambda.ts'),
    });

    const getProductByIdLambdaFunction = new NodejsFunction(this, 'get-product-by-id-lambda-function', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      environment: {
        TABLE_NAME: 'Products'
      },
      entry: path.join(__dirname, '../lambda/get-product-by-id-lambda.ts'),
    });

    const createProductLambdaFunction = new NodejsFunction(this, 'create-product-lambda-function', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      environment: {
        TABLE_NAME: 'Products'
      },
      entry: path.join(__dirname, '../lambda/create-product-lambda.ts'),
    });

    const getProductsIntegration = new apigateway.LambdaIntegration(getProducstLambdaFunction, {
        integrationResponses: [ 
          {
            statusCode: '200',
          }
        ],
        proxy: false,
      });

    const productByIdLambdaIntegration = new apigateway.LambdaIntegration(getProductByIdLambdaFunction, {
      integrationResponses: [
        {
          statusCode: '200',
        }
      ],
      proxy: false,
    });

    const createProductLambdaIntegration = new apigateway.LambdaIntegration(createProductLambdaFunction, {
      integrationResponses: [
        {
          statusCode: '200',
        }
      ],
      proxy: false,
    });

    const productsResource = api.root.addResource('products');
    const productByIdResource = productsResource.addResource('{id}');

    productsResource.addMethod('GET', getProductsIntegration, {
      methodResponses: [{ statusCode: '200' }]
    });

    productsResource.addMethod('POST', createProductLambdaIntegration, {
      methodResponses: [{ statusCode: '200' }],
    });

    productByIdResource.addMethod('GET', productByIdLambdaIntegration, {
      methodResponses: [{ statusCode: '200' }],
    });

    productsResource.addCorsPreflight({
      allowOrigins: ['https://your-frontend-url.com'],
      allowMethods: ['GET'],
    }); 

    productsTable.grantReadData(getProductByIdLambdaFunction);
    productsTable.grantReadData(getProductByIdLambdaFunction);
    productsTable.grantWriteData(createProductLambdaFunction);
  }
}
