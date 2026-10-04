output "topic_arn" {
  value = aws_sns_topic.events.arn
}
output "audit_queue_url" {
  value = aws_sqs_queue.audit.url
}
output "dlq_url" {
  value = aws_sqs_queue.dlq.url
}
