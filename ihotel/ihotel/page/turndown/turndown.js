frappe.pages["turndown"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Turndown",
		single_column: true,
	});

	page.main.html(`
		<div class="td-wrapper">
			<div class="td-pills-row">
				<button class="td-pill active" data-filter="">All <span class="td-pill-count">0</span></button>
				<button class="td-pill" data-filter="Requested"><span class="td-dot" style="background:#7c3aed;"></span>Requested <span class="td-pill-count">0</span></button>
				<button class="td-pill" data-filter="Completed"><span class="td-dot" style="background:#10b981;"></span>Completed <span class="td-pill-count">0</span></button>
				<button class="td-pill" data-filter="Not Required"><span class="td-dot" style="background:#9ca3af;"></span>Not Required <span class="td-pill-count">0</span></button>
			</div>
			<div class="td-container">
				<div class="td-loading">Loading…</div>
			</div>
		</div>
	`);

	const $container = page.main.find(".td-container");
	const $pills = page.main.find(".td-pill");
	let all_data = [];
	let active_filter = "";

	function apply_filter() {
		const rows = active_filter ? all_data.filter(r => r.turndown_status === active_filter) : all_data;
		render(rows);
	}

	function update_counts() {
		const counts = {};
		all_data.forEach(r => { counts[r.turndown_status] = (counts[r.turndown_status] || 0) + 1; });
		$pills.each((_, el) => {
			const f = $(el).data("filter");
			$(el).find(".td-pill-count").text(f ? (counts[f] || 0) : all_data.length);
		});
	}

	$pills.on("click", function() {
		$pills.removeClass("active");
		$(this).addClass("active");
		active_filter = $(this).data("filter");
		apply_filter();
	});

	function render(rows) {
		if (!rows.length) {
			$container.html('<div class="td-empty">No guests match this filter.</div>');
			return;
		}

		const status_colors = { "Requested": "#7c3aed", "Completed": "#10b981", "Not Required": "#9ca3af" };

		const html = `
			<table class="td-table">
				<thead>
					<tr>
						<th>Room</th>
						<th>Floor</th>
						<th>Room Type</th>
						<th>Guest</th>
						<th>Turndown Status</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					${rows.map(row => {
						const color = status_colors[row.turndown_status] || "#9ca3af";
						return `
							<tr>
								<td class="td-room">${frappe.utils.escape_html(row.room_number)}</td>
								<td>${frappe.utils.escape_html(row.floor || "—")}</td>
								<td>${frappe.utils.escape_html(row.room_type || "—")}</td>
								<td>${frappe.utils.escape_html(row.guest || "—")}</td>
								<td>
									<span class="td-status-badge" style="background:${color}20;color:${color};">
										${frappe.utils.escape_html(row.turndown_status)}
									</span>
								</td>
								<td>
									${row.turndown_status === "Requested"
										? `<button class="td-action-btn btn btn-xs btn-primary" data-room="${frappe.utils.escape_html(row.room)}" data-stay="${frappe.utils.escape_html(row.stay)}">Mark Complete</button>`
										: ""}
									<a href="/app/check-in/${encodeURIComponent(row.stay)}" class="td-link">View Stay</a>
								</td>
							</tr>
						`;
					}).join("")}
				</tbody>
			</table>
		`;
		$container.html(html);

		$container.find(".td-action-btn").on("click", function() {
			const room = $(this).data("room");
			frappe.call({
				method: "frappe.client.insert",
				args: {
					doc: {
						doctype: "Housekeeping Task",
						room: room,
						task_type: "Turndown",
						status: "Completed",
						assigned_date: frappe.datetime.now_datetime(),
						cleaned_date: frappe.datetime.now_datetime(),
					}
				},
				callback: () => {
					frappe.show_alert({ message: `Turndown for Room ${room} marked complete`, indicator: "green" });
					load();
				}
			});
		});
	}

	function load() {
		$container.html('<div class="td-loading">Loading…</div>');
		frappe.call({
			method: "ihotel.ihotel.page.turndown.turndown.get_turndown_data",
			callback: (r) => {
				all_data = r.message || [];
				update_counts();
				apply_filter();
			},
		});
	}

	page.set_secondary_action("Refresh", load);
	load();
};
