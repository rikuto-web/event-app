variable "compartment_id" {
  type = string
}

variable "bucket_name" {
  type = string
}

variable "namespace" {
  description = "Object Storage namespace for the tenancy."
  type        = string
}
