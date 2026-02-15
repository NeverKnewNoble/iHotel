// Copyright (c) 2026, Noble and contributors
// For license information, please see license.txt

frappe.ui.form.on("Reservation", {
	refresh(frm) {
		// Room filter by room_type
		frm.set_query("room", function () {
			let filters = {};
			if (frm.doc.room_type) {
				filters["room_type"] = frm.doc.room_type;
			}
			return { filters: filters };
		});

		// Convert to Hotel Stay button
		if (!frm.is_new() && frm.doc.status !== "cancelled" && !frm.doc.hotel_stay) {
			frm.add_custom_button(__("Convert to Hotel Stay"), function () {
				frappe.call({
					method: "ihotel.ihotel.doctype.reservation.reservation.convert_to_hotel_stay",
					args: { reservation_name: frm.doc.name },
					callback: function (r) {
						if (r.message) {
							frm.reload_doc();
						}
					},
				});
			}, __("Actions"));
		}

		// Link to Hotel Stay if converted
		if (frm.doc.hotel_stay) {
			frm.set_intro(
				__("Converted to Hotel Stay: {0}", [
					`<a href="/app/hotel-stay/${frm.doc.hotel_stay}">${frm.doc.hotel_stay}</a>`
				]),
				"green"
			);
		}
	},

	room_type(frm) {
		if (frm.doc.room_type) {
			frappe.db.get_value("Room Type", frm.doc.room_type, "rack_rate").then((r) => {
				if (r.message && r.message.rack_rate) {
					frm.set_value("rent", r.message.rack_rate);
				}
			});

			// Clear room if it doesn't match the new room_type
			if (frm.doc.room) {
				frappe.db.get_value("Room", frm.doc.room, "room_type").then((r) => {
					if (r.message && r.message.room_type !== frm.doc.room_type) {
						frm.set_value("room", "");
					}
				});
			}
		}
	},

	check_in_date(frm) {
		frm.trigger("calculate_days");
	},

	check_out_date(frm) {
		frm.trigger("calculate_days");
	},

	calculate_days(frm) {
		if (frm.doc.check_in_date && frm.doc.check_out_date) {
			let days = frappe.datetime.get_day_diff(frm.doc.check_out_date, frm.doc.check_in_date);
			if (days > 0) {
				frm.set_value("days", days);
				if (frm.doc.rent) {
					frm.set_value("total_rent", days * frm.doc.rent);
				}
			}
		}
	},

	rent(frm) {
		frm.trigger("calculate_days");
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
		}
	},
});
