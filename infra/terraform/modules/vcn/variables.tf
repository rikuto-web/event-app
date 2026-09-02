variable "compartment_id" {
  description = "OCID of the compartment where the VCN is created."
  type        = string
}

variable "display_name_prefix" {
  description = "Prefix for VCN-related resource display names."
  type        = string
}

variable "vcn_cidr" {
  description = "CIDR block for the VCN."
  type        = string
  default     = "10.1.0.0/16"
}

variable "subnet_cidr" {
  description = "CIDR block for the public subnet."
  type        = string
  default     = "10.1.0.0/24"
}

variable "dns_label" {
  description = "DNS label for the VCN (alphanumeric, starts with letter)."
  type        = string
}
