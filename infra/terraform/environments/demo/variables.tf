variable "aws_region" {
  description = "AWS region for the demo"
  type        = string
  default     = "us-east-1"
}
variable "owner" {
  description = "Owner tag value"
  type        = string
  validation {
    condition     = length(trimspace(var.owner)) > 0
    error_message = "owner must not be empty."
  }
}
variable "image_uri" {
  description = "Immutable ECR image URI including commit SHA tag"
  type        = string
}
variable "alert_email" {
  description = "Optional alarm email; requires subscription confirmation"
  type        = string
  default     = ""
}
variable "enable_governance" {
  description = "Enable temporary AWS Config evidence resources"
  type        = bool
  default     = false
}
variable "desired_count" {
  description = "Number of API tasks"
  type        = number
  default     = 1
  validation {
    condition     = var.desired_count >= 0 && var.desired_count <= 2
    error_message = "Demo desired_count must be between 0 and 2."
  }
}
variable "db_instance_class" {
  description = "Small ARM RDS class for the disposable demo"
  type        = string
  default     = "db.t3.micro"
}
