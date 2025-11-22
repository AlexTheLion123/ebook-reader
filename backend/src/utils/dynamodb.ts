import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

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
