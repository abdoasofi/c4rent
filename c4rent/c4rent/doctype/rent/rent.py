# Copyright (c) 2023, Connect 4 Systems and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
import datetime
import json
from frappe import _

class Rent(Document):

    @frappe.whitelist()
    def before_validate(self):
        tot_qty = 0
        tot_amt = 0
        for d in self.time_logs:
            d.amount = d.qty * d.rate
            tot_qty += d.qty
            tot_amt += d.amount
        self.total_qty = tot_qty
        self.price_per_day_or_month = tot_amt

    @frappe.whitelist()
    def validate(self):
        pass
    	# if doc.rent_type == "Daily" and doc.is_new():
		# 	for x in doc.time_logs:
		# 		x.rate = frappe.db.get_value('Item Price', {"item_code": x.item_code, "selling" : 1,"price_list": "Daily"}, 'price_list_rate') or 0
		# 		x.income_account = frappe.db.get_single_value('Company', 'default_income_account')
		# elif doc.rent_type == "Monthly" and doc.is_new():
		# 	for x in doc.time_logs:
		# 		x.rate = frappe.db.get_value('Item Price', {"item_code": x.item_code, "selling" : 1,"price_list": "Monthly"}, 'price_list_rate') or 0
		# 		x.income_account = frappe.db.get_single_value('Company', 'default_income_account')

    @frappe.whitelist()
    def on_submit(self):
        new_doc = frappe.get_doc({
            'doctype': 'Stock Entry',
            'transaction_date': self.date,
            'stock_entry_type': 'Material Transfer',
            'customer': self.customer,
            'rent': self.name,
            'from_warehouse': self.source_warehouse,
            'to_warehouse': self.target_warehouse,
        })
        for d in self.time_logs:
            new = new_doc.append("items", {})
            new.item_code = d.item_code
            new.item_name = d.item_name
            new.qty = d.qty
            new.customer = self.customer
        new_doc.insert(ignore_permissions=True)
        new_doc.submit()
        frappe.db.sql(f"""
            UPDATE tabRent SET stock_entry = '{new_doc.name}' WHERE name = '{self.name}'
        """)

        if self.rent_type == "Monthly":
            new_invoice = frappe.get_doc({
                'doctype': 'Sales Invoice',
                'transaction_date': self.date,
                'customer': self.customer,
                'rent': self.name,
                "reference_name": self.name,
                "reference_doctype": "Rent",
                "selling_price_list": "Monthly",
                'from_warehouse': self.source_warehouse,
                'to_warehouse': self.target_warehouse,
            })
            for d in self.time_logs:
                new = new_invoice.append("items", {})
                new.item_code = d.item_code
                new.item_name = d.item_name
                new.qty = d.qty
                new.rate = d.rate
            new_invoice.insert(ignore_permissions=True)
            new_invoice.submit()
            frappe.db.sql(f"""
            UPDATE tabRent JOIN tabSales Invoice 
            ON tabRent.name = tabSales Invoice.rent 
            SET tabRent.sales_invoice = '{new_invoice.name}' 
            WHERE tabSales Invoice.rent = '{self.name}' AND selling_price_list='Monthly'
            """)

    @frappe.whitelist()
    def stop_auto_repeat(self):
        auto_repeat_list = frappe.get_list(
            "Auto Repeat",
            filters={"reference_document": self.sales_invoice}
        )
        for auto_repeat in auto_repeat_list:
            auto_repeat_doc = frappe.get_doc("Auto Repeat", auto_repeat.name)
            auto_repeat_doc.disabled = 1
            auto_repeat_doc.save()
        frappe.db.sql(f"""UPDATE tabRent SET status = "Returned" WHERE name = '{self.name}'""")
        new_doc = frappe.get_doc({
            'doctype': 'Stock Entry',
            'transaction_date': self.date,
            'stock_entry_type': 'Material Transfer',
            'customer': self.customer,
            'rent': self.name,
            'from_warehouse': self.target_warehouse,
            'to_warehouse': self.source_warehouse,
        })
        for d in self.time_logs:
            new = new_doc.append("items", {})
            new.item_code = d.item_code
            new.item_name = d.item_name
            new.qty = d.qty
            new.customer = self.customer
        new_doc.insert(ignore_permissions=True)
        new_doc.submit()
        self.reload()

    def on_cancel(self):
        self.ignore_linked_doctypes = ["Stock Entry"]
        
    @frappe.whitelist()
    def get_item_group(self):
        item_group = frappe.get_list("Item Group",
            fields=["name", "image"],
            filters={
                'in_slider': 1
            },
        )
        for ig in item_group:
            if ig.image:
                # Assuming ig.image contains the file path
                ig.image = f"{frappe.utils.get_url()}/{ig.image}"  # Constructing the full image link
        return item_group
    
    @frappe.whitelist()
    def get_item_group_details(self, item_group):
        if not item_group:
            return {}
        
        try:
            item_group_doc = frappe.get_doc("Item Group", item_group)
            return {
                "name": item_group_doc.name,
                "file_image": frappe.utils.get_file_link(item_group_doc.image),
            }
        except Exception as e:
            frappe.log_error(_("Item Group '{0}' not found. Error: {1}").format(item_group, str(e)), "get_package_details")
            return {}

    @frappe.whitelist()
    def get_items(self, item_group):
        if not item_group:
            return []

        try:
            items = frappe.get_all('Item', fields=['name', 'item_name','image'], filters={'item_group': item_group})
            for i in items:
                if i.image:
                    # Assuming i.image contains the file path
                    i.image = f"{frappe.utils.get_url()}/{i.image}"  # Constructing the full image link
                return items
        except Exception as e:
            frappe.log_error(_("Error fetching items for Item Group '{0}'. Error: {1}").format(item_group, str(e)), "get_items")
            return []