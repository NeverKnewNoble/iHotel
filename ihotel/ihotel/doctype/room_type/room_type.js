// Copyright (c) 2025, Noble and contributors
// For license information, please see license.txt

frappe.ui.form.on("Room Type", {
	refresh(frm) {
		// Calculate totals for all amenities on form load
		if (frm.doc.amenities) {
			frm.doc.amenities.forEach(row => {
				calculate_amenity_total(frm, row);
			});
		}
	}
});

// Calculate total when rate or quantity changes in amenities table
frappe.ui.form.on("Room Amenity", {
	rate(frm, cdt, cdn) {
		calculate_amenity_total(frm, locals[cdt][cdn]);
	},

	quantity(frm, cdt, cdn) {
		calculate_amenity_total(frm, locals[cdt][cdn]);
	},

	amenities_remove(frm) {
		// Recalculate if needed when row is removed
	}
});

function calculate_amenity_total(frm, row) {
	// Calculate total: rate × quantity
	const rate = row.rate || 0;
	const quantity = row.quantity || 0;
	row.total = rate * quantity;

	// Refresh the form to show updated total
	frm.refresh_field("amenities");
}
