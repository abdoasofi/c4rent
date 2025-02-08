# Copyright (c) 2023, Connect 4 Systems and contributors
# For license information, please see license.txt

# import frappe
import frappe
from frappe.model.document import Document
import datetime
import json

class Rent(Document):
	@frappe.whitelist()
	def before_validate(doc):
		tot_qty = 0
		tot_amt = 0
		for d in doc.time_logs:
			d.amount = d.qty * d.rate
			tot_qty += d.qty
			tot_amt += d.amount
		doc.total_qty = tot_qty
		doc.price_per_day_or_month = tot_amt

		

	
	@frappe.whitelist()
	def validate(doc):
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
	def on_submit(doc):
		new_doc = frappe.get_doc({
				'doctype': 'Stock Entry',
				'transaction_date' : doc.date,
				'stock_entry_type':'Material Transfer',
				'customer': doc.customer,
				'rent' :doc.name,
				'from_warehouse': doc.source_warehouse,
				'to_warehouse': doc.target_warehouse,

			})
		for d in doc.time_logs:
			new = new_doc.append("items", {})
			new.item_code = d.item_code
			new.item_name = d.item_name
			new.qty= d.qty
			new.customer = doc.customer
		new_doc.insert(ignore_permissions=True)
		new_doc.submit()
		frappe.db.sql(f"""
			update tabRent set stock_entry ='{new_doc.name}' where name ='{doc.name}'
		""")
		if doc.rent_type == "Monthly":
			new_doc = frappe.get_doc({
					'doctype': 'Sales Invoice',
					'transaction_date' : doc.date,
					'customer': doc.customer,
					'rent' :doc.name,
					"reference_name": doc.name,
					"reference_doctype": "Rent",
					"selling_price_list": "Monthly",
					'from_warehouse': doc.source_warehouse,
					'to_warehouse': doc.target_warehouse,

				})
			for d in doc.time_logs:
				new = new_doc.append("items", {})
				new.item_code = d.item_code
				new.item_name = d.item_name
				new.qty= d.qty
				new.rate = d.rate
			new_doc.insert(ignore_permissions=True)
			new_doc.submit()
			frappe.db.sql(f"""
			update tabRent join `tabSales Invoice` on tabRent.name = `tabSales Invoice`.rent set tabRent.sales_invoice = '{new_doc.name}' where `tabSales Invoice`.rent = '{doc.name}' and selling_price_list='Monthly'
			""")



	@frappe.whitelist()
	def stop_auto_repeat(doc, method=None):
		auto_repeat_list = frappe.get_list(
											"Auto Repeat",
											filters={"reference_document": doc.sales_invoice}
											)
		for auto_repeat in auto_repeat_list:
			auto_repeat_doc = frappe.get_doc("Auto Repeat", auto_repeat.name)
			auto_repeat_doc.disabled = 1
			auto_repeat_doc.save()
		frappe.db.sql(f"""update `tabRent` set status = "Returned"  where name = '{doc.name}'""")
		new_doc = frappe.get_doc({
				'doctype': 'Stock Entry',
				'transaction_date' : doc.date,
				'stock_entry_type':'Material Transfer',
				'customer': doc.customer,
				'rent' :doc.name,
				'from_warehouse': doc.target_warehouse,
				'to_warehouse':  doc.source_warehouse,

			})
		for d in doc.time_logs:
			new = new_doc.append("items", {})
			new.item_code = d.item_code
			new.item_name = d.item_name
			new.qty= d.qty
			new.customer = doc.customer
		new_doc.insert(ignore_permissions=True)
		new_doc.submit()
		doc.reload()

		# for d in doc.time_logs:
		# 	frappe.db.sql(f"""update `tabRent Detail` set returen_date = '{today()}'  where name = '{d.name}'""")
		# 	frappe.db.sql(f"""update `tabRent Detail` set `tabRent Detail`.return_qty = {d.qty} where name = '{d.name}""")
		# 	frappe.db.sql(f"""update `tabRent Detail` set `tabRent Detail`.return = 1 where name = '{d.name}""")
            
		



	def on_cancel(doc, method=None):
		doc.ignore_linked_doctypes = ["Stock Entry"]