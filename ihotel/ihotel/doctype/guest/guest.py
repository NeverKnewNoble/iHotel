# Copyright (c) 2025, Noble and contributors
# For license information, please see license.txt

# import frappe
# from frappe.model.document import Document


# class Guest(Document):
# 	pass



import frappe
from frappe.model.document import Document
from frappe import _

class Guest(Document):
    """
    Guest document representing a hotel guest.
    Handles guest information validation and management.
    """
    def validate(self):
        """
        Validate guest information before saving.
        """
        self.validate_contact_info()

    def validate_contact_info(self):
        """
        Validate email format if email is provided.
        """
        if self.email:
            import re
            # Basic email validation regex
            email_pattern = r'^[^@]+@[^@]+\.[^@]+$'
            if not re.match(email_pattern, self.email):
                frappe.throw(_("Please enter a valid email address"))
