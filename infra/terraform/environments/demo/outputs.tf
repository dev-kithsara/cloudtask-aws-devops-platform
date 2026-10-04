output "api_url" {
  value = module.ecs_alb.alb_url
}
output "frontend_url" {
  value = "https://${module.frontend.distribution_domain}"
}
output "frontend_bucket_name" {
  value = module.frontend.bucket_name
}
output "cloudfront_distribution_id" {
  value = module.frontend.distribution_id
}
output "audit_queue_url" {
  value = module.messaging.audit_queue_url
}
output "audit_dlq_url" {
  value = module.messaging.dlq_url
}
