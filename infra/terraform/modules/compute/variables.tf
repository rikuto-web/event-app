variable "compartment_id" {
  description = "OCID of the compartment where the instance is created."
  type        = string
}

variable "availability_domain" {
  description = "Availability domain for the instance."
  type        = string
}

variable "subnet_id" {
  description = "Subnet OCID where the instance is placed."
  type        = string
}

variable "display_name" {
  description = "Display name of the compute instance."
  type        = string
}

variable "shape" {
  description = "Compute shape (e.g. VM.Standard.A1.Flex)."
  type        = string
  default     = "VM.Standard.A1.Flex"
}

variable "ocpus" {
  description = "Number of OCPUs for flexible shapes."
  type        = number
  default     = 1
}

variable "memory_in_gbs" {
  description = "Memory in GB for flexible shapes."
  type        = number
  default     = 3
}

variable "image_id" {
  description = "Boot volume image OCID."
  type        = string
}

variable "ssh_public_key" {
  description = "SSH public key injected via instance metadata."
  type        = string
}

variable "nsg_ids" {
  description = "Network Security Group OCIDs attached to the primary VNIC."
  type        = list(string)
  default     = []
}

variable "assign_public_ip" {
  description = "Whether to assign a public IP to the primary VNIC."
  type        = bool
  default     = true
}
