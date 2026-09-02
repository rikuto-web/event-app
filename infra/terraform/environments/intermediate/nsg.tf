resource "oci_core_network_security_group" "fe" {
  compartment_id = local.compartment_id
  vcn_id         = module.vcn.vcn_id
  display_name   = "${var.project_prefix}-fe-nsg"
}

resource "oci_core_network_security_group_security_rule" "fe_http" {
  network_security_group_id = oci_core_network_security_group.fe.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = "0.0.0.0/0"
  source_type               = "CIDR_BLOCK"

  tcp_options {
    destination_port_range {
      min = 80
      max = 80
    }
  }
}

resource "oci_core_network_security_group_security_rule" "fe_ssh" {
  network_security_group_id = oci_core_network_security_group.fe.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = var.admin_cidr
  source_type               = "CIDR_BLOCK"

  tcp_options {
    destination_port_range {
      min = 22
      max = 22
    }
  }
}

resource "oci_core_network_security_group_security_rule" "fe_egress_all" {
  network_security_group_id = oci_core_network_security_group.fe.id
  direction                 = "EGRESS"
  protocol                  = "all"
  destination               = "0.0.0.0/0"
  destination_type          = "CIDR_BLOCK"
}

resource "oci_core_network_security_group" "api" {
  compartment_id = local.compartment_id
  vcn_id         = module.vcn.vcn_id
  display_name   = "${var.project_prefix}-api-nsg"
}

resource "oci_core_network_security_group_security_rule" "api_from_fe" {
  network_security_group_id = oci_core_network_security_group.api.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = "${module.fe_vm.private_ip}/32"
  source_type               = "CIDR_BLOCK"

  tcp_options {
    destination_port_range {
      min = 8080
      max = 8080
    }
  }
}

resource "oci_core_network_security_group_security_rule" "api_ssh" {
  network_security_group_id = oci_core_network_security_group.api.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = var.admin_cidr
  source_type               = "CIDR_BLOCK"

  tcp_options {
    destination_port_range {
      min = 22
      max = 22
    }
  }
}

resource "oci_core_network_security_group_security_rule" "api_egress_all" {
  network_security_group_id = oci_core_network_security_group.api.id
  direction                 = "EGRESS"
  protocol                  = "all"
  destination               = "0.0.0.0/0"
  destination_type          = "CIDR_BLOCK"
}
