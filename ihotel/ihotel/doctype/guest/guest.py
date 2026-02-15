# Copyright (c) 2025, Noble and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _
from frappe.utils import validate_email_address


class Guest(Document):
	def validate(self):
		self.validate_contact_info()

	def validate_contact_info(self):
		if self.email:
			if not validate_email_address(self.email):
				frappe.throw(_("Please enter a valid email address"))

		if self.phone:
			phone = self.phone.strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
			if phone.startswith("+"):
				phone = phone[1:]
			if not phone.isdigit() or len(phone) < 7 or len(phone) > 15:
				frappe.throw(_("Please enter a valid phone number (7-15 digits)"))
