# Copyright (c) 2025, Noble and contributors
# For license information, please see license.txt

# import frappe
# from frappe.model.document import Document


import frappe
from frappe.model.document import Document
from frappe import _
from datetime import datetime, date

class NightAudit(Document):
    def validate(self):
        """
        Validate night audit before submission.
        """
        self.validate_audit_date()
        self.calculate_audit_metrics()

    def calculate_audit_metrics(self):
        """
        Calculate night audit metrics automatically:
        - Total rooms from iHotel Settings
        - Occupied rooms from checked-in stays
        - Occupancy rate (occupied / total * 100)
        - Total revenue from checked-in stays
        """
        # Get total rooms from iHotel Settings
        try:
            settings = frappe.get_single("iHotel Settings")
            self.total_rooms = settings.total_rooms or 0
        except Exception:
            frappe.throw(_("Please configure Total Rooms in iHotel Settings"))

        # Get occupied rooms - count of checked-in stays
        # Status "Checked" means the guest has checked in
        occupied_stays = frappe.get_all("Hotel Stay",
            filters={
                "status": "Checked",
                "docstatus": 1
            },
            fields=["name", "total_amount"])

        self.occupied_rooms = len(occupied_stays)

        # Calculate occupancy rate
        if self.total_rooms and self.total_rooms > 0:
            self.occupancy_rate = (self.occupied_rooms / self.total_rooms) * 100
        else:
            self.occupancy_rate = 0

        # Calculate total revenue from checked-in stays
        self.total_revenue = sum(stay.total_amount or 0 for stay in occupied_stays)

    def validate_audit_date(self):
        """
        Ensure only one night audit per day.
        """
        existing_audit = frappe.db.exists("Night Audit", {
            "audit_date": self.audit_date,
            "name": ["!=", self.name]
        })
        if existing_audit:
            frappe.throw(_("Night audit already exists for this date"))

    def on_submit(self):
        """
        Run night audit process when document is submitted.
        """
        self.run_night_audit()

    def run_night_audit(self):
        """
        Post room charges for all occupied rooms.
        Only processes checked-in stays that are submitted.
        """
        occupied_stays = frappe.get_all("Hotel Stay", {
            "status": "Checked",  # Match the status in JSON
            "docstatus": 1
        }, fields=["name"])

        for stay in occupied_stays:
            stay_doc = frappe.get_doc("Hotel Stay", stay.name)
            self.create_journal_entry(stay_doc)

    def create_journal_entry(self, stay_doc):
        """
        Create journal entry for room revenue.
        Accounts are fetched from iHotel Settings if available, otherwise uses defaults.
        Note: Add 'accounts_receivable_account' and 'room_revenue_account' fields to
        iHotel Settings for customization.
        """
        # Get accounts from iHotel Settings if fields exist, otherwise use defaults
        ar_account = "Accounts Receivable"
        revenue_account = "Room Revenue"

        try:
            settings = frappe.get_single("iHotel Settings")
            if hasattr(settings, "accounts_receivable_account") and settings.accounts_receivable_account:
                ar_account = settings.accounts_receivable_account
            if hasattr(settings, "room_revenue_account") and settings.room_revenue_account:
                revenue_account = settings.room_revenue_account
        except Exception:
            # Settings might not have these fields yet, use defaults
            pass

        company = frappe.defaults.get_user_default("company")
        if not company:
            frappe.throw(_("Please set default company in user preferences"))

        # Create journal entry for room revenue
        journal_entry = frappe.new_doc("Journal Entry")
        journal_entry.voucher_type = "Journal Entry"
        journal_entry.posting_date = self.audit_date
        journal_entry.company = company
        journal_entry.remark = f"Night audit entry for Hotel Stay: {stay_doc.name}"

        # Room revenue debit (AR account)
        journal_entry.append("accounts", {
            "account": ar_account,
            "debit_in_account_currency": stay_doc.room_rate or 0,
            "credit_in_account_currency": 0,
            "party_type": "Customer",
            "party": stay_doc.guest
        })

        # Room revenue credit (Revenue account)
        journal_entry.append("accounts", {
            "account": revenue_account,
            "debit_in_account_currency": 0,
            "credit_in_account_currency": stay_doc.room_rate or 0
        })

        try:
            journal_entry.insert()
            journal_entry.submit()
        except Exception as e:
            frappe.log_error(f"Error creating journal entry for Hotel Stay {stay_doc.name}: {str(e)}")
            frappe.throw(_("Error creating journal entry: {0}").format(str(e)))

    @frappe.whitelist()
    def calculate_metrics(self):
        """
        Server method to calculate audit metrics.
        Can be called from client-side to refresh values.
        """
        self.calculate_audit_metrics()
        return {
            "total_rooms": self.total_rooms,
            "occupied_rooms": self.occupied_rooms,
            "occupancy_rate": self.occupancy_rate,
            "total_revenue": self.total_revenue
        }
