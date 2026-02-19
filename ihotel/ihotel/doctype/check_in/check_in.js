// Copyright (c) 2025, Noble and contributors
// For license information, please see license.txt

frappe.ui.form.on("Check In", {
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
			// DND toggle
			frm.add_custom_button(
				frm.doc.do_not_disturb ? __("Clear DND") : __("Set DND"),
				function() {
					frm.set_value("do_not_disturb", frm.doc.do_not_disturb ? 0 : 1);
					frm.save();
				}, __("Guest Services")
			);

			// MUR toggle
			frm.add_custom_button(
				frm.doc.make_up_room ? __("Clear Make Up Room") : __("Make Up Room"),
				function() {
					frm.set_value("make_up_room", frm.doc.make_up_room ? 0 : 1);
					frm.save();
				}, __("Guest Services")
			);

			// Turndown toggle
			frm.add_custom_button(
				frm.doc.turndown_requested ? __("Cancel Turndown") : __("Request Turndown"),
				function() {
					frm.set_value("turndown_requested", frm.doc.turndown_requested ? 0 : 1);
					frm.save();
				}, __("Guest Services")
			);

			frm.add_custom_button(__("Check Out"), function() {
				frm.set_value("status", "Checked Out");
				frm.set_value("actual_check_out", frappe.datetime.now_datetime());
				frm.save();
			});

			frm.add_custom_button(__("Room Move"), function() {
				const d = new frappe.ui.Dialog({
					title: __("Move Guest to Another Room"),
					fields: [
						{
							fieldtype: "Data",
							fieldname: "current_room",
							label: __("Current Room"),
							default: frm.doc.room || __("(none)"),
							read_only: 1,
						},
						{
							fieldtype: "Link",
							fieldname: "new_room",
							label: __("Move to Room"),
							options: "Room",
							reqd: 1,
							get_query: function () {
								return { filters: { status: "Available" } };
							},
						},
						{
							fieldtype: "Small Text",
							fieldname: "reason",
							label: __("Reason (optional)"),
						},
					],
					primary_action_label: __("Confirm Move"),
					primary_action(values) {
						frappe.call({
							method: "ihotel.ihotel.doctype.check_in.check_in.move_room",
							args: {
								check_in_name: frm.doc.name,
								new_room: values.new_room,
								reason: values.reason || "",
							},
							callback(r) {
								if (r.message) {
									d.hide();
									frm.reload_doc();
								}
							},
						});
					},
				});
				d.show();
			}, __("Actions"));
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
		if (!frm.doc.rate_type) {
			frm.set_intro("");
			return;
		}
		frappe.db.get_doc("Rate Type", frm.doc.rate_type).then((rate) => {
			// --- indicators ---
			let indicators = [];
			if (rate.includes_breakfast) indicators.push("Breakfast included");
			if (rate.refundable)         indicators.push("Refundable");
			if (rate.includes_taxes)     indicators.push("Taxes included");
			frm.set_intro(indicators.length ? indicators.join(" | ") : "", "blue");

			// --- rate autofill ---
			let resolved_rate = null;
			const today = frappe.datetime.get_today();
			const room_type = frm.doc.room_type || "";

			if (rate.rate_schedule && rate.rate_schedule.length) {
				// Find the best matching schedule row
				for (const row of rate.rate_schedule) {
					const type_match = !row.room_type || row.room_type === room_type;
					const in_range   = (!row.from_date || row.from_date <= today) &&
					                   (!row.to_date   || row.to_date   >= today);
					if (type_match && in_range && row.rate) {
						resolved_rate = row.rate;
						break;
					}
				}
			}

			if (!resolved_rate && rate.base_rate) {
				resolved_rate = rate.base_rate;
			}

			if (resolved_rate) {
				frm.set_value("room_rate", resolved_rate);
				frm.trigger("calculate_total");
			}
		});
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
				query: "ihotel.ihotel.doctype.check_in.check_in.get_rate_types_for_room_type",
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
				query: "ihotel.ihotel.doctype.check_in.check_in.get_rooms_for_room_type",
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
