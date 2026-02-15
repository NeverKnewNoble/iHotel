# Copyright (c) 2025, Noble and contributors
# For license information, please see license.txt

import frappe
from frappe import _


def on_hotel_stay_update(doc, method):
	"""Send email on checkout."""
	if doc.status == "Checked Out" and doc.guest:
		guest = frappe.get_cached_doc("Guest", doc.guest)
		if guest.email:
			try:
				frappe.sendmail(
					recipients=[guest.email],
					subject=_("Check-out Receipt - {0}").format(doc.name),
					message=_("Dear {0},<br><br>"
					          "Thank you for staying with us.<br><br>"
					          "<b>Room:</b> {1}<br>"
					          "<b>Check-in:</b> {2}<br>"
					          "<b>Check-out:</b> {3}<br>"
					          "<b>Total Amount:</b> {4}<br><br>"
					          "We hope to see you again soon!").format(
						guest.guest_name,
						doc.room or "",
						doc.actual_check_in or doc.expected_check_in or "",
						doc.actual_check_out or doc.expected_check_out or "",
						frappe.format_value(doc.total_amount, {"fieldtype": "Currency"}),
					),
					reference_doctype="Hotel Stay",
					reference_name=doc.name,
				)
			except Exception:
				frappe.log_error(f"Error sending checkout email for {doc.name}")


def on_reservation_update(doc, method):
	"""Send booking confirmation when reservation is confirmed."""
	if doc.status == "confirmed" and doc.email_address:
		try:
			frappe.sendmail(
				recipients=[doc.email_address],
				subject=_("Booking Confirmation - {0}").format(doc.name),
				message=_("Dear {0},<br><br>"
				          "Your reservation has been confirmed.<br><br>"
				          "<b>Reservation:</b> {1}<br>"
				          "<b>Check-in:</b> {2}<br>"
				          "<b>Check-out:</b> {3}<br>"
				          "<b>Room Type:</b> {4}<br><br>"
				          "We look forward to welcoming you!").format(
					doc.full_name or "Guest",
					doc.name,
					doc.check_in_date or "",
					doc.check_out_date or "",
					doc.room_type or "",
				),
				reference_doctype="Reservation",
				reference_name=doc.name,
			)
		except Exception:
			frappe.log_error(f"Error sending confirmation email for {doc.name}")
