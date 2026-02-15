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
		{"label": "Room Type", "fieldname": "room_type", "fieldtype": "Link", "options": "Room Type", "width": 150},
		{"label": "Business Source", "fieldname": "business_source", "fieldtype": "Link", "options": "Business Source Category", "width": 180},
		{"label": "Total Stays", "fieldname": "total_stays", "fieldtype": "Int", "width": 100},
		{"label": "Total Nights", "fieldname": "total_nights", "fieldtype": "Int", "width": 100},
		{"label": "Total Revenue", "fieldname": "total_revenue", "fieldtype": "Currency", "width": 150},
		{"label": "Avg Rate/Night", "fieldname": "avg_rate", "fieldtype": "Currency", "width": 130},
	]


def get_data(filters):
	conditions = ["hs.docstatus = 1"]
	values = {}

	if filters.get("from_date"):
		conditions.append("hs.expected_check_in >= %(from_date)s")
		values["from_date"] = filters["from_date"]
	if filters.get("to_date"):
		conditions.append("hs.expected_check_in <= %(to_date)s")
		values["to_date"] = filters["to_date"]
	if filters.get("room_type"):
		conditions.append("hs.room_type = %(room_type)s")
		values["room_type"] = filters["room_type"]
	if filters.get("business_source"):
		conditions.append("hs.business_source = %(business_source)s")
		values["business_source"] = filters["business_source"]

	where = " AND ".join(conditions)

	data = frappe.db.sql(f"""
		SELECT
			hs.room_type,
			hs.business_source,
			COUNT(hs.name) as total_stays,
			SUM(hs.nights) as total_nights,
			SUM(hs.total_amount) as total_revenue,
			AVG(hs.room_rate) as avg_rate
		FROM `tabHotel Stay` hs
		WHERE {where}
		GROUP BY hs.room_type, hs.business_source
		ORDER BY total_revenue DESC
	""", values, as_dict=True)

	return data
