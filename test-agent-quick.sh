#!/bin/bash
# Quick test of deployed agent

AGENT_ID="HGAOUG8YYO"
ALIAS_ID="NVVOJM5GAY"
KB_ID="46UH9JADOK"
REGION="eu-west-1"

echo "=== QuickBook Agent Quick Test ==="
echo "Agent: $AGENT_ID"
echo "Alias: $ALIAS_ID"
echo "KB: $KB_ID"
echo ""

# Test 1: Knowledge Base Retrieval
echo "Test 1: Knowledge Base Retrieval"
echo "Query: 'derivative'"
aws bedrock-agent-runtime retrieve \
  --knowledge-base-id $KB_ID \
  --region $REGION \
  --retrieval-query '{"text": "derivative"}' \
  --retrieval-configuration '{"vectorSearchConfiguration": {"numberOfResults": 2}}' \
  --query 'retrievalResults[0].content.text' \
  --output text 2>&1 | head -c 200
echo "..."
echo ""

# Test 2: Agent Invocation
echo ""
echo "Test 2: Agent Invocation"
echo "Question: 'What is a derivative?'"
echo ""

python3 test-agent.py $AGENT_ID $ALIAS_ID "What is a derivative?"

echo ""
echo "=== Test Complete ==="
