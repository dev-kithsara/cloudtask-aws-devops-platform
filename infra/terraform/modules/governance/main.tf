resource "aws_s3_bucket" "config" {
  count         = var.enabled ? 1 : 0
  bucket_prefix = "${var.name}-config-"
  force_destroy = true
  tags          = var.tags
}

resource "aws_s3_bucket_public_access_block" "config" {
  count                   = var.enabled ? 1 : 0
  bucket                  = aws_s3_bucket.config[0].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "config" {
  count  = var.enabled ? 1 : 0
  bucket = aws_s3_bucket.config[0].id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

data "aws_iam_policy_document" "config_assume" {
  count = var.enabled ? 1 : 0
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["config.amazonaws.com"]
    }

  }
}

resource "aws_iam_role" "config" {
  count              = var.enabled ? 1 : 0
  name_prefix        = "${var.name}-config-"
  assume_role_policy = data.aws_iam_policy_document.config_assume[0].json
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "config" {
  count      = var.enabled ? 1 : 0
  role       = aws_iam_role.config[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWS_ConfigRole"
}

data "aws_iam_policy_document" "config_bucket" {
  count = var.enabled ? 1 : 0
  statement {
    actions   = ["s3:GetBucketAcl", "s3:ListBucket"]
    resources = [aws_s3_bucket.config[0].arn]
    principals {
      type        = "Service"
      identifiers = ["config.amazonaws.com"]
    }

  }
  statement {
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.config[0].arn}/AWSLogs/*"]
    principals {
      type        = "Service"
      identifiers = ["config.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "s3:x-amz-acl"
      values   = ["bucket-owner-full-control"]
    }

  }
}

resource "aws_s3_bucket_policy" "config" {
  count  = var.enabled ? 1 : 0
  bucket = aws_s3_bucket.config[0].id
  policy = data.aws_iam_policy_document.config_bucket[0].json
}

resource "aws_config_configuration_recorder" "this" {
  count    = var.enabled ? 1 : 0
  name     = "${var.name}-recorder"
  role_arn = aws_iam_role.config[0].arn
  recording_group {
    all_supported                 = false
    include_global_resource_types = false
    resource_types                = ["AWS::S3::Bucket"]

  }
}

resource "aws_config_delivery_channel" "this" {
  count          = var.enabled ? 1 : 0
  name           = "${var.name}-channel"
  s3_bucket_name = aws_s3_bucket.config[0].id
  depends_on     = [aws_s3_bucket_policy.config]
}

resource "aws_config_configuration_recorder_status" "this" {
  count      = var.enabled ? 1 : 0
  name       = aws_config_configuration_recorder.this[0].name
  is_enabled = true
  depends_on = [aws_config_delivery_channel.this]
}

resource "aws_config_config_rule" "encryption" {
  count = var.enabled ? 1 : 0
  name  = "${var.name}-s3-encryption"
  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_SERVER_SIDE_ENCRYPTION_ENABLED"
  }
  scope {
    compliance_resource_id    = var.frontend_bucket_name
    compliance_resource_types = ["AWS::S3::Bucket"]
  }
  depends_on = [aws_config_configuration_recorder.this]
}

resource "aws_config_config_rule" "versioning" {
  count = var.enabled ? 1 : 0
  name  = "${var.name}-s3-versioning"
  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_VERSIONING_ENABLED"
  }
  scope {
    compliance_resource_id    = var.frontend_bucket_name
    compliance_resource_types = ["AWS::S3::Bucket"]
  }
  depends_on = [aws_config_configuration_recorder.this]
}
