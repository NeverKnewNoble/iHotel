# Copyright (c) 2026, Noble and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import nowdate


def execute(filters=None):
	columns = get_columns()
	data = get_data(filters)
	return columns, data


def get_columns():
	return [
		{"label": "Type", "fieldname": "type", "fieldtype": "Data", "width": 100},
		{"label": "Stay", "fieldname": "stay", "fieldtype": "Link", "options": "Hotel Stay", "width": 120},
		{"label": "Guest", "fieldname": "guest", "fieldtype": "Link", "options": "Guest", "width": 150},
		{"label": "Room", "fieldname": "room", "fieldtype": "Link", "options": "Room", "width": 100},
		{"label": "Room Type", "fieldname": "room_type", "fieldtype": "Link", "options": "Room Type", "width": 120},
		{"label": "Expected Time", "fieldname": "expected_time", "fieldtype": "Datetime", "width": 160},
		{"label": "Status", "fieldname": "status", "fieldtype": "Data", "width": 100},
	]


def get_data(filters):
	date = filters.get("date") or nowdate()

	# Arrivals
	arrivals = frappe.db.sql("""
		SELECT
			'Arrival' as type,
			name as stay,
			guest,
			room,
			room_type,
			expected_check_in as expected_time,
			status
		FROM `tabHotel Stay`
		WHERE DATE(expected_check_in) = %s
		AND docstatus != 2
		ORDER BY expected_check_in
	""", date, as_dict=True)

	# Departures
	departures = frappe.db.sql("""
		SELECT
			'Departure' as type,
			name as stay,
			guest,
			room,
			room_type,
			expected_check_out as expected_time,
			status
		FROM `tabHotel Stay`
		WHERE DATE(expected_check_out) = %s
		AND docstatus != 2
		ORDER BY expected_check_out
	""", date, as_dict=True)

	return arrivals + departures
