frappe.pages["rate_query"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Rate Query",
		single_column: true,
	});

	wrapper.rate_query = new RateQuery(page);
};

frappe.pages["rate_query"].on_page_show = function (wrapper) {
	if (wrapper.rate_query) {
		wrapper.rate_query.focus_arrival();
	}
};

class RateQuery {
	constructor(page) {
		this.page = page;
		this.data = null;
		this.selected_guest = null;

		this.render_search_bar();
		this.page.set_secondary_action("New Reservation", () => {
			frappe.new_doc("Reservation");
		});
	}

	render_search_bar() {
		const today = frappe.datetime.get_today();

		this.page.main.html(`
			<div class="rq-wrapper">
				<div class="rq-search-bar">
					<div class="rq-fields-row">
						<div class="rq-field">
							<label class="rq-label">Arrival</label>
							<input type="date" class="form-control rq-arrival" value="${today}" />
						</div>
						<div class="rq-field rq-field-sm">
							<label class="rq-label">Nights</label>
							<input type="number" class="form-control rq-nights" min="1" value="1" />
						</div>
						<div class="rq-field">
							<label class="rq-label">Departure</label>
							<input type="date" class="form-control rq-departure" />
						</div>
						<div class="rq-field rq-field-sm">
							<label class="rq-label">Adults</label>
							<input type="number" class="form-control rq-adults" min="1" value="1" />
						</div>
						<div class="rq-field rq-field-sm">
							<label class="rq-label">Children</label>
							<input type="number" class="form-control rq-children" min="0" value="0" />
						</div>
					</div>
					<div class="rq-fields-row rq-fields-row-2">
						<div class="rq-field rq-field-guest">
							<label class="rq-label">Guest Profile (optional)</label>
							<div class="rq-guest-wrap">
								<input type="text" class="form-control rq-guest-search"
									placeholder="Search by name, email or phone…" autocomplete="off" />
								<input type="hidden" class="rq-guest-id" />
								<div class="rq-guest-suggestions"></div>
							</div>
						</div>
						<div class="rq-search-action">
							<button class="btn btn-primary rq-btn-search">Check Availability</button>
						</div>
					</div>
				</div>

				<div class="rq-legend" style="display:none;">
					<span class="rq-avail-dot">●</span> Available &nbsp;
					<span class="rq-unavail-dot">●</span> Not Available &nbsp;&nbsp;
					<span class="badge badge-info">B</span> Breakfast &nbsp;
					<span class="badge badge-success">R</span> Refundable &nbsp;
					<span class="badge badge-secondary">T</span> Tax Incl.
				</div>

				<div class="rq-result-summary" style="display:none;"></div>
				<div class="rq-grid-wrap" style="display:none;"></div>

				<div class="rq-info-panel" style="display:none;">
					<div class="rq-info-inner"></div>
				</div>
			</div>
		`);

		this.$arrival    = this.page.main.find(".rq-arrival");
		this.$nights     = this.page.main.find(".rq-nights");
		this.$departure  = this.page.main.find(".rq-departure");
		this.$adults     = this.page.main.find(".rq-adults");
		this.$children   = this.page.main.find(".rq-children");
		this.$guest_input = this.page.main.find(".rq-guest-search");
		this.$guest_id   = this.page.main.find(".rq-guest-id");
		this.$suggestions = this.page.main.find(".rq-guest-suggestions");
		this.$grid_wrap  = this.page.main.find(".rq-grid-wrap");
		this.$info_panel = this.page.main.find(".rq-info-panel");
		this.$legend     = this.page.main.find(".rq-legend");
		this.$summary    = this.page.main.find(".rq-result-summary");

		// Compute initial departure
		this.update_departure();

		// Wire events
		this.$arrival.on("change", () => this.update_departure());
		this.$nights.on("change",  () => this.update_departure());
		this.$departure.on("change", () => this.update_nights_from_departure());
		this.page.main.find(".rq-btn-search").on("click", () => this.search());

		// Guest search autocomplete
		let search_timer;
		this.$guest_input.on("input", () => {
			clearTimeout(search_timer);
			const q = this.$guest_input.val().trim();
			if (q.length < 2) { this.$suggestions.hide().empty(); return; }
			search_timer = setTimeout(() => this.fetch_guest_suggestions(q), 250);
		});
		this.$guest_input.on("blur", () => {
			// Delay hide so click on suggestion registers
			setTimeout(() => this.$suggestions.hide(), 200);
		});
		this.$guest_input.on("focus", () => {
			if (this.$suggestions.children().length) this.$suggestions.show();
		});
	}

	focus_arrival() {
		this.$arrival.focus();
	}

	update_departure() {
		const arrival = this.$arrival.val();
		const nights  = parseInt(this.$nights.val()) || 1;
		if (arrival) {
			this.$departure.val(frappe.datetime.add_days(arrival, nights));
		}
	}

	update_nights_from_departure() {
		const arrival = this.$arrival.val();
		const dep     = this.$departure.val();
		if (arrival && dep) {
			const diff = frappe.datetime.get_day_diff(dep, arrival);
			if (diff > 0) this.$nights.val(diff);
		}
	}

	fetch_guest_suggestions(q) {
		frappe.call({
			method: "ihotel.ihotel.page.rate_query.rate_query.search_guest_profiles",
			args: { query: q },
			callback: (r) => {
				const results = r.message || [];
				this.$suggestions.empty();
				if (!results.length) { this.$suggestions.hide(); return; }

				results.forEach((g) => {
					const sub = [g.email, g.phone].filter(Boolean).join(" · ");
					const item = $(`
						<div class="rq-suggestion-item">
							<strong>${frappe.utils.escape_html(g.guest_name)}</strong>
							${sub ? `<span class="text-muted"> — ${frappe.utils.escape_html(sub)}</span>` : ""}
						</div>
					`);
					item.on("mousedown", () => {
						this.$guest_input.val(g.guest_name);
						this.$guest_id.val(g.name);
						this.selected_guest = g;
						this.$suggestions.hide().empty();
					});
					this.$suggestions.append(item);
				});
				this.$suggestions.show();
			},
		});
	}

	search() {
		const arrival  = this.$arrival.val();
		const nights   = parseInt(this.$nights.val()) || 0;
		const adults   = parseInt(this.$adults.val()) || 1;
		const children = parseInt(this.$children.val()) || 0;

		if (!arrival) { frappe.msgprint(__("Please select an arrival date.")); return; }
		if (nights < 1) { frappe.msgprint(__("Nights must be at least 1.")); return; }

		this.$grid_wrap.html('<div class="text-muted" style="padding: 20px 0;">Loading…</div>').show();
		this.$info_panel.hide();
		this.$legend.hide();
		this.$summary.hide();

		frappe.call({
			method: "ihotel.ihotel.page.rate_query.rate_query.get_rate_query_data",
			args: { arrival_date: arrival, nights, adults, children },
			callback: (r) => {
				if (r.message) {
					this.data = r.message;
					this.render_grid(r.message);
				}
			},
		});
	}

	render_grid(data) {
		const { room_types, grid, nights } = data;

		if (!room_types || !room_types.length) {
			this.$grid_wrap.html('<div class="text-muted text-center" style="padding: 40px;">No room types found. Please configure Room Types first.</div>');
			return;
		}
		if (!grid || !grid.length) {
			this.$grid_wrap.html('<div class="text-muted text-center" style="padding: 40px;">No active rate types found. Please configure Rate Types first.</div>');
			return;
		}

		// Summary bar
		const arr_fmt = frappe.datetime.str_to_user(data.arrival_date);
		const dep_fmt = frappe.datetime.str_to_user(data.departure_date);
		this.$summary.html(
			`<strong>${arr_fmt}</strong> &rarr; <strong>${dep_fmt}</strong> &nbsp;·&nbsp; ` +
			`<strong>${nights}</strong> night${nights !== 1 ? "s" : ""} &nbsp;·&nbsp; ` +
			`${data.adults} adult${data.adults !== 1 ? "s" : ""}` +
			(data.children ? ` · ${data.children} child${data.children !== 1 ? "ren" : ""}` : "")
		).show();

		// Header row: Room Types
		const header_cells = room_types.map((rt) => {
			const avail_cls = rt.available_rooms > 0 ? "rq-avail-count" : "rq-unavail-count";
			return `
				<th class="rq-th-room">
					<div class="rq-rt-name">${frappe.utils.escape_html(rt.room_type_name || rt.name)}</div>
					<div class="${avail_cls}">${rt.available_rooms} avail</div>
				</th>`;
		}).join("");

		// Data rows: Rate Types
		const rows = grid.map((row) => {
			const badges = [
				row.includes_breakfast ? '<span class="badge badge-info">B</span>' : "",
				row.refundable         ? '<span class="badge badge-success">R</span>' : "",
				row.includes_taxes     ? '<span class="badge badge-secondary">T</span>' : "",
			].filter(Boolean).join(" ");

			const cells = row.cells.map((cell, ci) => {
				const rt = room_types[ci];
				const cls = cell.available ? "rq-cell rq-cell-avail" : "rq-cell rq-cell-unavail";
				const rate_fmt = frappe.format(cell.rate, { fieldtype: "Currency" });
				const total_fmt = frappe.format(cell.rate * nights, { fieldtype: "Currency" });
				const restr_html = !cell.available && cell.restriction
					? `<div class="rq-cell-restrict">${frappe.utils.escape_html(cell.restriction)}</div>`
					: "";

				return `
					<td class="${cls}"
						data-rate-type="${frappe.utils.escape_html(row.rate_type)}"
						data-room-type="${frappe.utils.escape_html(rt.name)}"
						data-rate="${cell.rate}"
						data-available="${cell.available ? 1 : 0}"
						data-rooms="${cell.available_rooms}"
						data-restriction="${frappe.utils.escape_html(cell.restriction || "")}">
						<div class="rq-cell-rate">${rate_fmt}</div>
						<div class="rq-cell-total">${total_fmt} total</div>
						${restr_html}
					</td>`;
			}).join("");

			return `
				<tr>
					<td class="rq-td-rate">
						<div class="rq-rate-code">${frappe.utils.escape_html(row.rate_code)}</div>
						<div class="rq-rate-name">${frappe.utils.escape_html(row.rate_name)}</div>
						<div class="rq-rate-badges">${badges}</div>
					</td>
					${cells}
				</tr>`;
		}).join("");

		this.$grid_wrap.html(`
			<div class="table-responsive">
				<table class="table rq-table">
					<thead>
						<tr>
							<th class="rq-th-rate">Rate Code</th>
							${header_cells}
						</tr>
					</thead>
					<tbody>${rows}</tbody>
				</table>
			</div>
		`).show();

		this.$legend.show();

		// Cell click → show info panel
		this.$grid_wrap.find(".rq-cell").on("click", (e) => {
			this.$grid_wrap.find(".rq-cell").removeClass("rq-cell-selected");
			const $cell = $(e.currentTarget);
			$cell.addClass("rq-cell-selected");
			this.show_info($cell);
		});
	}

	show_info($cell) {
		const rate_type_name = $cell.data("rate-type");
		const room_type_name = $cell.data("room-type");
		const rate           = parseFloat($cell.data("rate")) || 0;
		const available      = $cell.data("available") == 1;
		const rooms_left     = $cell.data("rooms");
		const restriction    = $cell.data("restriction") || "";

		const data = this.data;
		const rate_type = (data.rate_types || []).find((r) => r.name === rate_type_name) || {};
		const room_type = (data.room_types || []).find((rt) => rt.name === room_type_name) || {};
		const nights    = data.nights;

		const rate_fmt  = frappe.format(rate, { fieldtype: "Currency" });
		const total_fmt = frappe.format(rate * nights, { fieldtype: "Currency" });

		const inclusions = [
			rate_type.includes_breakfast ? "Breakfast included" : "",
			rate_type.refundable         ? "Refundable"         : "",
			rate_type.includes_taxes     ? "Taxes included"     : "",
		].filter(Boolean);

		const avail_html = available
			? `<span class="rq-avail-text">✓ Available — ${rooms_left} room${rooms_left !== 1 ? "s" : ""}</span>`
			: `<span class="rq-unavail-text">✗ Not Available${restriction ? " — " + restriction : ""}</span>`;

		const create_btn = available
			? `<button class="btn btn-primary btn-sm rq-btn-create"
					data-rate-type="${frappe.utils.escape_html(rate_type_name)}"
					data-room-type="${frappe.utils.escape_html(room_type_name)}"
					data-rate="${rate}">
					Create Reservation
				</button>`
			: "";

		this.$info_panel.find(".rq-info-inner").html(`
			<div class="rq-info-grid">
				<div class="rq-info-row">
					<span class="rq-info-lbl">Room Type</span>
					<span>${frappe.utils.escape_html(room_type.room_type_name || room_type_name)}</span>
				</div>
				<div class="rq-info-row">
					<span class="rq-info-lbl">Rate Code</span>
					<span>${frappe.utils.escape_html(rate_type.rate_code || rate_type_name)} — ${frappe.utils.escape_html(rate_type.rate_type_name || "")}</span>
				</div>
				<div class="rq-info-row">
					<span class="rq-info-lbl">Rate / Night</span>
					<span class="rq-info-rate">${rate_fmt}</span>
				</div>
				<div class="rq-info-row">
					<span class="rq-info-lbl">Total (${nights} nights)</span>
					<span class="rq-info-rate">${total_fmt}</span>
				</div>
				${inclusions.length ? `<div class="rq-info-row"><span class="rq-info-lbl">Inclusions</span><span>${inclusions.join(" · ")}</span></div>` : ""}
				<div class="rq-info-row">
					<span class="rq-info-lbl">Availability</span>
					<span>${avail_html}</span>
				</div>
				${create_btn ? `<div class="rq-info-actions">${create_btn}</div>` : ""}
			</div>
		`);

		this.$info_panel.show();

		// Create reservation handler
		this.$info_panel.find(".rq-btn-create").off("click").on("click", (e) => {
			const $btn  = $(e.currentTarget);
			const guest = this.$guest_id.val() || undefined;
			const dep   = frappe.datetime.add_days(data.arrival_date, data.nights);

			frappe.new_doc("Reservation", {
				check_in_date:  data.arrival_date,
				check_out_date: dep,
				room_type:  $btn.data("room-type"),
				rate_type:  $btn.data("rate-type"),
				rent:       $btn.data("rate"),
				adults:     data.adults,
				children:   data.children,
				guest:      guest,
			});
		});
	}
}
