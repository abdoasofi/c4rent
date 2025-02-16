import frappe
from frappe import _
from collections import defaultdict

RENT_STATUS_RETURNED = "Returned"
RENT_STATUS_PARTIAL_RETURNED = "Partial Returned"

def on_submit(doc, method):
    """
    يتم استدعاؤها عند اعتماد فاتورة مبيعات.

    تقوم بالتحقق من وجود حقل Rent المخصص في الفاتورة،
    ثم تستدعي الدالة update_rent_status لتحديث حالة Rent.

    Args:
        doc (frappe.Document): فاتورة المبيعات.
        method (str): اسم الطريقة التي تم استدعاء الدالة بواسطتها.
    """
    if doc.get("rent"):
        try:
            rent_doc = frappe.get_doc("Rent", doc.rent)
            update_rent_status(rent_doc, doc)
            create_stock_entry(doc)
        except frappe.DoesNotExistError:
            frappe.msgprint(_("Rent document {} does not exist.").format(doc.rent), raise_exception=True)
    else:
        # يمكنك اختيارياً طباعة رسالة هنا إذا كان عدم وجود Rent أمرًا غير متوقع
        # frappe.msgprint(_("Rent is not linked to this Sales Invoice."))
        pass

def update_rent_status(rent_doc, sales_invoice_doc):
    """
    تقوم بالتحقق من الأصناف والكميات في فاتورة المبيعات
    ومقارنتها بالـ time_logs في الـ Rent والفواتير السابقة.
    بناءً على النتيجة، يتم تحديث حقل الـ Status إلى "Returned" أو "Partial Returned".

    Args:
        rent_doc (frappe.Document): مستند Rent.
        sales_invoice_doc (frappe.Document): فاتورة المبيعات الحالية.
    """
    from collections import defaultdict

    expected_items = defaultdict(float)  # الكميات المتوقعة من الـ Rent
    actual_items = defaultdict(float)    # الكميات الفعلية من الفواتير

    # تجميع الأصناف والكميات المتوقعة من الـ Time Logs
    for log in rent_doc.time_logs:
        expected_items[log.item_code] += log.qty

    # استرجاع الفواتير السابقة واستخراج الكميات المرتجعة منها
    previous_invoices = frappe.get_all(
        "Sales Invoice Item",
        fields=["item_code", "rent_qty"],
        filters={
            "parenttype": "Sales Invoice",
            "parent": ["in", frappe.get_all(
                "Sales Invoice",
                filters={"rent": rent_doc.name, "docstatus": 1, "name": ["!=", sales_invoice_doc.name]},
                pluck="name"
            )]
        }
    )

    # تجميع الكميات المرتجعة من الفواتير السابقة
    for item in previous_invoices:
        actual_items[item.item_code] += item.rent_qty

    # تجميع الكميات المرتجعة من الفاتورة الحالية
    for item in sales_invoice_doc.items:
        actual_items[item.item_code] += item.rent_qty

    is_returned = True
    is_partial_returned = False

    # التحقق من إرجاع جميع الأصناف بالكميات المتوقعة
    for item_code, expected_qty in expected_items.items():
        if actual_items.get(item_code, 0) < expected_qty:
            is_returned = False
            break

    # التحقق من وجود إرجاع جزئي إذا لم يكن الإرجاع كاملاً
    if not is_returned:
        for item_code, actual_qty in actual_items.items():
            if item_code in expected_items and actual_qty > 0:
                is_partial_returned = True
                break

    # تحديث حالة الـ Rent بناءً على النتائج
    if is_returned:
        rent_doc.status = RENT_STATUS_RETURNED
    elif is_partial_returned:
        rent_doc.status = RENT_STATUS_PARTIAL_RETURNED

    rent_doc.save()
def create_stock_entry(doc):
    """
    يتم استدعاؤها عند اعتماد المستند.
    تقوم بإنشاء Stock Entry.
    """
    # إنشاء Stock Entry
    new_doc = frappe.get_doc({
        'doctype': 'Stock Entry',
        'transaction_date': doc.posting_date,
        'stock_entry_type': 'Material Transfer',
        'customer': doc.customer,
        'rent': doc.rent,
        'from_warehouse': doc.from_warehouse,
        'to_warehouse': doc.to_warehouse,
        'sales_invoice': doc.name,
    })
    for d in doc.items:
        new = new_doc.append("items", {})
        new.item_code = d.item_code
        new.item_name = d.item_name
        new.qty = d.rent_qty
        new.customer = doc.customer
        new.cost_center = doc.cost_center
    new_doc.insert(ignore_permissions=True)
    new_doc.submit()
