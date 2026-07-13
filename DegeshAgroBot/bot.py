import asyncio
import os

from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart
from aiogram.types import Message, ReplyKeyboardMarkup, KeyboardButton
from dotenv import load_dotenv


load_dotenv()

TOKEN = os.getenv("TELEGRAM_API")

if not TOKEN:
    raise ValueError("TELEGRAM_API не найден в .env")


bot = Bot(token=TOKEN)
dp = Dispatcher()


menu = ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text="➕ Добавить клиента")],
        [KeyboardButton(text="📄 Создать договор")],
        [KeyboardButton(text="📦 Проверить остатки")],
        [KeyboardButton(text="🚚 Создать отгрузку")],
    ],
    resize_keyboard=True
)


@dp.message(CommandStart())
async def start(message: Message):
    await message.answer(
        "Добро пожаловать в Degesh Agro Bot 🌾\nВыберите действие:",
        reply_markup=menu
    )


@dp.message(F.text == "➕ Добавить клиента")
async def add_client(message: Message):
    await message.answer("Введите имя клиента:")


@dp.message(F.text == "📄 Создать договор")
async def create_contract(message: Message):
    await message.answer("Функция создания договора скоро будет.")


@dp.message(F.text == "📦 Проверить остатки")
async def check_stock(message: Message):
    await message.answer("Введите название товара:")


@dp.message(F.text == "🚚 Создать отгрузку")
async def create_shipment(message: Message):
    await message.answer("Введите клиента, товар и количество:")


@dp.message()
async def fallback(message: Message):
    await message.answer("Выберите действие из меню 👇", reply_markup=menu)


async def main():
    try:
        await dp.start_polling(bot, drop_pending_updates=True)
    finally:
        await bot.session.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Бот остановлен вручную.")