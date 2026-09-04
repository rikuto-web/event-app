variable "tenancy_ocid" {
  type = string
}

variable "user_ocid" {
  type = string
}

variable "fingerprint" {
  type = string
}

variable "private_key_path" {
  type = string
}

variable "home_region" {
  type    = string
  default = "ap-osaka-1"
}

variable "region" {
  type = string
}

variable "compartment_ocid" {
  type    = string
  default = ""
}

variable "project_prefix" {
  type    = string
  default = "event"
}

variable "vcn_cidr" {
  type    = string
  default = "10.1.0.0/16"
}

variable "subnet_cidr" {
  type    = string
  default = "10.1.0.0/24"
}

variable "dns_label" {
  type    = string
  default = "eventint"
}

variable "admin_cidr" {
  type = string
}

variable "ssh_public_key" {
  type = string
}

variable "availability_domain" {
  type    = string
  default = ""
}

variable "compute_shape" {
  type    = string
  default = "VM.Standard.A1.Flex"
}

variable "fe_ocpus" {
  type    = number
  default = 1
}

variable "fe_memory_in_gbs" {
  type    = number
  default = 3
}

variable "api_ocpus" {
  type    = number
  default = 1
}

variable "api_memory_in_gbs" {
  type    = number
  default = 3
}

variable "images_bucket_name" {
  type    = string
  default = "event-app-images-prod"
}

variable "enable_fe_vm" {
  description = "Create fe-vm and attach it to the load balancer. false = api-vm only (phase 1)."
  type        = bool
  default     = false
}
