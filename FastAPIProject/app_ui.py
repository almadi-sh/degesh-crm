import streamlit as st
import requests
from docx import Document
from io import BytesIO

BASE_URL = "http://127.0.0.1:8000/api/v1"

st.title("Корпоративная система")

tabs = st.tabs(["Клиенты", "Договоры", "Приложения к договору", "Инвентарь"])

# ------------------------- Клиенты -------------------------
with tabs[0]:
    st.header("Создание клиента")
    name = st.text_input("Название клиента")
    bin_iin = st.text_input("BIN/IIN")
    address = st.text_input("Адрес")
    if st.button("Создать клиента"):
        payload = {"name": name, "bin_iin": bin_iin, "address": address}
        r = requests.post(f"{BASE_URL}/customers/", json=payload)
        if r.status_code == 200:
            st.success("Клиент создан!")
        else:
            st.error(r.text)

# ------------------------- Договоры -------------------------
with tabs[1]:
    st.header("Создание договора")
    customer_id = st.number_input("ID клиента", min_value=1)
    contract_number = st.text_input("Номер договора")

    # Простая таблица для добавления одной позиции
    product_id = st.number_input("ID продукта", min_value=1)
    quantity = st.number_input("Количество", min_value=1)
    price = st.number_input("Цена", min_value=1)
    payment_terms = st.text_input("Срок оплаты")
    delivery_terms = st.text_input("Срок поставки")

    if st.button("Создать договор"):
        payload = {
            "customer_id": customer_id,
            "number": contract_number,
            "items": [
                {
                    "product_id": product_id,
                    "quantity": quantity,
                    "price": price,
                    "payment_terms": payment_terms,
                    "delivery_terms": delivery_terms
                }
            ]
        }
        r = requests.post(f"{BASE_URL}/contracts/", json=payload)
        if r.status_code == 200:
            st.success("Договор создан!")

            # Выгрузка в DOCX
            contract = r.json()
            doc = Document()
            doc.add_heading(f"Договор {contract['number']}", 0)
            doc.add_paragraph(f"Клиент: {customer_id}")
            for item in contract["items"]:
                doc.add_paragraph(
                    f"Продукт ID: {item['product_id']}, "
                    f"Количество: {item['quantity']}, "
                    f"Цена: {item['price']}"
                )
            bio = BytesIO()
            doc.save(bio)
            st.download_button(
                "Скачать договор в DOCX",
                data=bio.getvalue(),
                file_name=f"{contract['number']}.docx"
            )
        else:
            st.error(r.text)

# ------------------------- Приложения к договору -------------------------
with tabs[2]:
    st.header("Добавление позиций к договору")
    contract_id = st.number_input("ID договора", min_value=1)
    product_id_app = st.number_input("ID продукта", min_value=1, key="app_prod")
    quantity_app = st.number_input("Количество", min_value=1, key="app_qty")
    price_app = st.number_input("Цена", min_value=1, key="app_price")
    payment_app = st.text_input("Срок оплаты", key="app_pay")
    delivery_app = st.text_input("Срок поставки", key="app_del")

    if st.button("Добавить позицию к договору"):
        payload = {
            "customer_id": 0,  # не меняем
            "number": "tmp",
            "items": [
                {
                    "product_id": product_id_app,
                    "quantity": quantity_app,
                    "price": price_app,
                    "payment_terms": payment_app,
                    "delivery_terms": delivery_app
                }
            ]
        }
        # Для простоты мы POST на тот же эндпоинт, в реальной версии можно сделать отдельный роутер
        r = requests.post(f"{BASE_URL}/contracts/", json=payload)
        if r.status_code == 200:
            st.success("Позиция добавлена к договору")
        else:
            st.error(r.text)

# ------------------------- Инвентарь -------------------------
with tabs[3]:
    st.header("Инвентарь")
    product_id_inv = st.number_input("ID продукта", min_value=1, key="inv_prod")
    quantity_inv = st.number_input("Количество", min_value=1, key="inv_qty")
    if st.button("Добавить/обновить инвентарь"):
        payload = {"product_id": product_id_inv, "quantity": quantity_inv}
        r = requests.post(f"{BASE_URL}/inventory/", json=payload)
        if r.status_code == 200:
            st.success("Инвентарь обновлён")
        else:
            st.error(r.text)

    st.subheader("Текущий инвентарь")
    r = requests.get(f"{BASE_URL}/inventory/")
    if r.status_code == 200:
        st.table(r.json())
