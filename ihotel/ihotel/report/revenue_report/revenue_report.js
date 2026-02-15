frappe.query_reports["Revenue Report"] = {
	filters: [
		{
			fieldname: "from_date",
			label: __("From Date"),
			fieldtype: "Date",
			default: frappe.datetime.add_months(frappe.datetime.get_today(), -1),
		},
		{
			fieldname: "to_date",
			label: __("To Date"),
			fieldtype: "Date",
			default: frappe.datetime.get_today(),
		},
		{
			fieldname: "room_type",
			label: __("Room Type"),
			fieldtype: "Link",
			options: "Room Type",
		},
		{
			fieldname: "business_source",
			label: __("Business Source"),
			fieldtype: "Link",
			options: "Business Source Category",
		},
	],
};
