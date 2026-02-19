frappe.pages["room_board"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Room Board",
		single_column: true,
	});

	page.main.html(`
		<div class="rb-wrapper">

			<!-- Filter card -->
			<div class="rb-filter-card">

				<!-- Row 1: Search + dropdowns -->
				<div class="rb-filter-row">
					<div class="rb-search-wrap">
						<svg class="rb-search-icon" viewBox="0 0 24 24" fill="none"
							stroke="currentColor" stroke-width="2"
							stroke-linecap="round" stroke-linejoin="round">
							<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
						</svg>
						<input type="text" class="rb-search" placeholder="Search room number or guest…" autocomplete="off" />
					</div>
					<div class="rb-select-wrap">
						<svg class="rb-select-icon" viewBox="0 0 24 24" fill="none"
							stroke="currentColor" stroke-width="2"
							stroke-linecap="round" stroke-linejoin="round">
							<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
							<polyline points="9 22 9 12 15 12 15 22"/>
						</svg>
						<select class="rb-filter-type">
							<option value="">All Room Types</option>
						</select>
					</div>
					<div class="rb-select-wrap">
						<svg class="rb-select-icon" viewBox="0 0 24 24" fill="none"
							stroke="currentColor" stroke-width="2"
							stroke-linecap="round" stroke-linejoin="round">
							<line x1="8" y1="6" x2="21" y2="6"/>
							<line x1="8" y1="12" x2="21" y2="12"/>
							<line x1="8" y1="18" x2="21" y2="18"/>
							<line x1="3" y1="6" x2="3.01" y2="6"/>
							<line x1="3" y1="12" x2="3.01" y2="12"/>
							<line x1="3" y1="18" x2="3.01" y2="18"/>
						</svg>
						<select class="rb-filter-floor">
							<option value="">All Floors</option>
						</select>
					</div>
					<button class="rb-clear-btn" title="Clear filters">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
							stroke-linecap="round" stroke-linejoin="round">
							<line x1="18" y1="6" x2="6" y2="18"/>
							<line x1="6" y1="6" x2="18" y2="18"/>
						</svg>
						Clear
					</button>
				</div>

				<div class="rb-filter-divider"></div>

				<!-- Row 2: Status pills -->
				<div class="rb-filter-row rb-pills-row">
					<div class="rb-status-pills">
						<button class="rb-pill active" data-status="">
							All <span class="rb-pill-count">0</span>
						</button>
						<button class="rb-pill" data-status="Available">
							<span class="rb-dot" style="background:#10b981;"></span>
							Available <span class="rb-pill-count">0</span>
						</button>
						<button class="rb-pill" data-status="Occupied">
							<span class="rb-dot" style="background:#3b82f6;"></span>
							Occupied <span class="rb-pill-count">0</span>
						</button>
						<button class="rb-pill" data-status="Dirty">
							<span class="rb-dot" style="background:#f97316;"></span>
							Dirty <span class="rb-pill-count">0</span>
						</button>
						<button class="rb-pill" data-status="Pickup">
							<span class="rb-dot" style="background:#a855f7;"></span>
							Pickup <span class="rb-pill-count">0</span>
						</button>
						<button class="rb-pill" data-status="Inspected">
							<span class="rb-dot" style="background:#06b6d4;"></span>
							Inspected <span class="rb-pill-count">0</span>
						</button>
						<button class="rb-pill" data-status="Housekeeping">
							<span class="rb-dot" style="background:#f59e0b;"></span>
							Housekeeping <span class="rb-pill-count">0</span>
						</button>
						<button class="rb-pill" data-status="Out of Order">
							<span class="rb-dot" style="background:#ef4444;"></span>
							Out of Order <span class="rb-pill-count">0</span>
						</button>
						<button class="rb-pill" data-status="Out of Service">
							<span class="rb-dot" style="background:#6b7280;"></span>
							OOS <span class="rb-pill-count">0</span>
						</button>
					</div>
					<div class="rb-showing-count"></div>
				</div>

			</div>

			<!-- Grid -->
			<div class="rb-grid-container">
				<div class="rb-loading">Loading…</div>
			</div>

		</div>
	`);

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
		this.all_rooms = [];
		this.active_status = "";

		this.$search       = page.main.find(".rb-search");
		this.$filter_type  = page.main.find(".rb-filter-type");
		this.$filter_floor = page.main.find(".rb-filter-floor");
		this.$pills        = page.main.find(".rb-status-pills");
		this.$showing      = page.main.find(".rb-showing-count");
		this.$grid         = page.main.find(".rb-grid-container");
		this.$clear        = page.main.find(".rb-clear-btn");

		this.page.set_secondary_action("Refresh", () => this.refresh());

		this.$search.on("input", () => this.apply_filters());
		this.$filter_type.on("change", () => this.apply_filters());
		this.$filter_floor.on("change", () => this.apply_filters());

		this.$pills.on("click", ".rb-pill", (e) => {
			this.$pills.find(".rb-pill").removeClass("active");
			$(e.currentTarget).addClass("active");
			this.active_status = $(e.currentTarget).data("status");
			this.apply_filters();
		});

		this.$clear.on("click", () => {
			this.$search.val("");
			this.$filter_type.val("");
			this.$filter_floor.val("");
			this.$pills.find(".rb-pill").removeClass("active");
			this.$pills.find('[data-status=""]').addClass("active");
			this.active_status = "";
			this.apply_filters();
		});

		this.refresh();
	}

	refresh() {
		this.$grid.html('<div class="rb-loading">Loading…</div>');
		frappe.call({
			method: "ihotel.ihotel.page.room_board.room_board.get_room_board_data",
			callback: (r) => {
				if (r.message) {
					this.all_rooms = r.message;
					this.populate_dropdowns();
					this.apply_filters();
				}
			},
		});
	}

	populate_dropdowns() {
		const types = [...new Set(this.all_rooms.map(r => r.room_type).filter(Boolean))].sort();
		this.$filter_type.html('<option value="">All Room Types</option>');
		types.forEach(t => this.$filter_type.append(
			`<option value="${frappe.utils.escape_html(t)}">${frappe.utils.escape_html(t)}</option>`
		));

		const floors = [...new Set(this.all_rooms.map(r => r.floor).filter(Boolean))].sort((a, b) => {
			const na = parseInt(a), nb = parseInt(b);
			return (!isNaN(na) && !isNaN(nb)) ? na - nb : String(a).localeCompare(String(b));
		});
		this.$filter_floor.html('<option value="">All Floors</option>');
		floors.forEach(f => this.$filter_floor.append(
			`<option value="${frappe.utils.escape_html(f)}">Floor ${frappe.utils.escape_html(f)}</option>`
		));
	}

	apply_filters() {
		const search = this.$search.val().trim().toLowerCase();
		const type   = this.$filter_type.val();
		const floor  = this.$filter_floor.val();

		// Pre-status: apply search + type + floor only
		const pre = this.all_rooms.filter(room => {
			if (type  && room.room_type !== type) return false;
			if (floor && String(room.floor) !== String(floor)) return false;
			if (search) {
				const hay = [room.room_number, room.room_type, room.floor, room.guest, room.status]
					.filter(Boolean).join(" ").toLowerCase();
				if (!hay.includes(search)) return false;
			}
			return true;
		});

		// Update pill counts from pre-status set
		this.update_pill_counts(pre);

		// Apply status filter
		const filtered = this.active_status
			? pre.filter(r => r.status === this.active_status)
			: pre;

		this.$showing.text(
			filtered.length === this.all_rooms.length
				? `${filtered.length} rooms`
				: `${filtered.length} of ${this.all_rooms.length} rooms`
		);

		this.render_cards(filtered);
	}

	update_pill_counts(rooms) {
		const counts = {};
		rooms.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });

		this.$pills.find(".rb-pill").each((_, el) => {
			const s = $(el).data("status");
			const n = s ? (counts[s] || 0) : rooms.length;
			$(el).find(".rb-pill-count").text(n);
		});
	}

	render_cards(rooms) {
		if (!rooms.length) {
			this.$grid.html('<div class="rb-empty">No rooms match the current filters.</div>');
			return;
		}

		const status_colors = {
			"Available":      "#10b981",
			"Occupied":       "#3b82f6",
			"Dirty":          "#f97316",
			"Pickup":         "#a855f7",
			"Inspected":      "#06b6d4",
			"Housekeeping":   "#f59e0b",
			"Out of Order":   "#ef4444",
			"Out of Service": "#6b7280",
		};

		const cards = rooms.map(room => {
			const color = status_colors[room.status] || "#6b7280";
			const guest_html = room.guest
				? `<div class="rb-guest">${frappe.utils.escape_html(room.guest)}</div>`
				: "";
			const checkout_html = room.check_out
				? `<div class="rb-checkout">Out: ${frappe.datetime.str_to_user(room.check_out)}</div>`
				: "";
			const href = room.stay
				? `/app/check-in/${encodeURIComponent(room.stay)}`
				: `/app/room/${encodeURIComponent(room.name)}`;

			return `
				<a href="${href}" class="rb-card" style="--rb-status-color:${color};">
					<div class="rb-card-top">
						<div class="rb-room-number">${frappe.utils.escape_html(room.room_number || room.name)}</div>
						<div class="rb-status-dot-sm" style="background:${color};"></div>
					</div>
					<div class="rb-room-type">${frappe.utils.escape_html(room.room_type || "")}</div>
					<div class="rb-floor">Floor ${frappe.utils.escape_html(room.floor || "—")}</div>
					<div class="rb-status-label" style="color:${color};">${frappe.utils.escape_html(room.status)}</div>
					${guest_html}
					${checkout_html}
				</a>`;
		}).join("");

		this.$grid.html(`<div class="rb-grid">${cards}</div>`);
	}
}
