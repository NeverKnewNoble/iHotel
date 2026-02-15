# Copyright (c) 2025, Noble and contributors
# For license information, please see license.txt


import frappe
from frappe.model.document import Document
from frappe import _
from datetime import datetime, timedelta
from frappe.utils import get_datetime

class HotelStay(Document):
    """
    Hotel Stay document representing a guest reservation or stay.
    Manages check-in/check-out, room assignment, billing, and room status updates.
    """
    def validate(self):
        """
        Validate hotel stay information before saving.
        Ensures dates are valid, room is available, and totals are calculated.
        """
        self.validate_dates()
        self.validate_room_availability()
        self.validate_rate_type()
        self.calculate_total_amount()
        self.calculate_additional_services_amount()
        self.validate_additional_services()

    def validate_dates(self):
        """
        Validate that check-in date is before check-out date.
        """
        if self.expected_check_in and self.expected_check_out:
            check_in = get_datetime(self.expected_check_in)
            check_out = get_datetime(self.expected_check_out)
            if check_in >= check_out:
                frappe.throw(_("Check-in date must be before check-out date"))

    def validate_room_availability(self):
        """
        Validate that the room is available for the selected dates.
        Checks for overlapping reservations with proper status matching.
        """
        if self.room and self.status in ["Reserved", "Checked"]:
            # Check for overlapping reservations (exclude cancelled and checked out)
            overlapping_stays = frappe.db.sql("""
                SELECT name FROM `tabHotel Stay`
                WHERE room = %s
                AND status IN ('Reserved', 'Checked')
                AND docstatus != 2
                AND name != %s
                AND (
                    (expected_check_in <= %s AND expected_check_out > %s)
                    OR (expected_check_in < %s AND expected_check_out >= %s)
                    OR (expected_check_in >= %s AND expected_check_out <= %s)
                )
            """, (self.room, self.name or "", self.expected_check_in, self.expected_check_in,
                  self.expected_check_out, self.expected_check_out,
                  self.expected_check_in, self.expected_check_out), as_dict=True)

            if overlapping_stays:
                frappe.throw(_("Room is not available for the selected dates. "
                             "There is an overlapping reservation: {0}").format(
                             overlapping_stays[0].name))

    def validate_rate_type(self):
        if self.rate_type and self.nights:
            rate_type = frappe.get_cached_doc("Rate Type", self.rate_type)
            if rate_type.minimum_stay_nights and self.nights < rate_type.minimum_stay_nights:
                frappe.throw(
                    _("Minimum stay for rate type {0} is {1} nights").format(
                        self.rate_type, rate_type.minimum_stay_nights
                    )
                )
            if rate_type.maximum_stay_nights and self.nights > rate_type.maximum_stay_nights:
                frappe.throw(
                    _("Maximum stay for rate type {0} is {1} nights").format(
                        self.rate_type, rate_type.maximum_stay_nights
                    )
                )

    def calculate_total_amount(self):
        """
        Calculate total amount based on number of nights and room rate.
        Automatically calculates nights and total amount when dates or rate change.
        """
        if self.expected_check_in and self.expected_check_out and self.room_rate:
            check_in = get_datetime(self.expected_check_in)
            check_out = get_datetime(self.expected_check_out)
            nights = (check_out - check_in).days
            if nights > 0:
                self.total_amount = nights * (self.room_rate or 0)
                self.nights = nights
            else:
                self.total_amount = 0
                self.nights = 0

    def calculate_additional_services_amount(self):
        """
        Calculate amount for each service item in additional_services table.
        Amount = rate * quantity for each service.
        """
        if self.additional_services:
            for service in self.additional_services:
                if service.rate is not None and service.quantity is not None:
                    service.amount = (service.rate or 0) * (service.quantity or 0)
                else:
                    service.amount = 0

    def validate_additional_services(self):
        """
        Validate that no empty rows exist in the additional_services table.
        A row is considered empty if service_type is not provided.
        """
        if self.additional_services:
            for idx, service in enumerate(self.additional_services, start=1):
                if not service.service_type:
                    frappe.throw(_("Row {0} in Additional Services table is empty. Please fill in the Service Type or remove the row.").format(idx))

    def on_submit(self):
        """
        Update room status when hotel stay is submitted.
        """
        if self.status == "Reserved":
            self.mark_room_as_occupied()



    def on_update(self):
        """
        Keep associated room status in sync with the stay lifecycle.
        """
        self.sync_room_status()

    def on_update_after_submit(self):
        """
        Frappe calls this hook when a submitted stay is edited (e.g., check-in/out).
        """
        self.sync_room_status()




    def on_cancel(self):
        """
        Free up the room when hotel stay is cancelled.
        """
        if self.room:
            try:
                room = frappe.get_doc("Room", self.room)
                # Only update status if room is currently marked as Occupied
                if room.status == "Occupied":
                    # Check if there are other active stays for this room
                    active_stays = frappe.db.exists("Hotel Stay", {
                        "room": self.room,
                        "status": ["in", ["Reserved", "Checked"]],
                        "docstatus": 1,
                        "name": ["!=", self.name]
                    })
                    if not active_stays:
                        room.status = "Available"
                        room.save(ignore_permissions=True)
            except Exception as e:
                frappe.log_error(f"Error updating room status on cancel: {str(e)}")
                # Don't throw error to allow cancellation

    def mark_room_as_occupied(self):
        """
        Sync the linked room document so that its status mirrors an active stay.
        """
        if not self.room:
            return

        try:
            room = frappe.get_doc("Room", self.room)

            # Update only when the room is not already marked as occupied
            if room.status != "Occupied":
                room.status = "Occupied"
                room.save(ignore_permissions=True)
        except Exception as e:
            message = _("Error updating room status: {0}").format(str(e))
            frappe.log_error(message)
            frappe.throw(message)

    def mark_room_as_available(self):
        """
        Free the linked room when the stay completes and no other active stays remain.
        """
        if not self.room:
            return

        try:
            # Ensure there isn't another active stay keeping the room busy
            active_stay_exists = frappe.db.exists("Hotel Stay", {
                "room": self.room,
                "status": ["in", ["Reserved", "Checked"]],
                "docstatus": 1,
                "name": ["!=", self.name]
            })

            if not active_stay_exists:
                room = frappe.get_doc("Room", self.room)
                if room.status != "Available":
                    room.status = "Available"
                    room.save(ignore_permissions=True)
        except Exception as e:
            message = _("Error freeing room status: {0}").format(str(e))
            frappe.log_error(message)
            frappe.throw(message)

    def sync_room_status(self):
        """
        Central place to mirror stay status transitions to the linked room.
        """
        if self.status == "Checked":
            self.mark_room_as_occupied()
        elif self.status == "Checked Out":
            self.mark_room_as_available()
