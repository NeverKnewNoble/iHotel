# Copyright (c) 2025, Noble and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _


class MaintenanceRequest(Document):
	def validate(self):
		self.update_room_on_priority()

	def on_update(self):
		self.sync_room_status()

	def update_room_on_priority(self):
		if self.room and self.priority in ("Critical", "High") and self.status == "Open":
			room = frappe.get_doc("Room", self.room)
			if room.status not in ("Out of Order",):
				room.status = "Out of Order"
				room.save(ignore_permissions=True)

	def sync_room_status(self):
		if not self.room:
			return

		if self.status in ("Resolved", "Closed"):
			# Check if there are other open maintenance requests for this room
			other_open = frappe.db.exists("Maintenance Request", {
				"room": self.room,
				"status": ["not in", ["Resolved", "Closed"]],
				"name": ["!=", self.name],
			})
			if not other_open:
				# Check if room has an active stay
				active_stay = frappe.db.exists("Hotel Stay", {
					"room": self.room,
					"status": ["in", ["Reserved", "Checked In"]],
					"docstatus": 1,
				})
				room = frappe.get_doc("Room", self.room)
				if active_stay:
					if room.status != "Occupied":
						room.status = "Occupied"
						room.save(ignore_permissions=True)
				else:
					if room.status == "Out of Order":
						room.status = "Available"
						room.save(ignore_permissions=True)
