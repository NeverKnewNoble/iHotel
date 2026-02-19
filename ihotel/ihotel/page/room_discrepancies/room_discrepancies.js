frappe.pages["room-discrepancies"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Room Discrepancies",
		single_column: true,
	});

	page.main.html(`
		<div class="rd-wrapper">
			<div class="rd-info">
				Discrepancies occur when Front Office (Check In) and Housekeeping (Room status) are out of sync.
				<strong>Skip</strong>: FO shows guest checked in but HK says room is clean/vacant.
				<strong>Sleep</strong>: HK shows room occupied but FO has no active stay.
			</div>
			<div class="rd-container">
				<div class="rd-loading">Loading…</div>
			</div>
		</div>
	`);

	const $container = page.main.find(".rd-container");

	function load() {
		$container.html('<div class="rd-loading">Loading…</div>');
		frappe.call({
			method: "ihotel.ihotel.page.room_discrepancies.room_discrepancies.get_discrepancies",
			callback: (r) => {
				const rows = r.message || [];
				if (!rows.length) {
					$container.html('<div class="rd-empty"><div class="rd-empty-icon">✓</div><div>No discrepancies found. Front Office and Housekeeping are in sync.</div></div>');
					return;
				}

				const html = `
					<div class="rd-summary">
						<span class="rd-badge rd-skip">${rows.filter(r=>r.type==="Skip").length} Skip</span>
						<span class="rd-badge rd-sleep">${rows.filter(r=>r.type==="Sleep").length} Sleep</span>
					</div>
					<table class="rd-table">
						<thead>
							<tr>
								<th>Type</th>
								<th>Room</th>
								<th>Floor</th>
								<th>Room Type</th>
								<th>HK Status</th>
								<th>FO Status</th>
								<th>Guest</th>
								<th>Description</th>
								<th>Action</th>
							</tr>
						</thead>
						<tbody>
							${rows.map(row => `
								<tr>
									<td><span class="rd-badge ${row.type === 'Skip' ? 'rd-skip' : 'rd-sleep'}">${row.type}</span></td>
									<td class="rd-room">${frappe.utils.escape_html(row.room_number)}</td>
									<td>${frappe.utils.escape_html(row.floor || "—")}</td>
									<td>${frappe.utils.escape_html(row.room_type || "—")}</td>
									<td><span class="rd-status-pill">${frappe.utils.escape_html(row.hk_status)}</span></td>
									<td><span class="rd-status-pill rd-fo">${frappe.utils.escape_html(row.fo_status)}</span></td>
									<td>${row.guest ? frappe.utils.escape_html(row.guest) : "<em>—</em>"}</td>
									<td class="rd-desc">${frappe.utils.escape_html(row.description)}</td>
									<td>
										${row.stay ? `<a href="/app/check-in/${encodeURIComponent(row.stay)}" class="rd-link">Open Stay</a>` : ""}
										<a href="/app/room/${encodeURIComponent(row.room)}" class="rd-link">Open Room</a>
									</td>
								</tr>
							`).join("")}
						</tbody>
					</table>
				`;
				$container.html(html);
			},
		});
	}

	page.set_secondary_action("Refresh", load);
	load();
};
