# Copyright (c) 2025, Noble and contributors
# For license information, please see license.txt

# import frappe
# from frappe.model.document import Document


# class RoomType(Document):
# 	pass


import frappe
from frappe.model.document import Document
from frappe import _

class RoomType(Document):
    """
    Room Type document defining different types of hotel rooms.
    Manages room type properties, rates, and amenities.
    """
    def validate(self):
        """
        Validate room type information before saving.
        """
        self.validate_rates()
        self.validate_amenities()

    def validate_rates(self):
        """
        Ensure rack rate is positive.
        Rack rate is the standard room rate for this room type.
        """
        if self.rack_rate and self.rack_rate <= 0:
            frappe.throw(_("Rack Rate must be greater than 0"))

    def validate_amenities(self):
        """
        Validate that no empty rows exist in the amenities table.
        A row is considered empty if amenity_name is not provided.
        Also calculate total for each amenity (rate × quantity).
        """
        if self.amenities:
            for idx, amenity in enumerate(self.amenities, start=1):
                if not amenity.amenity_name:
                    frappe.throw(_("Row {0} in Amenities table is empty. Please fill in the Amenity Name or remove the row.").format(idx))
                
                # Calculate total: rate × quantity
                rate = amenity.rate or 0
                quantity = amenity.quantity or 0
                amenity.total = rate * quantity
