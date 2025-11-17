# Copyright (c) 2025, Noble and contributors
# For license information, please see license.txt

# import frappe

# def execute(filters=None):
# 	columns, data = [], []
# 	return columns, data


import frappe
from frappe import _

def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    return columns, data

def get_columns():
    return [
        {
            "fieldname": "date",
            "label": _("Date"),
            "fieldtype": "Date",
            "width": 100
        },
        {
            "fieldname": "total_rooms",
            "label": _("Total Rooms"),
            "fieldtype": "Int",
            "width": 100
        },
        {
            "fieldname": "occupied_rooms",
            "label": _("Occupied Rooms"),
            "fieldtype": "Int",
            "width": 100
        },
        {
            "fieldname": "occupancy_rate",
            "label": _("Occupancy Rate %"),
            "fieldtype": "Percent",
            "width": 100
        },
        {
            "fieldname": "revenue",
            "label": _("Revenue"),
            "fieldtype": "Currency",
            "width": 120
        }
    ]

def get_data(filters):
    """
    Get occupancy report data with proper SQL injection protection.

    Args:
        filters: Dictionary containing date filters (from_date, to_date)

    Returns:
        List of dictionaries containing occupancy data
    """
    params = []
    date_filters = []

    # Build date filter conditions with parameters
    if filters.get("from_date"):
        date_filters.append("DATE(hs.expected_check_in) >= %s")
        params.append(filters.get("from_date"))

    if filters.get("to_date"):
        date_filters.append("DATE(hs.expected_check_in) <= %s")
        params.append(filters.get("to_date"))

    # Build date filter string for JOIN condition
    date_filter = ""
    if date_filters:
        date_filter = " AND " + " AND ".join(date_filters)

    # Build query with proper parameterization
    query = """
        SELECT
            DATE(hs.expected_check_in) as date,
            COUNT(DISTINCT r.name) as total_rooms,
            COUNT(DISTINCT hs.room) as occupied_rooms,
            ROUND((COUNT(DISTINCT hs.room) * 100.0 / NULLIF(COUNT(DISTINCT r.name), 0)), 2) as occupancy_rate,
            SUM(hs.total_amount) as revenue
        FROM
            `tabRoom` r
        LEFT JOIN
            `tabHotel Stay` hs ON hs.room = r.name
            AND hs.status IN ('Checked', 'Reserved')
            AND hs.docstatus = 1
            {date_filter}
        GROUP BY
            DATE(hs.expected_check_in)
        ORDER BY
            date
    """.format(date_filter=date_filter)

    data = frappe.db.sql(query, tuple(params), as_dict=1)

    return data
