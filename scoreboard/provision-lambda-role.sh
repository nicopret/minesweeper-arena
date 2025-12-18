#!/usr/bin/env bash
set -euo pipefail

# Provisions/updates an IAM role for the user-identity Lambda.
# Outputs the role ARN on success.
#
# Usage: ./provision-lambda-role.sh
# Env (optional):
#   ROLE_NAME=user-identity-lambda
#   USER_IDENTITY_TABLE=UserIdentity
#   AWS_REGION=us-east-1

ROLE_NAME="${ROLE_NAME:-user-identity-lambda}"
USER_IDENTITY_TABLE="${USER_IDENTITY_TABLE:-UserIdentity}"
AWS_REGION="${AWS_REGION:-us-east-1}"

TRUST_JSON=$(cat <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
)

POLICY_JSON=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DescribeTable"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/${USER_IDENTITY_TABLE}"
    }
  ]
}
EOF
)

echo "Ensuring IAM role ${ROLE_NAME} exists..."
ROLE_ARN=""
if aws iam get-role --role-name "$ROLE_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
  ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --region "$AWS_REGION" --query 'Role.Arn' --output text)
  echo "Role already exists: $ROLE_ARN"
else
  ROLE_ARN=$(aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "$TRUST_JSON" \
    --region "$AWS_REGION" \
    --query 'Role.Arn' --output text)
  echo "Created role: $ROLE_ARN"
fi

echo "Attaching AWSLambdaBasicExecutionRole..."
aws iam attach-role-policy \
  --role-name "$ROLE_NAME" \
  --region "$AWS_REGION" \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole >/dev/null || true

echo "Putting inline DynamoDB policy for table ${USER_IDENTITY_TABLE}..."
aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --region "$AWS_REGION" \
  --policy-name user-identity-ddb \
  --policy-document "$POLICY_JSON" >/dev/null

echo "Done. Role ARN:"
echo "$ROLE_ARN"
