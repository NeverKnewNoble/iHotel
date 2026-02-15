frappe.query_reports["Guest History"] = {
	filters: [
		{
			fieldname: "guest",
			label: __("Guest"),
			fieldtype: "Link",
			options: "Guest",
		},
	],
};
