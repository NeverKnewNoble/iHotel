frappe.query_reports["Arrivals And Departures"] = {
	filters: [
		{
			fieldname: "date",
			label: __("Date"),
			fieldtype: "Date",
			default: frappe.datetime.get_today(),
		},
	],
};
