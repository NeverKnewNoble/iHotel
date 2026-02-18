// Copyright (c) 2025, Noble and contributors
// For license information, please see license.txt

frappe.ui.form.on("Hotel Stay", {
	onload: function(frm) {
		setup_room_query(frm);
		setup_rate_type_query(frm);
	},

	refresh(frm) {
		setup_room_query(frm);
		setup_rate_type_query(frm);

		// Add custom buttons based on status
		if (frm.doc.status === "Reserved" && !frm.is_new()) {
			frm.add_custom_button(__("Check In"), function() {
				frm.set_value("status", "Checked In");
				frm.set_value("actual_check_in", frappe.datetime.now_datetime());
				frm.save();
			});
		}

		if (frm.doc.status === "Checked In" && !frm.is_new()) {
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

		setup_room_query(frm);
		setup_rate_type_query(frm);

		// Clear rate_type if it no longer matches the new room_type
		if (frm.doc.rate_type && frm.doc.room_type) {
			frappe.db.get_value("Rate Type", frm.doc.rate_type, ["applicable_to", "room_type"])
				.then(r => {
					const rt = r.message;
					if (rt && rt.applicable_to === "Room Type" && rt.room_type !== frm.doc.room_type) {
						frm.set_value("rate_type", "");
					}
				});
		}

		// Clear room field if current room doesn't match the new room_type
		if (frm.doc.room && frm.doc.room_type) {
			frappe.db.get_value("Room", frm.doc.room, "room_type")
				.then(r => {
					if (r.message && r.message.room_type !== frm.doc.room_type) {
						frm.set_value("room", "");
					}
				});
		} else if (!frm.doc.room_type) {
			// Clear room if room_type is cleared
			frm.set_value("room", "");
		}
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

	rate_type(frm) {
		if (frm.doc.rate_type) {
			frappe.db.get_doc("Rate Type", frm.doc.rate_type).then((rate) => {
				let indicators = [];
				if (rate.includes_breakfast) indicators.push("Breakfast included");
				if (rate.refundable) indicators.push("Refundable");
				if (rate.includes_taxes) indicators.push("Taxes included");
				if (indicators.length) {
					frm.set_intro(indicators.join(" | "), "blue");
				}
			});
		} else {
			frm.set_intro("");
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

// Filter rate_type by room_type (All Rooms + Room Type-specific)
function setup_rate_type_query(frm) {
	frm.set_query("rate_type", function() {
		if (frm.doc.room_type) {
			return {
				query: "ihotel.ihotel.doctype.hotel_stay.hotel_stay.get_rate_types_for_room_type",
				filters: { room_type: frm.doc.room_type },
			};
		}
		return {};
	});
}

// Filter room by room_type using a server-side query
function setup_room_query(frm) {
	frm.set_query("room", function() {
		if (frm.doc.room_type) {
			return {
				query: "ihotel.ihotel.doctype.hotel_stay.hotel_stay.get_rooms_for_room_type",
				filters: { room_type: frm.doc.room_type },
			};
		}
		return {};
	});
}

function calculate_service_amount(frm, cdt, cdn) {
	// Get the child row data
	const row = locals[cdt][cdn];
	if (row.rate !== undefined && row.quantity !== undefined) {
		const amount = (row.rate || 0) * (row.quantity || 0);
		frappe.model.set_value(cdt, cdn, "amount", amount);
	}
}
