variable "name" {
  type = string
}
variable "vpc_id" {
  type = string
}
variable "public_subnet_ids" {
  type = list(string)
}
variable "ecs_security_group_id" {
  type = string
}
variable "image_uri" {
  type = string
}
variable "database_url_parameter_arn" {
  type = string
}
variable "sns_topic_arn" {
  type = string
}
variable "jwt_secret_parameter_arn" { type = string }
variable "cors_origin" {
  type = string
}
variable "desired_count" {
  type    = number
  default = 1
}
variable "cpu" {
  type    = number
  default = 256
}
variable "memory" {
  type    = number
  default = 512
}
variable "log_retention_days" {
  type    = number
  default = 1
}
variable "tags" {
  type    = map(string)
  default = {}
}
