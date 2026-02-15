// Copyright (c) 2025, Noble and contributors
// For license information, please see license.txt

frappe.ui.form.on("Maintenance Request", {
	refresh(frm) {
		if (frm.is_new()) return;

		if (frm.doc.status === "Open") {
			frm.add_custom_button(__("Mark In Progress"), function () {
				frm.set_value("status", "In Progress");
				frm.save();
			});
		}

		if (frm.doc.status === "In Progress") {
			frm.add_custom_button(__("Mark Resolved"), function () {
				frm.set_value("status", "Resolved");
				frm.save();
			});
		}

		if (frm.doc.status === "Resolved") {
			frm.add_custom_button(__("Close"), function () {
				frm.set_value("status", "Closed");
				frm.save();
			});
		}
	},
});
