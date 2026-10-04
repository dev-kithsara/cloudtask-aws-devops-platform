variable "name" {
  type = string
}
variable "lambda_zip_path" {
  type = string
}
variable "log_retention_days" {
  type    = number
  default = 1
}
variable "tags" {
  type    = map(string)
  default = {}
}
