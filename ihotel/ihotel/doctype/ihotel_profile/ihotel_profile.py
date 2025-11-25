# Copyright (c) 2025, Noble and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document
from frappe.utils import flt


class iHotelProfile(Document):
	"""DocType logic for keeping the hotel profile financial summary in sync."""

	def validate(self):
		"""Ensure summary fields stay aligned with the child payment table."""
		self.update_financial_summary()

	def update_financial_summary(self):
		"""Aggregate payment rows into total charges, payments, and outstanding."""
		total_charges = 0.0
		total_payments = 0.0
		outstanding_balance = 0.0

		for row in self.get("payments", []):
			amount = flt(row.rate)
			total_charges += amount

			if (row.payment_status or "").strip().lower() == "paid":
				total_payments += amount
			else:
				outstanding_balance += amount

		self.total_amount = total_charges
		self.total_payments = total_payments
		self.outstanding_balance = outstanding_balance
