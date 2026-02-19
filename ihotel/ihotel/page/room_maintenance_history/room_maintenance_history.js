frappe.pages["room-maintenance-history"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Room Maintenance History",
		single_column: true,
	});

	page.main.html(`
		<div class="rmh-wrapper">
			<div class="rmh-selector-row">
				<div class="rmh-room-wrap">
					<label class="rmh-label">Select Room</label>
					<select class="rmh-room-select"><option value="">— choose a room —</option></select>
				</div>
				<div class="rmh-stats"></div>
			</div>
			<div class="rmh-container">
				<div class="rmh-empty-state">Select a room to view its maintenance history.</div>
			</div>
		</div>
	`);

	const $select   = page.main.find(".rmh-room-select");
	const $container = page.main.find(".rmh-container");
	const $stats    = page.main.find(".rmh-stats");

	// Check for room passed via route options
	const route_options = frappe.route_options || {};

	// Load room list
	frappe.call({
		method: "ihotel.ihotel.page.room_maintenance_history.room_maintenance_history.get_all_rooms",
		callback: (r) => {
			(r.message || []).forEach(room => {
				$select.append(`<option value="${room.name}">${room.room_number} — ${room.room_type || ""} (Floor ${room.floor || "?"})</option>`);
			});
			if (route_options.room) {
				$select.val(route_options.room);
				load_history(route_options.room);
				frappe.route_options = null;
			}
		},
	});

	$select.on("change", function () {
		const room = $(this).val();
		if (room) load_history(room);
		else {
			$container.html('<div class="rmh-empty-state">Select a room to view its maintenance history.</div>');
			$stats.html("");
		}
	});

	page.set_secondary_action("New Request", () => {
		const room = $select.val();
		frappe.new_doc("Maintenance Request", { room });
	});

	function load_history(room) {
		$container.html('<div class="rmh-loading">Loading…</div>');
		frappe.call({
			method: "ihotel.ihotel.page.room_maintenance_history.room_maintenance_history.get_room_history",
			args: { room },
			callback: (r) => {
				const rows = r.message || [];
				render_stats(rows);
				render_timeline(rows, room);
			},
		});
	}

	function render_stats(rows) {
		const open     = rows.filter(r => r.status === "Open").length;
		const progress = rows.filter(r => r.status === "In Progress").length;
		const resolved = rows.filter(r => ["Resolved","Closed"].includes(r.status)).length;
		$stats.html(`
			<span class="rmh-stat rmh-open">${open} Open</span>
			<span class="rmh-stat rmh-progress">${progress} In Progress</span>
			<span class="rmh-stat rmh-resolved">${resolved} Resolved</span>
			<span class="rmh-stat rmh-total">${rows.length} Total</span>
		`);
	}

	function render_timeline(rows, room) {
		if (!rows.length) {
			$container.html(`<div class="rmh-empty-state">No maintenance history for this room. <a href="#" class="rmh-new-link">Create the first request</a>.</div>`);
			$container.find(".rmh-new-link").on("click", (e) => {
				e.preventDefault();
				frappe.new_doc("Maintenance Request", { room });
			});
			return;
		}

		const priority_colors = { Low: "#10b981", Medium: "#f59e0b", High: "#f97316", Critical: "#ef4444" };
		const status_colors   = { Open: "#ef4444", "In Progress": "#f59e0b", Resolved: "#10b981", Closed: "#6b7280" };

		const items = rows.map(r => {
			const pcolor = priority_colors[r.priority] || "#9ca3af";
			const scolor = status_colors[r.status] || "#9ca3af";
			const ooo_html = r.linked_ooo
				? `<div class="rmh-ooo-tag">OOO: ${frappe.datetime.str_to_user(r.ooo_from)} → ${frappe.datetime.str_to_user(r.ooo_to)}</div>`
				: "";
			const sched_html = r.maintenance_type === "Preventive" && r.scheduled_date
				? `<div class="rmh-meta">Scheduled: ${frappe.datetime.str_to_user(r.scheduled_date)}${r.recurrence && r.recurrence !== "None" ? ` · ${r.recurrence}` : ""}${r.next_due_date ? ` · Next: ${frappe.datetime.str_to_user(r.next_due_date)}` : ""}</div>`
				: "";

			return `
				<div class="rmh-item">
					<div class="rmh-item-dot" style="background:${scolor};"></div>
					<div class="rmh-item-body">
						<div class="rmh-item-header">
							<a href="/app/maintenance-request/${encodeURIComponent(r.name)}" class="rmh-item-name">${r.name}</a>
							<span class="rmh-badge" style="background:${scolor}20;color:${scolor};">${r.status}</span>
							<span class="rmh-badge" style="background:${pcolor}20;color:${pcolor};">${r.priority || ""}</span>
							${r.maintenance_type === "Preventive" ? `<span class="rmh-badge rmh-preventive">Preventive</span>` : ""}
							${r.category ? `<span class="rmh-category">${frappe.utils.escape_html(r.category)}</span>` : ""}
						</div>
						<div class="rmh-meta">${frappe.datetime.str_to_user(r.reported_date)}${r.assigned_to ? ` · Assigned to ${frappe.utils.escape_html(r.assigned_to)}` : ""}</div>
						${r.description ? `<div class="rmh-desc">${frappe.utils.escape_html(r.description)}</div>` : ""}
						${ooo_html}${sched_html}
					</div>
				</div>`;
		}).join("");

		$container.html(`<div class="rmh-timeline">${items}</div>`);
	}
};
