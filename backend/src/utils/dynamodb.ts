import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
export const docClient = DynamoDBDocumentClient.from(client);

export const putItem = async (tableName: string, item: any) => {
  await docClient.send(new PutCommand({ TableName: tableName, Item: item }));
};

export const getItem = async (tableName: string, key: any) => {
  const result = await docClient.send(new GetCommand({ TableName: tableName, Key: key }));
  return result.Item;
};

export const queryItems = async (tableName: string, pk: string, skPrefix?: string) => {
  const params: any = {
    TableName: tableName,
    KeyConditionExpression: skPrefix ? 'PK = :pk AND begins_with(SK, :sk)' : 'PK = :pk',
    ExpressionAttributeValues: skPrefix ? { ':pk': pk, ':sk': skPrefix } : { ':pk': pk }
  };
  const result = await docClient.send(new QueryCommand(params));
  return result.Items || [];
};

export const query = async (tableName: string, keyCondition: string, values: any) => {
  const params = {
    TableName: tableName,
    KeyConditionExpression: keyCondition,
    ExpressionAttributeValues: values
  };
  const result = await docClient.send(new QueryCommand(params));
  return result.Items || [];
};

import { ScanCommand } from '@aws-sdk/lib-dynamodb';

export const queryByType = async (tableName: string, type: string) => {
  const params = {
    TableName: tableName,
    IndexName: 'TypeIndex',
    KeyConditionExpression: '#type = :type',
    ExpressionAttributeNames: { '#type': 'type' },
    ExpressionAttributeValues: { ':type': type }
  };
  const result = await docClient.send(new QueryCommand(params));
  return result.Items || [];
};

export const updateItem = async (tableName: string, key: any, updateExpression: string, expressionAttributeValues: any, expressionAttributeNames?: any) => {
  await docClient.send(new UpdateCommand({
    TableName: tableName,
    Key: key,
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    ExpressionAttributeNames: expressionAttributeNames
  }));
};
