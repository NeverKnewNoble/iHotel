# Copyright (c) 2026, Noble and contributors
# For license information, please see license.txt

import frappe


def execute(filters=None):
	columns = get_columns()
	data = get_data(filters)
	return columns, data


def get_columns():
	return [
		{"label": "Task", "fieldname": "name", "fieldtype": "Link", "options": "Housekeeping Task", "width": 120},
		{"label": "Room", "fieldname": "room", "fieldtype": "Link", "options": "Room", "width": 100},
		{"label": "Task Type", "fieldname": "task_type", "fieldtype": "Data", "width": 150},
		{"label": "Status", "fieldname": "status", "fieldtype": "Data", "width": 100},
		{"label": "Assigned To", "fieldname": "assigned_to", "fieldtype": "Link", "options": "User", "width": 150},
		{"label": "Assigned Date", "fieldname": "assigned_date", "fieldtype": "Datetime", "width": 160},
		{"label": "Cleaned Date", "fieldname": "cleaned_date", "fieldtype": "Datetime", "width": 160},
	]


def get_data(filters):
	conditions = ["1=1"]
	values = {}

	if filters.get("status"):
		conditions.append("ht.status = %(status)s")
		values["status"] = filters["status"]
	if filters.get("assigned_to"):
		conditions.append("ht.assigned_to = %(assigned_to)s")
		values["assigned_to"] = filters["assigned_to"]
	if filters.get("from_date"):
		conditions.append("ht.assigned_date >= %(from_date)s")
		values["from_date"] = filters["from_date"]
	if filters.get("to_date"):
		conditions.append("ht.assigned_date <= %(to_date)s")
		values["to_date"] = filters["to_date"]

	where = " AND ".join(conditions)

	data = frappe.db.sql(f"""
		SELECT
			ht.name, ht.room, ht.task_type, ht.status,
			ht.assigned_to, ht.assigned_date, ht.cleaned_date
		FROM `tabHousekeeping Task` ht
		WHERE {where}
		ORDER BY ht.modified DESC
	""", values, as_dict=True)

	return data
