#!/bin/bash
set -e

REGION="eu-west-1"
COLLECTION_NAME="quickbook-vectors"
INDEX_NAME="textbook-index"

echo "Getting OpenSearch collection endpoint..."
COLLECTION_ENDPOINT=$(aws opensearchserverless batch-get-collection \
  --names $COLLECTION_NAME \
  --region $REGION \
  --query 'collectionDetails[0].collectionEndpoint' \
  --output text)

if [ -z "$COLLECTION_ENDPOINT" ] || [ "$COLLECTION_ENDPOINT" == "None" ]; then
  echo "Error: Collection not found or endpoint not available"
  exit 1
fi

echo "Collection endpoint: $COLLECTION_ENDPOINT"

# Remove https:// prefix for the host
HOST=$(echo $COLLECTION_ENDPOINT | sed 's|https://||')

echo "Creating index: $INDEX_NAME"

# Create the index with vector field mapping
aws opensearchserverless --region $REGION \
  --endpoint-url $COLLECTION_ENDPOINT \
  --no-verify-ssl \
  put-index \
  --index-name $INDEX_NAME \
  --body '{
    "settings": {
      "index": {
        "knn": true
      }
    },
    "mappings": {
      "properties": {
        "embedding": {
          "type": "knn_vector",
          "dimension": 1536
        },
        "content": {
          "type": "text"
        },
        "metadata": {
          "type": "object"
        }
      }
    }
  }' 2>/dev/null || {
    # Fallback: Use curl with AWS SigV4
    echo "Using curl with AWS SigV4..."
    
    curl -X PUT "$COLLECTION_ENDPOINT/$INDEX_NAME" \
      --aws-sigv4 "aws:amz:$REGION:aoss" \
      --user "$(aws configure get aws_access_key_id):$(aws configure get aws_secret_access_key)" \
      -H "Content-Type: application/json" \
      -d '{
        "settings": {
          "index": {
            "knn": true
          }
        },
        "mappings": {
          "properties": {
            "embedding": {
              "type": "knn_vector",
              "dimension": 1536
            },
            "content": {
              "type": "text"
            },
            "metadata": {
              "type": "object"
            }
          }
        }
      }'
  }

echo ""
echo "Index created successfully!"
