variable "name" {
  type = string
}
variable "vpc_id" {
  type = string
}
variable "database_subnet_ids" {
  type = list(string)
}
variable "ecs_security_group_id" {
  type = string
}
variable "instance_class" {
  type    = string
  default = "db.t3.micro"
}
variable "allocated_storage" {
  type    = number
  default = 20
}
variable "database_name" {
  type    = string
  default = "cloudtask"
}
variable "database_username" {
  type      = string
  default   = "cloudtaskadmin"
  sensitive = true
}
variable "tags" {
  type    = map(string)
  default = {}
}
