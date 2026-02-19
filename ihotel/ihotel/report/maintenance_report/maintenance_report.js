frappe.query_reports["Maintenance Report"] = {
	filters: [
		{
			fieldname: "status",
			label: __("Status"),
			fieldtype: "Select",
			options: "\nOpen\nIn Progress\nResolved\nClosed",
		},
		{
			fieldname: "priority",
			label: __("Priority"),
			fieldtype: "Select",
			options: "\nLow\nMedium\nHigh\nCritical",
		},
		{
			fieldname: "maintenance_type",
			label: __("Type"),
			fieldtype: "Select",
			options: "\nReactive\nPreventive",
		},
		{
			fieldname: "category",
			label: __("Category"),
			fieldtype: "Link",
			options: "Maintenance Category",
		},
		{
			fieldname: "room",
			label: __("Room"),
			fieldtype: "Link",
			options: "Room",
		},
	],
};
