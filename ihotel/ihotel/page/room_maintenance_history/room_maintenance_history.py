import frappe


@frappe.whitelist()
def get_room_history(room):
	"""Return all maintenance requests for a room, newest first."""
	requests = frappe.get_all(
		"Maintenance Request",
		filters={"room": room},
		fields=[
			"name", "status", "category", "priority", "maintenance_type",
			"reported_date", "assigned_to", "description", "resolution_notes",
			"linked_ooo", "scheduled_date", "recurrence", "next_due_date",
		],
		order_by="reported_date desc",
	)

	# Attach OOO dates if linked
	for r in requests:
		if r.linked_ooo:
			ooo = frappe.db.get_value(
				"Room Out of Order", r.linked_ooo,
				["from_date", "to_date", "status"],
				as_dict=True,
			)
			r["ooo_from"] = ooo.from_date if ooo else None
			r["ooo_to"] = ooo.to_date if ooo else None
		else:
			r["ooo_from"] = None
			r["ooo_to"] = None

	return requests


@frappe.whitelist()
def get_all_rooms():
	return frappe.get_all("Room", fields=["name", "room_number", "room_type", "floor"], order_by="room_number asc")
