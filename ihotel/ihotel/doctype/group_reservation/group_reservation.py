# Copyright (c) 2026, Noble and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _
from frappe.utils import getdate, date_diff, cint


class GroupReservation(Document):
	def validate(self):
		self.validate_dates()
		self.calculate_days()

	def validate_dates(self):
		if self.check_in_date and self.check_out_date:
			if getdate(self.check_in_date) >= getdate(self.check_out_date):
				frappe.throw(_("Check-in date must be before check-out date"))

	def calculate_days(self):
		if self.check_in_date and self.check_out_date:
			self.days = date_diff(self.check_out_date, self.check_in_date)


@frappe.whitelist()
def generate_reservations(group_reservation_name):
	group = frappe.get_doc("Group Reservation", group_reservation_name)

	if not group.no_of_rooms or cint(group.no_of_rooms) <= 0:
		frappe.throw(_("Please set the number of rooms"))

	# Check how many reservations already exist for this group
	existing = frappe.db.count("Reservation", {"group_reservation": group.name})
	remaining = cint(group.no_of_rooms) - existing

	if remaining <= 0:
		frappe.throw(_("All {0} reservations have already been generated").format(group.no_of_rooms))

	created = []
	for _i in range(remaining):
		reservation = frappe.get_doc({
			"doctype": "Reservation",
			"group_reservation": group.name,
			"check_in_date": group.check_in_date,
			"check_out_date": group.check_out_date,
			"check_in_time": group.check_in_time,
			"check_out_time": group.check_out_time,
			"room_type": group.room_type,
			"business_source_category": group.business_source_category,
			"full_name": group.full_name,
			"company": group.company,
			"email_address": group.email,
			"phone_number": group.phone_number,
			"city": group.city,
			"state": group.state,
			"country": group.country,
			"postal_code": group.zip_code,
			"status": "pending",
		})
		reservation.insert(ignore_permissions=True)
		created.append(reservation.name)

	frappe.msgprint(
		_("{0} reservations created successfully").format(len(created)),
		indicator="green",
		alert=True,
	)

	return created
