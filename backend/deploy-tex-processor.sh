#!/bin/bash
# Build and push the TeX processor Docker image to ECR
# Usage: ./deploy-tex-processor.sh [PROFILE]

set -e

# Configuration
AWS_REGION="eu-west-1"
STACK_NAME="textbook-study-buddy"
ECR_REPO_NAME="${STACK_NAME}-tex-processor"
AWS_PROFILE="${1:-default}"

echo "==================================================="
echo "TeX Processor Deployment Script"
echo "==================================================="
echo "Region: $AWS_REGION"
echo "Stack: $STACK_NAME"
echo "ECR Repo: $ECR_REPO_NAME"
echo "Profile: $AWS_PROFILE"
echo "==================================================="

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --profile "$AWS_PROFILE" --query Account --output text)
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE_URI="${ECR_URI}/${ECR_REPO_NAME}:latest"

echo "Account ID: $ACCOUNT_ID"
echo "Image URI: $IMAGE_URI"
echo ""

# Step 1: Create ECR repository if it doesn't exist
echo "Step 1: Creating ECR repository..."
aws ecr describe-repositories --repository-names "$ECR_REPO_NAME" --region "$AWS_REGION" 2>/dev/null || \
  aws ecr create-repository --repository-name "$ECR_REPO_NAME" --region "$AWS_REGION" 2>/dev/null || \
  echo "Note: Could not create ECR repo (may already exist or need permissions). Continuing..."

# Step 2: Authenticate Docker with ECR
echo ""
echo "Step 2: Authenticating Docker with ECR..."
aws ecr get-login-password --region "$AWS_REGION" --profile "$AWS_PROFILE" | \
  docker login --username AWS --password-stdin "$ECR_URI"

# Step 3: Build Docker image
echo ""
echo "Step 3: Building Docker image..."
cd "$(dirname "$0")/ecs-tex-processor"

# Build TypeScript first
npm install
npm run build

# Build Docker image
docker build -t "$ECR_REPO_NAME" .

# Step 4: Tag and push to ECR
echo ""
echo "Step 4: Tagging and pushing image to ECR..."
docker tag "$ECR_REPO_NAME:latest" "$IMAGE_URI"
docker push "$IMAGE_URI"

echo ""
echo "==================================================="
echo "Docker image pushed successfully!"
echo "Image URI: $IMAGE_URI"
echo "==================================================="

# Step 5: Update SAM deployment with image URI
echo ""
echo "Step 5: Deploying SAM template with ECS configuration..."
cd ..

sam build

sam deploy \
  --parameter-overrides "NotificationEmail=ghostdev515@gmail.com TexProcessorImageUri=$IMAGE_URI" \
  --no-confirm-changeset \
  --region "$AWS_REGION"

# Step 6: Update samconfig.toml so future deploys include the image URI
echo ""
echo "Step 6: Updating samconfig.toml with image URI..."
if grep -q "TexProcessorImageUri" samconfig.toml; then
  echo "TexProcessorImageUri already in samconfig.toml"
else
  sed -i "s|parameter_overrides = \"NotificationEmail=ghostdev515@gmail.com\"|parameter_overrides = \"NotificationEmail=ghostdev515@gmail.com TexProcessorImageUri=$IMAGE_URI\"|" samconfig.toml
  echo "Updated samconfig.toml with TexProcessorImageUri"
fi

echo ""
echo "==================================================="
echo "Deployment complete!"
echo "==================================================="
echo ""
echo "To test TeX processing:"
echo "1. Upload a .tex file to the S3 bucket"
echo "2. Check CloudWatch Logs for ECS task output"
echo "   aws logs tail /ecs/${STACK_NAME}-tex-processor --region $AWS_REGION"
echo ""
