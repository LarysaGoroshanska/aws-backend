import { APIGatewayAuthorizerResult, APIGatewayTokenAuthorizerEvent } from 'aws-lambda';

export const basicAuthorizer = async (
    event: APIGatewayTokenAuthorizerEvent,
): Promise<APIGatewayAuthorizerResult> => {
  if (process.env.CREDENTIALS) {
    const authorizationToken = event.authorizationToken;
    if (!authorizationToken) {
      console.warn('Authorization header is missing.');
      return generatePolicy('Deny', event.methodArn, 401);
    }
  
    try {
      const base64Credentials = authorizationToken.split(' ')[1];
      const decodedCredentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
      const [username, password] = decodedCredentials.split(':');
  
      const areCredentialsValid = `${username}=${password}` === process.env.CREDENTIALS;

      if (areCredentialsValid) {
        return generatePolicy('Allow', event.methodArn);
      } else {
        return generatePolicy('Deny', event.methodArn, 403);
      }
    } catch (error) {
      console.error('Error processing authorization token:', error);
      return generatePolicy('Deny', event.methodArn, 403);
    }  
  } else {
    return generatePolicy('Deny', event.methodArn, 403);
  }
};

const generatePolicy = (
    effect: 'Allow' | 'Deny', 
    resource: string, 
    statusCode?: number,
): APIGatewayAuthorizerResult => {
  return {
    principalId: 'user',
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context: {
      statusCode: statusCode ? statusCode.toString() : '200',
    },
  };
}