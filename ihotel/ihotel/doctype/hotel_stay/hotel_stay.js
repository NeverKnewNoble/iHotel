// Copyright (c) 2025, Noble and contributors
// For license information, please see license.txt

frappe.ui.form.on("Hotel Stay", {
	onload: function(frm) {
		// Set up room query filter on form load
		if (frm.fields_dict['room']) {
			frm.fields_dict['room'].get_query = function(doc) {
				return {
					filters: {
						"room_type": frm.doc.room_type
					}
				};
			};
		}
	},

	refresh(frm) {
		// Add custom buttons based on status
		if (frm.doc.status === "Reserved" && !frm.is_new()) {
			frm.add_custom_button(__("Check In"), function() {
				frm.set_value("status", "Checked");
				frm.set_value("actual_check_in", frappe.datetime.now_datetime());
				frm.save();
			});
		}

		if (frm.doc.status === "Checked" && !frm.is_new()) {
			frm.add_custom_button(__("Check Out"), function() {
				frm.set_value("status", "Checked Out");
				frm.set_value("actual_check_out", frappe.datetime.now_datetime());
				frm.save();
			});
		}
	},

	// Auto-fetch room rate from room type and update room query filter
	room_type(frm) {
		// Fetch room rate from room type
		if (frm.doc.room_type) {
			frappe.db.get_value("Room Type", frm.doc.room_type, "rack_rate")
				.then(r => {
					if (r.message && r.message.rack_rate) {
						frm.set_value("room_rate", r.message.rack_rate);
						frm.trigger("calculate_total");
					}
				});
		}

		// Update room query filter based on room_type and dates
		frm.set_query("room", function() {
			const filters = {};
			if (frm.doc.room_type) {
				filters.room_type = frm.doc.room_type;
			}
			if (frm.doc.expected_check_in && frm.doc.expected_check_out) {
				filters.status = ["in", ["Available", "Housekeeping"]];
			}
			return { filters: filters };
		});
	},

	// Calculate total when dates or rate change
	expected_check_in(frm) {
		frm.trigger("calculate_total");
		// Update room query when dates change
		frm.trigger("room_type");
	},

	expected_check_out(frm) {
		frm.trigger("calculate_total");
		// Update room query when dates change
		frm.trigger("room_type");
	},

	room_rate(frm) {
		frm.trigger("calculate_total");
	},

	// Calculate dates from nights field
	nights(frm) {
		if (frm.doc.nights && frm.doc.nights > 0) {
			// If expected_check_in is not set, set it to current date/time
			if (!frm.doc.expected_check_in) {
				frm.set_value("expected_check_in", frappe.datetime.now_datetime());
			}

			// Calculate expected_check_out from expected_check_in + nights
			if (frm.doc.expected_check_in) {
				const check_in = frappe.datetime.str_to_obj(frm.doc.expected_check_in);
				const check_out = new Date(check_in);
				check_out.setDate(check_out.getDate() + frm.doc.nights);
				frm.set_value("expected_check_out", frappe.datetime.obj_to_str(check_out));
			}
		}
	},

	calculate_total(frm) {
		if (frm.doc.expected_check_in && frm.doc.expected_check_out && frm.doc.room_rate) {
			const nights = frappe.datetime.get_day_diff(
				frm.doc.expected_check_out,
				frm.doc.expected_check_in
			);
			if (nights > 0) {
				frm.set_value("nights", nights);
				frm.set_value("total_amount", nights * frm.doc.room_rate);
			}
		}
	}
});

// Calculate amount for additional services (rate * quantity)
frappe.ui.form.on("Stay Service Item", {
	rate(frm, cdt, cdn) {
		calculate_service_amount(frm, cdt, cdn);
	},
	quantity(frm, cdt, cdn) {
		calculate_service_amount(frm, cdt, cdn);
	}
});

function calculate_service_amount(frm, cdt, cdn) {
	// Get the child row data
	const row = locals[cdt][cdn];
	if (row.rate !== undefined && row.quantity !== undefined) {
		const amount = (row.rate || 0) * (row.quantity || 0);
		frappe.model.set_value(cdt, cdn, "amount", amount);
	}
}
