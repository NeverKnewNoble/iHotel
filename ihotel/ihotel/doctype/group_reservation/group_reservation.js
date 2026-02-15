// Copyright (c) 2026, Noble and contributors
// For license information, please see license.txt

frappe.ui.form.on("Group Reservation", {
	refresh(frm) {
		if (!frm.is_new() && frm.doc.no_of_rooms) {
			frm.add_custom_button(__("Generate Reservations"), function () {
				frappe.call({
					method: "ihotel.ihotel.doctype.group_reservation.group_reservation.generate_reservations",
					args: { group_reservation_name: frm.doc.name },
					callback: function (r) {
						if (r.message) {
							frm.reload_doc();
						}
					},
				});
			}, __("Actions"));
		}

		// Show linked reservations
		if (!frm.is_new()) {
			frappe.call({
				method: "frappe.client.get_count",
				args: {
					doctype: "Reservation",
					filters: { group_reservation: frm.doc.name },
				},
				callback: function (r) {
					if (r.message && r.message > 0) {
						frm.set_intro(
							__("{0} reservation(s) linked. ", [r.message]) +
								`<a href="/app/reservation?group_reservation=${frm.doc.name}">View Reservations</a>`,
							"blue"
						);
					}
				},
			});
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
			}
		}
	},
});
