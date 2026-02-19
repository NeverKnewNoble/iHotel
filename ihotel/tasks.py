# Copyright (c) 2025, Noble and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import nowdate, now_datetime, add_days, get_datetime


def auto_no_show():
	"""Mark Hotel Stay as No Show if Reserved and check-in was > 24h ago."""
	cutoff = add_days(now_datetime(), -1)
	stays = frappe.get_all(
		"Check In",
		filters={
			"status": "Reserved",
			"docstatus": 1,
			"expected_check_in": ["<", cutoff],
		},
		pluck="name",
	)
	for stay_name in stays:
		try:
			stay = frappe.get_doc("Check In", stay_name)
			stay.status = "No Show"
			stay.save(ignore_permissions=True)
			frappe.db.commit()
		except Exception:
			frappe.log_error(f"Error marking {stay_name} as No Show")
			frappe.db.rollback()


def late_checkout_alert():
	"""Create Notification Log for stays past expected check-out."""
	now = now_datetime()
	stays = frappe.get_all(
		"Check In",
		filters={
			"status": "Checked In",
			"docstatus": 1,
			"expected_check_out": ["<", now],
		},
		fields=["name", "guest", "room", "expected_check_out"],
	)
	for stay in stays:
		# Avoid duplicate notifications
		existing = frappe.db.exists("Notification Log", {
			"document_type": "Check In",
			"document_name": stay.name,
			"subject": ["like", "%late checkout%"],
		})
		if not existing:
			frappe.get_doc({
				"doctype": "Notification Log",
				"for_user": "Administrator",
				"type": "Alert",
				"document_type": "Check In",
				"document_name": stay.name,
				"subject": f"Late checkout: {stay.guest or ''} in room {stay.room or ''} "
				           f"(expected {stay.expected_check_out})",
			}).insert(ignore_permissions=True)
	frappe.db.commit()


def auto_generate_housekeeping():
	"""Create daily housekeeping tasks for occupied rooms."""
	today = nowdate()
	occupied_rooms = frappe.get_all(
		"Room",
		filters={"status": "Occupied"},
		pluck="name",
	)
	for room_name in occupied_rooms:
		# Check if a task already exists for today
		existing = frappe.db.exists("Housekeeping Task", {
			"room": room_name,
			"assigned_date": ["between", [f"{today} 00:00:00", f"{today} 23:59:59"]],
		})
		if not existing:
			try:
				frappe.get_doc({
					"doctype": "Housekeeping Task",
					"room": room_name,
					"task_type": "Stay Over Cleaning",
					"status": "Pending",
				}).insert(ignore_permissions=True)
			except Exception:
				frappe.log_error(f"Error creating housekeeping task for room {room_name}")
	frappe.db.commit()


def night_audit_reminder():
	"""Remind System Managers if no Night Audit exists for today by 11 PM."""
	today = nowdate()
	audit_exists = frappe.db.exists("Night Audit", {"audit_date": today})
	if not audit_exists:
		managers = frappe.get_all(
			"Has Role",
			filters={"role": "System Manager", "parenttype": "User"},
			pluck="parent",
		)
		for user in set(managers):
			if not frappe.db.exists("User", {"name": user, "enabled": 1}):
				continue
			frappe.get_doc({
				"doctype": "Notification Log",
				"for_user": user,
				"type": "Alert",
				"subject": f"Night Audit Reminder: No audit has been performed for {today}",
			}).insert(ignore_permissions=True)
		frappe.db.commit()
