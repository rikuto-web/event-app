variable "compartment_id" {
  type = string
}

variable "display_name_prefix" {
  type = string
}

variable "subnet_id" {
  type = string
}

variable "create_backend" {
  description = "Attach app-vm to the backend set."
  type        = bool
  default     = true
}

variable "backend_ip" {
  description = "Private IP of the app-vm backend."
  type        = string
  default     = ""
}

variable "backend_port" {
  description = "Backend port (nginx on app-vm)."
  type        = number
  default     = 80
}

variable "listener_port" {
  description = "Public listener port. HTTPS (443) can be added at deploy time."
  type        = number
  default     = 80
}
