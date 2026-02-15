# Copyright (c) 2026, Noble and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import flt


def execute(filters=None):
	columns = get_columns()
	data = get_data(filters)
	return columns, data


def get_columns():
	return [
		{"label": "Profile", "fieldname": "name", "fieldtype": "Link", "options": "iHotel Profile", "width": 150},
		{"label": "Guest", "fieldname": "guest", "fieldtype": "Link", "options": "Guest", "width": 150},
		{"label": "Guest Name", "fieldname": "guest_name", "fieldtype": "Data", "width": 150},
		{"label": "Room", "fieldname": "room", "fieldtype": "Link", "options": "Room", "width": 100},
		{"label": "Total Charges", "fieldname": "total_amount", "fieldtype": "Currency", "width": 130},
		{"label": "Total Payments", "fieldname": "total_payments", "fieldtype": "Currency", "width": 130},
		{"label": "Outstanding", "fieldname": "outstanding_balance", "fieldtype": "Currency", "width": 130},
		{"label": "Status", "fieldname": "status", "fieldtype": "Data", "width": 100},
	]


def get_data(filters):
	conditions = ["ip.outstanding_balance > 0"]
	values = {}

	if filters.get("guest"):
		conditions.append("ip.guest = %(guest)s")
		values["guest"] = filters["guest"]
	if filters.get("min_amount"):
		conditions.append("ip.outstanding_balance >= %(min_amount)s")
		values["min_amount"] = flt(filters["min_amount"])

	where = " AND ".join(conditions)

	data = frappe.db.sql(f"""
		SELECT
			ip.name, ip.guest, ip.guest_name, ip.room,
			ip.total_amount, ip.total_payments,
			ip.outstanding_balance, ip.status
		FROM `tabiHotel Profile` ip
		WHERE {where}
		ORDER BY ip.outstanding_balance DESC
	""", values, as_dict=True)

	return data
