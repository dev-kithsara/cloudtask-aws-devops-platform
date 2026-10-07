data "aws_caller_identity" "current" {}
locals {
  name = "cloudtask-demo"
  tags = {
    Project = "CloudTask", Environment = "demo", ManagedBy = "Terraform", Owner = var.owner
  }
  oidc_provider_arn = var.create_github_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : var.existing_github_oidc_provider_arn
}

resource "aws_s3_bucket" "state" {
  bucket_prefix = "cloudtask-tfstate-${data.aws_caller_identity.current.account_id}-"
  force_destroy = false
  tags          = local.tags
}
resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id
  versioning_configuration {
    status = "Enabled"
  }
}
resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_ecr_repository" "api" {
  count                = var.create_ecr_repository ? 1 : 0
  name                 = "cloudtask-api"
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration {
    scan_on_push = true
  }
  encryption_configuration {
    encryption_type = "AES256"
  }
  tags = local.tags
}
resource "aws_ecr_lifecycle_policy" "api" {
  count      = var.create_ecr_repository ? 1 : 0
  repository = aws_ecr_repository.api[0].name
  policy = jsonencode({
    rules = [{
      rulePriority = 1, description = "Delete untagged images after one day", selection = {
        tagStatus = "untagged", countType = "sinceImagePushed", countUnit = "days", countNumber = 1
        }, action = {
        type = "expire"
      }
      }, {
      rulePriority = 2, description = "Keep ten tagged images", selection = {
        tagStatus = "any", countType = "imageCountMoreThan", countNumber = 10
        }, action = {
        type = "expire"
      }
    }]
  })
}

resource "aws_iam_openid_connect_provider" "github" {
  count           = var.create_github_oidc_provider ? 1 : 0
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
  tags            = local.tags
}

data "aws_iam_policy_document" "github_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = [
        "repo:${var.github_repository}:ref:refs/heads/main",
        "repo:${var.github_repository}:environment:demo",
        "repo:${split("/", var.github_repository)[0]}*/${split("/", var.github_repository)[1]}*:ref:refs/heads/main",
        "repo:${split("/", var.github_repository)[0]}*/${split("/", var.github_repository)[1]}*:environment:demo",
      ]
    }

  }
}

resource "aws_iam_role" "github" {
  name               = "cloudtask-github-deployer"
  assume_role_policy = data.aws_iam_policy_document.github_trust.json
  tags               = local.tags
}

data "aws_iam_policy_document" "github_deploy" {
  statement {
    sid       = "TerraformState"
    actions   = ["s3:ListBucket", "s3:GetBucketVersioning"]
    resources = [aws_s3_bucket.state.arn]

  }
  statement {
    sid       = "TerraformStateObjects"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.state.arn}/cloudtask/demo/*"]

  }
  statement {
    sid       = "EcrPush"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]

  }
  statement {
    sid       = "EcrRepository"
    actions   = ["ecr:BatchCheckLayerAvailability", "ecr:GetDownloadUrlForLayer", "ecr:BatchGetImage", "ecr:PutImage", "ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload"]
    resources = [var.create_ecr_repository ? aws_ecr_repository.api[0].arn : "arn:aws:ecr:${var.aws_region}:${data.aws_caller_identity.current.account_id}:repository/cloudtask-api"]

  }
  statement {
    sid = "CloudTaskInfrastructure"
    actions = [
      "ec2:Describe*", "ec2:CreateVpc", "ec2:DeleteVpc", "ec2:CreateSubnet", "ec2:DeleteSubnet", "ec2:ModifySubnetAttribute", "ec2:CreateInternetGateway", "ec2:DeleteInternetGateway", "ec2:AttachInternetGateway", "ec2:DetachInternetGateway", "ec2:CreateRouteTable", "ec2:DeleteRouteTable", "ec2:AssociateRouteTable", "ec2:DisassociateRouteTable", "ec2:CreateRoute", "ec2:DeleteRoute", "ec2:CreateSecurityGroup", "ec2:DeleteSecurityGroup", "ec2:AuthorizeSecurityGroupIngress", "ec2:AuthorizeSecurityGroupEgress", "ec2:RevokeSecurityGroupIngress", "ec2:RevokeSecurityGroupEgress", "ec2:CreateTags", "ec2:DeleteTags",
      "elasticloadbalancing:*", "ecs:*", "rds:*", "lambda:*", "sqs:*", "sns:*", "logs:*", "cloudwatch:*", "ssm:GetParameter", "ssm:GetParameters", "ssm:PutParameter", "ssm:DeleteParameter", "cloudfront:*", "config:*", "s3:*", "iam:GetRole", "iam:CreateRole", "iam:DeleteRole", "iam:TagRole", "iam:UntagRole", "iam:PassRole", "iam:PutRolePolicy", "iam:GetRolePolicy", "iam:DeleteRolePolicy", "iam:AttachRolePolicy", "iam:DetachRolePolicy", "iam:ListAttachedRolePolicies", "iam:ListRolePolicies", "iam:ListInstanceProfilesForRole"
    ]
    resources = ["*"]

  }
}
resource "aws_iam_role_policy" "github" {
  name   = "cloudtask-demo-deployment"
  role   = aws_iam_role.github.id
  policy = data.aws_iam_policy_document.github_deploy.json
}

resource "aws_budgets_budget" "demo" {
  count        = var.budget_notification_email == "" ? 0 : 1
  name         = "cloudtask-demo-5-usd"
  budget_type  = "COST"
  limit_amount = "5"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"
  dynamic "notification" {
    for_each = [20, 60, 90]
    content {
      comparison_operator        = "GREATER_THAN"
      threshold                  = notification.value
      threshold_type             = "PERCENTAGE"
      notification_type          = "ACTUAL"
      subscriber_email_addresses = [var.budget_notification_email]

    }

  }
}
