import frappe
from frappe.utils import nowdate, getdate, flt


@frappe.whitelist()
def get_dashboard_data(from_date=None, to_date=None):
    """Aggregate all dashboard metrics in a single call."""
    today = nowdate()

    # Hotel settings
    settings = frappe.get_single("iHotel Settings")
    hotel_name = settings.hotel_name or "iHotel"
    total_rooms = settings.total_rooms or 0

    # Room status breakdown
    room_counts = frappe.db.sql(
        "SELECT status, COUNT(name) as count FROM `tabRoom` GROUP BY status",
        as_dict=True,
    )
    room_status = {"Available": 0, "Occupied": 0, "Housekeeping": 0, "Out of Order": 0}
    for r in room_counts:
        if r.status in room_status:
            room_status[r.status] = r.count

    available_rooms = room_status["Available"]
    occupied_rooms = room_status["Occupied"]
    occupancy_rate = round((occupied_rooms / total_rooms) * 100, 1) if total_rooms else 0

    # Revenue query with optional date filtering
    revenue_conditions = "status = 'Checked' AND docstatus = 1"
    revenue_values = {}
    if from_date:
        revenue_conditions += " AND expected_check_in >= %(from_date)s"
        revenue_values["from_date"] = from_date
    if to_date:
        revenue_conditions += " AND expected_check_in <= %(to_date)s"
        revenue_values["to_date"] = to_date

    revenue_result = frappe.db.sql(
        f"""
        SELECT IFNULL(SUM(total_amount), 0) as revenue
        FROM `tabHotel Stay`
        WHERE {revenue_conditions}
        """,
        revenue_values,
        as_dict=True,
    )
    todays_revenue = flt(revenue_result[0].revenue) if revenue_result else 0

    # Today's check-ins (expected)
    todays_checkins = frappe.db.count(
        "Hotel Stay",
        filters={
            "expected_check_in": ["between", [f"{today} 00:00:00", f"{today} 23:59:59"]],
            "docstatus": ["!=", 2],
        },
    )

    # Today's check-outs (expected)
    todays_checkouts = frappe.db.count(
        "Hotel Stay",
        filters={
            "expected_check_out": ["between", [f"{today} 00:00:00", f"{today} 23:59:59"]],
            "docstatus": ["!=", 2],
        },
    )

    # Active stays (Reserved + Checked)
    active_stays = frappe.get_all(
        "Hotel Stay",
        filters={"status": ["in", ["Reserved", "Checked"]], "docstatus": 1},
        fields=["name", "guest", "room", "status", "expected_check_in", "expected_check_out", "room_rate"],
        order_by="expected_check_in asc",
        limit_page_length=10,
    )

    # Housekeeping summary
    hk_counts = frappe.db.sql(
        "SELECT status, COUNT(name) as count FROM `tabHousekeeping Task` GROUP BY status",
        as_dict=True,
    )
    housekeeping = {"Pending": 0, "In Progress": 0, "Completed": 0}
    for h in hk_counts:
        if h.status in housekeeping:
            housekeeping[h.status] = h.count

    # Maintenance summary
    mt_counts = frappe.db.sql(
        "SELECT status, COUNT(name) as count FROM `tabMaintenance Request` GROUP BY status",
        as_dict=True,
    )
    maintenance = {"Open": 0, "In Progress": 0, "Resolved": 0, "Closed": 0}
    for m in mt_counts:
        if m.status in maintenance:
            maintenance[m.status] = m.count

    critical_maintenance = frappe.db.count(
        "Maintenance Request",
        filters={"priority": "Critical", "status": ["not in", ["Resolved", "Closed"]]},
    )

    # Recent night audits
    recent_audits = frappe.get_all(
        "Night Audit",
        fields=["name", "audit_date", "occupancy_rate", "total_revenue", "occupied_rooms", "total_rooms"],
        order_by="audit_date desc",
        limit_page_length=5,
    )

    return {
        "hotel_name": hotel_name,
        "total_rooms": total_rooms,
        "room_status": room_status,
        "occupancy_rate": occupancy_rate,
        "occupied_rooms": occupied_rooms,
        "available_rooms": available_rooms,
        "todays_revenue": todays_revenue,
        "todays_checkins": todays_checkins,
        "todays_checkouts": todays_checkouts,
        "active_stays": active_stays,
        "housekeeping": housekeeping,
        "maintenance": maintenance,
        "critical_maintenance": critical_maintenance,
        "recent_audits": recent_audits,
    }
