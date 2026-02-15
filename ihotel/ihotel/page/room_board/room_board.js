frappe.pages["room_board"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Room Board",
		single_column: true,
	});

	page.main.html('<div class="room-board-container"><div class="text-muted">Loading...</div></div>');
	wrapper.room_board = new RoomBoard(page);
};

frappe.pages["room_board"].on_page_show = function (wrapper) {
	if (wrapper.room_board) {
		wrapper.room_board.refresh();
	}
};

class RoomBoard {
	constructor(page) {
		this.page = page;
		this.container = page.main.find(".room-board-container");

		this.page.set_secondary_action("Refresh", () => this.refresh());
		this.refresh();
	}

	refresh() {
		frappe.call({
			method: "ihotel.ihotel.page.room_board.room_board.get_room_board_data",
			callback: (r) => {
				if (r.message) {
					this.render(r.message);
				}
			},
		});
	}

	render(rooms) {
		if (!rooms || !rooms.length) {
			this.container.html('<div class="text-muted text-center" style="padding: 40px;">No rooms found.</div>');
			return;
		}

		const status_colors = {
			"Available": "#10b981",
			"Occupied": "#3b82f6",
			"Housekeeping": "#f59e0b",
			"Out of Order": "#ef4444",
		};

		let cards = rooms.map((room) => {
			const color = status_colors[room.status] || "#6b7280";
			const guest_info = room.guest
				? `<div class="rb-guest">${frappe.utils.escape_html(room.guest)}</div>`
				: "";
			const checkout_info = room.check_out
				? `<div class="rb-checkout">Out: ${frappe.datetime.str_to_user(room.check_out)}</div>`
				: "";
			const click_target = room.stay
				? `/app/hotel-stay/${encodeURIComponent(room.stay)}`
				: `/app/room/${encodeURIComponent(room.name)}`;

			return `
			<a href="${click_target}" class="rb-card" style="border-left: 4px solid ${color};">
				<div class="rb-room-number">${frappe.utils.escape_html(room.room_number || room.name)}</div>
				<div class="rb-room-type">${frappe.utils.escape_html(room.room_type || "")}</div>
				<div class="rb-floor">Floor: ${frappe.utils.escape_html(room.floor || "-")}</div>
				<div class="rb-status" style="color: ${color};">${room.status}</div>
				${guest_info}
				${checkout_info}
			</a>`;
		}).join("");

		this.container.html(`
			<style>
				.rb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; padding: 16px; }
				.rb-card { display: block; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; text-decoration: none; color: inherit; transition: box-shadow 0.2s; }
				.rb-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-decoration: none; }
				.rb-room-number { font-size: 18px; font-weight: 700; }
				.rb-room-type { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
				.rb-floor { font-size: 11px; color: var(--text-muted); }
				.rb-status { font-size: 12px; font-weight: 600; margin-top: 6px; }
				.rb-guest { font-size: 12px; margin-top: 4px; }
				.rb-checkout { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
			</style>
			<div class="rb-grid">${cards}</div>
		`);
	}
}
