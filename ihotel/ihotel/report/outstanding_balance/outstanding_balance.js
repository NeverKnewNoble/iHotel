frappe.query_reports["Outstanding Balance"] = {
	filters: [
		{
			fieldname: "guest",
			label: __("Guest"),
			fieldtype: "Link",
			options: "Guest",
		},
		{
			fieldname: "min_amount",
			label: __("Minimum Amount"),
			fieldtype: "Currency",
		},
	],
};
