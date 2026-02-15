// Copyright (c) 2025, Noble and contributors
// For license information, please see license.txt

frappe.ui.form.on("iHotel Profile", {
	refresh(frm) {
		// Outstanding balance indicator
		if (frm.doc.outstanding_balance > 0) {
			frm.set_intro(
				__("Outstanding Balance: {0}", [
					frappe.format(frm.doc.outstanding_balance, { fieldtype: "Currency" })
				]),
				"red"
			);
		}

		if (frm.is_new()) return;

		// Mark All Paid button
		if (frm.doc.payments && frm.doc.payments.length > 0) {
			let has_pending = frm.doc.payments.some(
				(p) => p.payment_status === "Pending payment"
			);
			if (has_pending) {
				frm.add_custom_button(__("Mark All Paid"), function () {
					frm.doc.payments.forEach((row) => {
						if (row.payment_status === "Pending payment") {
							frappe.model.set_value(
								row.doctype,
								row.name,
								"payment_status",
								"Paid"
							);
						}
					});
					frm.dirty();
					frm.save();
				});
			}
		}

		// Settle button
		if (
			frm.doc.status === "Open" &&
			frm.doc.outstanding_balance !== undefined &&
			frm.doc.outstanding_balance <= 0
		) {
			frm.add_custom_button(__("Settle"), function () {
				frm.set_value("status", "Settled");
				frm.save();
			});
		}
	},
});
