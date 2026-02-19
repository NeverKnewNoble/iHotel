import frappe


@frappe.whitelist()
def get_room_board_data():
	"""Return all rooms with current status, guest info, and stay info."""
	rooms = frappe.get_all(
		"Room",
		fields=["name", "room_number", "room_type", "floor", "status"],
		order_by="room_number asc",
	)

	for room in rooms:
		room["guest"] = None
		room["stay"] = None
		room["check_out"] = None

		if room["status"] == "Occupied":
			stay = frappe.db.get_value(
				"Check In",
				filters={
					"room": room["name"],
					"status": ["in", ["Reserved", "Checked In"]],
					"docstatus": 1,
				},
				fieldname=["name", "guest", "expected_check_out"],
				as_dict=True,
			)
			if stay:
				room["stay"] = stay.name
				room["guest"] = stay.guest
				room["check_out"] = stay.expected_check_out

	return rooms
