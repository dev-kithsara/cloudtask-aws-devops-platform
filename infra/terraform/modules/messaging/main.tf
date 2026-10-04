resource "aws_sns_topic" "events" {
  name = "${var.name}-task-events"
  tags = var.tags
}
resource "aws_sqs_queue" "dlq" {
  name                      = "${var.name}-audit-dlq"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true
  tags                      = var.tags
}
resource "aws_sqs_queue" "audit" {
  name                       = "${var.name}-audit"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 345600
  sqs_managed_sse_enabled    = true
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn, maxReceiveCount = 3
  })
  tags = var.tags
}
data "aws_iam_policy_document" "audit_queue" {
  statement {
    sid       = "OnlyProjectSnsCanSend"
    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.audit.arn]
    principals {
      type        = "Service"
      identifiers = ["sns.amazonaws.com"]
    }
    condition {
      test     = "ArnEquals"
      variable = "aws:SourceArn"
      values   = [aws_sns_topic.events.arn]
    }
  }
}
resource "aws_sqs_queue_policy" "audit" {
  queue_url = aws_sqs_queue.audit.id
  policy    = data.aws_iam_policy_document.audit_queue.json
}
resource "aws_sns_topic_subscription" "audit" {
  topic_arn            = aws_sns_topic.events.arn
  protocol             = "sqs"
  endpoint             = aws_sqs_queue.audit.arn
  raw_message_delivery = false
}

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}
resource "aws_iam_role" "lambda" {
  name_prefix        = "${var.name}-audit-"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
  tags               = var.tags
}
resource "aws_iam_role_policy_attachment" "lambda_sqs" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaSQSQueueExecutionRole"
}
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.name}-audit-consumer"
  retention_in_days = var.log_retention_days
  tags              = var.tags
}
resource "aws_lambda_function" "audit" {
  function_name    = "${var.name}-audit-consumer"
  role             = aws_iam_role.lambda.arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  filename         = var.lambda_zip_path
  source_code_hash = try(filebase64sha256(var.lambda_zip_path), "lambda-not-built-during-static-validation")
  timeout          = 15
  memory_size      = 128
  tags             = var.tags
  depends_on       = [aws_cloudwatch_log_group.lambda]
}
resource "aws_lambda_event_source_mapping" "audit" {
  event_source_arn        = aws_sqs_queue.audit.arn
  function_name           = aws_lambda_function.audit.arn
  batch_size              = 10
  function_response_types = ["ReportBatchItemFailures"]
}
