import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { aws_secretsmanager as secretsmanager } from 'aws-cdk-lib';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import { aws_apigateway as apigateway } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';

export interface AuthStackProps extends cdk.StackProps{
  lambdaPath: string
  lambdaHandler: string
}

export class AuthStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);


    const vpc = new ec2.Vpc(this, 'VPC', {
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'SubnetName',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    const dbCredentialsSecret = new secretsmanager.Secret(this, 'DBCredentials', {
      secretName: 'CredentialsSecretName',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: 'username'
        }),
        excludePunctuation: true,
        includeSpace: false,
        generateStringKey: 'password'
      }
    });

    const dbInstance = new rds.DatabaseInstance(this, 'RDSInstance', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_12
      }),

      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
      vpc,
      credentials: rds.Credentials.fromSecret(dbCredentialsSecret),
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC
      },
      multiAz: false,
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      allowMajorVersionUpgrade: false,
      autoMinorVersionUpgrade: true,
      backupRetention: cdk.Duration.days(7),
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false
    });

    const lambdaFunction = new lambdaNodejs.NodejsFunction(this, 'NestAppLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: 'src/main.ts',  
      code: lambda.Code.fromAsset(props.lambdaPath),
      handler: props.lambdaHandler,    
      bundling: {
        externalModules: ['@nestjs/core', '@nestjs/common', '@nestjs/platform-express'],
        nodeModules: ['nestjs'],
      },
      environment: {
        DB_HOST: dbInstance.dbInstanceEndpointAddress,
        DB_PORT: '5432',
        DB_USER: dbCredentialsSecret.secretValueFromJson('username').toString(),
        DB_PASSWORD: dbCredentialsSecret.secretValueFromJson('password').toString(),
        DB_NAME: 'dbdatabase',
      },
    });

    const api = new apigateway.RestApi(this, 'NestApi', {
      restApiName: 'Nest Service',
      description: 'This service serves a Nest.js application.',
      deployOptions: {
        stageName: 'prod',
      },
    });

    const lambdaIntegration = new apigateway.LambdaIntegration(lambdaFunction);

    const nestApiResource = api.root.addResource('nest');
    nestApiResource.addMethod('ANY', lambdaIntegration);
  }
}