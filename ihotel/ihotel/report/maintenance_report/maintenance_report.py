import frappe
from frappe import _


def execute(filters=None):
	filters = filters or {}
	columns = get_columns()
	data = get_data(filters)
	return columns, data


def get_columns():
	return [
		{"label": _("Request"),       "fieldname": "name",             "fieldtype": "Link",     "options": "Maintenance Request", "width": 120},
		{"label": _("Room"),          "fieldname": "room",             "fieldtype": "Link",     "options": "Room",                "width": 80},
		{"label": _("Status"),        "fieldname": "status",           "fieldtype": "Data",     "width": 100},
		{"label": _("Priority"),      "fieldname": "priority",         "fieldtype": "Data",     "width": 80},
		{"label": _("Type"),          "fieldname": "maintenance_type", "fieldtype": "Data",     "width": 90},
		{"label": _("Category"),      "fieldname": "category",         "fieldtype": "Link",     "options": "Maintenance Category", "width": 130},
		{"label": _("Reported Date"), "fieldname": "reported_date",    "fieldtype": "Datetime", "width": 150},
		{"label": _("Assigned To"),   "fieldname": "assigned_to",      "fieldtype": "Link",     "options": "User",                "width": 130},
		{"label": _("Description"),   "fieldname": "description",      "fieldtype": "Data",     "width": 220},
		{"label": _("Linked OOO"),    "fieldname": "linked_ooo",       "fieldtype": "Link",     "options": "Room Out of Order",   "width": 110},
	]


def get_data(filters):
	conditions = {}

	if filters.get("status"):
		conditions["status"] = filters["status"]
	if filters.get("priority"):
		conditions["priority"] = filters["priority"]
	if filters.get("category"):
		conditions["category"] = filters["category"]
	if filters.get("maintenance_type"):
		conditions["maintenance_type"] = filters["maintenance_type"]
	if filters.get("room"):
		conditions["room"] = filters["room"]

	return frappe.get_all(
		"Maintenance Request",
		filters=conditions,
		fields=[
			"name", "room", "status", "priority", "maintenance_type",
			"category", "reported_date", "assigned_to", "description", "linked_ooo",
		],
		order_by="reported_date desc",
	)
