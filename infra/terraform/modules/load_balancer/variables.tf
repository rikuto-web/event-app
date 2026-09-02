variable "compartment_id" {
  type = string
}

variable "display_name_prefix" {
  type = string
}

variable "subnet_id" {
  type = string
}

variable "backend_ip" {
  description = "Private IP of the fe-vm backend."
  type        = string
}

variable "backend_port" {
  description = "Backend port (nginx on fe-vm)."
  type        = number
  default     = 80
}

variable "listener_port" {
  description = "Public listener port. HTTPS (443) can be added at deploy time."
  type        = number
  default     = 80
}
