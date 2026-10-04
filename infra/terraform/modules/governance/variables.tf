variable "name" {
  type = string
}
variable "enabled" {
  type    = bool
  default = false
}
variable "frontend_bucket_name" {
  type = string
}
variable "tags" {
  type    = map(string)
  default = {}
}
