# Copyright (c) 2026, Noble and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _
from frappe.utils import flt


class BusinessSourceCategory(Document):
	def validate(self):
		if self.has_commission:
			if self.commission_type == "Percentage":
				if flt(self.commission_rate_) < 0 or flt(self.commission_rate_) > 100:
					frappe.throw(_("Commission rate must be between 0 and 100 for percentage type"))

	def calculate_commission(self, amount):
		if not self.has_commission:
			return 0

		amount = flt(amount)
		if self.commission_type == "Percentage":
			return amount * flt(self.commission_rate_) / 100
		elif self.commission_type == "Fixed Amount":
			return flt(self.commision_rate_amount)
		return 0
