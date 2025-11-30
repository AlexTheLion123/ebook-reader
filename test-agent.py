#!/usr/bin/env python3
import boto3
import sys
import json

def test_agent(agent_id, alias_id, question):
    client = boto3.client('bedrock-agent-runtime', region_name='eu-west-1')
    
    print(f"Testing Agent...")
    print(f"Question: {question}\n")
    
    try:
        response = client.invoke_agent(
            agentId=agent_id,
            agentAliasId=alias_id,
            sessionId='test-session-123',
            inputText=question
        )
        
        print("Response:")
        completion = ""
        
        for event in response['completion']:
            if 'chunk' in event:
                chunk = event['chunk']
                if 'bytes' in chunk:
                    text = chunk['bytes'].decode('utf-8')
                    completion += text
                    print(text, end='', flush=True)
        
        print("\n")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 test-agent.py <agent-id> <alias-id> [question]")
        sys.exit(1)
    
    agent_id = sys.argv[1]
    alias_id = sys.argv[2]
    question = sys.argv[3] if len(sys.argv) > 3 else "What is a derivative?"
    
    test_agent(agent_id, alias_id, question)
