#!/usr/bin/env python3
import boto3
import json
from opensearchpy import OpenSearch, RequestsHttpConnection, AWSV4SignerAuth

REGION = 'eu-west-1'
COLLECTION_NAME = 'quickbook-vectors'
INDEX_NAME = 'textbook-index'

# Get collection endpoint
aoss = boto3.client('opensearchserverless', region_name=REGION)
response = aoss.batch_get_collection(names=[COLLECTION_NAME])
endpoint = response['collectionDetails'][0]['collectionEndpoint']
host = endpoint.replace('https://', '')

print(f"Collection endpoint: {endpoint}")

# Create OpenSearch client with AWS auth
credentials = boto3.Session().get_credentials()
auth = AWSV4SignerAuth(credentials, REGION, 'aoss')

client = OpenSearch(
    hosts=[{'host': host, 'port': 443}],
    http_auth=auth,
    use_ssl=True,
    verify_certs=True,
    connection_class=RequestsHttpConnection,
    timeout=300
)

# Create index with vector mapping
index_body = {
    "settings": {
        "index.knn": True
    },
    "mappings": {
        "properties": {
            "embedding": {
                "type": "knn_vector",
                "dimension": 1536,
                "method": {
                    "engine": "faiss",
                    "name": "hnsw"
                }
            },
            "content": {
                "type": "text"
            },
            "metadata": {
                "type": "object"
            }
        }
    }
}

try:
    response = client.indices.create(INDEX_NAME, body=index_body)
    print(f"✅ Index '{INDEX_NAME}' created successfully!")
    print(json.dumps(response, indent=2))
except Exception as e:
    if 'resource_already_exists_exception' in str(e):
        print(f"✅ Index '{INDEX_NAME}' already exists")
    else:
        print(f"❌ Error: {e}")
        raise
